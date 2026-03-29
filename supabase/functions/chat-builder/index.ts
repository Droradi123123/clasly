import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getGeminiApiKey, requireGeminiApiKey } from "../_shared/gemini-key.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// =============================================================================
// AUTH HELPER
// =============================================================================

async function verifyAuth(req: Request): Promise<{ user: any; error: string | null }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return { user: null, error: "Missing authorization header" };

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { user: null, error: "Missing token" };

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) return { user: null, error: "Server configuration error" };

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) {
    return { user: null, error: error?.message || "Invalid or expired authentication token" };
  }
  return { user, error: null };
}

// =============================================================================
// TYPES
// =============================================================================

interface SlideContent {
  title?: string;
  subtitle?: string;
  text?: string;
  question?: string;
  statement?: string;
  imageUrl?: string;
  imagePosition?: "left" | "right";
  bulletPoints?: string[];
  items?: string[];
  options?: any[];
  points?: any[];
  events?: any[];
  bars?: any[];
  correctAnswer?: number;
  correctIsYes?: boolean;
  correctNumber?: number;
  minRange?: number;
  maxRange?: number;
  scaleOptions?: { minLabel: string; maxLabel: string; steps: number };
  leftLabel?: string;
  rightLabel?: string;
}

interface SlideDesign {
  overlayImageUrl?: string;
  overlayImagePosition?: string;
  themeId?: string;
  designStyleId?: string;
  backgroundColor?: string;
  gradientPreset?: string;
  textColor?: string;
  fontFamily?: string;
  fontSize?: string;
  textAlign?: "left" | "center" | "right";
  direction?: "ltr" | "rtl";
}

interface Slide {
  id: string;
  type: string;
  order: number;
  content: SlideContent;
  design: SlideDesign;
  activitySettings?: any;
  layout?: string;
}

/** Planner output from the model (validated server-side against commands). */
interface PlannerTask {
  targetSlideNumbers?: number[];
  intent?: string;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function detectLanguage(text: string): "he" | "en" {
  const hebrewChars = (text.match(/[\u0590-\u05FF]/g) || []).length;
  const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
  return hebrewChars > latinChars * 0.3 ? "he" : "en";
}

/** Infer direction from slide content (Hebrew → rtl). Matches frontend designDefaults logic. */
function isSlideContentHebrew(slide: Slide): boolean {
  const c = slide.content as Record<string, unknown> | undefined;
  if (!c) return false;
  const texts: string[] = [];
  if (typeof c.title === "string") texts.push(c.title);
  if (typeof c.subtitle === "string") texts.push(c.subtitle);
  if (typeof c.text === "string") texts.push(c.text);
  if (typeof c.question === "string") texts.push(c.question);
  if (Array.isArray(c.options)) c.options.forEach((o: unknown) => texts.push(String(o)));
  if (Array.isArray(c.items)) c.items.forEach((i: unknown) => texts.push(String(i)));
  if (Array.isArray(c.bulletPoints)) c.bulletPoints.forEach((p: unknown) => texts.push(String(p)));
  const pts = c.points as { title?: string; description?: string }[] | undefined;
  if (Array.isArray(pts)) pts.forEach((p) => { if (p?.title) texts.push(p.title); if (p?.description) texts.push(p.description); });
  const combined = texts.join(" ");
  const hebrew = (combined.match(/[\u0590-\u05FF]/g) || []).length;
  const latin = (combined.match(/[a-zA-Z]/g) || []).length;
  return hebrew > latin;
}

function ensureDesignDefaults(slide: Slide): Slide {
  const design = slide.design || {};
  const direction = (design.direction as "ltr" | "rtl") ?? (isSlideContentHebrew(slide) ? "rtl" : "ltr");
  const textAlign = (design.textAlign as "left" | "center" | "right") ?? (direction === "rtl" ? "right" : "center");
  if (design.textAlign === textAlign && design.direction === direction) return slide;
  return { ...slide, design: { ...design, textAlign, direction } };
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** Detect when user asks to change something IN the image (not just add a new image). */
function shouldIncludeImageForVision(message: string): boolean {
  const m = message.toLowerCase();
  const hebrew = message;
  const patterns = [
    /change\s+(the|this|that)\s+(man|person|woman|guy|image|photo|picture)/i,
    /שנה\s+(את\s+)?(האיש|האישה|הבחור|התמונה|הדמות)/,
    /תחליף\s+(את\s+)?(האיש|האישה|התמונה)/,
    /החלף\s+(את\s+)?(האיש|האישה|התמונה)/,
    /in\s+the\s+(image|picture|photo)/i,
    /בתמונה|בתמונה\s+הזו|בתמונה\s+הנוכחית/,
    /(old|young)\s+(man|woman|person)/i,
    /איש\s+זקן|אישה\s+זקנה|איש\s+צעיר|אישה\s+צעירה/,
  ];
  return patterns.some((p) => p.test(m) || p.test(hebrew));
}

/** Get base64 + mime from slide image if it's a data URL. */
function getSlideImageBase64(slide: Slide): { data: string; mimeType: string } | null {
  const imgUrl = slide.content?.imageUrl || slide.design?.overlayImageUrl;
  if (!imgUrl || typeof imgUrl !== "string" || !imgUrl.startsWith("data:")) return null;
  const match = imgUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1] || "image/png", data: match[2] };
}

/** Slides with images to include for Vision when message suggests image-internal edits. */
function getSlidesWithImagesForVision(
  slides: Slide[],
  message: string
): { slideIndex: number; base64: string; mimeType: string }[] {
  if (!shouldIncludeImageForVision(message)) return [];

  const explicitSlides = extractExplicitSlideNumbers(message);
  const result: { slideIndex: number; base64: string; mimeType: string }[] = [];

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const img = getSlideImageBase64(slide);
    if (!img) continue;
    if (explicitSlides.length > 0 && !explicitSlides.includes(i + 1)) continue;
    result.push({ slideIndex: i, base64: img.data, mimeType: img.mimeType });
    if (result.length >= 2) break; // Limit to 2 images to control token usage
  }

  return result;
}

function stripBase64ForContext(slides: Slide[]): any[] {
  return slides.map((s, i) => {
    const c = s.content;
    const title = c.title || c.question || c.statement || "";
    const hasImg = !!(c.imageUrl || s.design?.overlayImageUrl);

    // Build a concise but complete representation
    const summary: any = {
      index: i,
      slideNumber: i + 1, // Human-readable: "slide 5" = slideNumber 5, slideIndex 4
      type: s.type,
      hasImage: hasImg,
    };

    // Include all relevant content fields based on type
    switch (s.type) {
      case "title":
        summary.title = c.title || "";
        summary.subtitle = c.subtitle || "";
        summary.imageDescription = (c as any).imagePrompt || "";
        break;
      case "split_content":
        summary.title = c.title || "";
        summary.bulletPoints = c.bulletPoints || (c.text ? c.text.split("\n") : []);
        summary.text = (c.text || "").slice(0, 400);
        summary.hasImage = !!c.imageUrl || !!s.design?.overlayImageUrl;
        summary.imageDescription = (c as any).imagePrompt || "";
        break;
      case "content":
        summary.title = c.title || "";
        summary.text = (c.text || "").slice(0, 200);
        break;
      case "timeline":
        summary.title = c.title || "";
        summary.events = (c.events || []).map((e: any) => ({
          year: e.year,
          title: e.title,
          description: (e.description || "").slice(0, 60),
        }));
        break;
      case "bullet_points":
        summary.title = c.title || "";
        summary.points = c.points || [];
        break;
      case "bar_chart":
        summary.title = c.title || "";
        summary.bars = c.bars || [];
        break;
      case "quiz":
        summary.question = c.question || "";
        summary.options = c.options || [];
        summary.correctAnswer = c.correctAnswer;
        break;
      case "poll":
        summary.question = c.question || "";
        summary.options = c.options || [];
        break;
      case "wordcloud":
        summary.question = c.question || "";
        break;
      case "scale":
        summary.question = c.question || "";
        summary.scaleOptions = c.scaleOptions;
        break;
      case "yesno":
        summary.question = c.question || "";
        summary.correctIsYes = c.correctIsYes;
        break;
      case "ranking":
        summary.question = c.question || "";
        summary.items = c.items || [];
        break;
      case "guess_number":
        summary.question = c.question || "";
        summary.correctNumber = c.correctNumber;
        summary.minRange = c.minRange;
        summary.maxRange = c.maxRange;
        break;
      case "sentiment_meter":
        summary.question = c.question || "";
        summary.leftLabel = c.leftLabel;
        summary.rightLabel = c.rightLabel;
        break;
      default:
        summary.title = title;
        if (c.text) summary.text = c.text.slice(0, 200);
    }

    // Include design info and image context for edits
    summary.gradient = s.design?.gradientPreset || "unknown";
    if (hasImg && (c as any).imagePrompt) summary.imageDescription = (c as any).imagePrompt;

    return summary;
  });
}

// =============================================================================
// IMAGE GENERATION
// =============================================================================

async function generateImage(prompt: string): Promise<string | null> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    console.error("GEMINI_API_KEY not configured for image generation");
    return null;
  }

  const enhancedPrompt = `CRITICAL: Generate an image with absolutely NO TEXT, NO WORDS, NO LETTERS, NO NUMBERS anywhere.

Create: ${prompt}

Style: Modern, clean, vibrant, professional presentation visual.
Quality: Ultra high quality, 4K, cinematic lighting, sharp details.
STRICT: No text, no typography, no labels, no watermarks.`;

  try {
    console.log(`🖼️ Generating image: "${prompt.slice(0, 60)}..."`);
    const model = "gemini-2.5-flash-image";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: enhancedPrompt }] }],
      }),
    });

    if (!res.ok) {
      console.error(`Image generation HTTP error: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const partWithImage = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData) || null;
    const inlineData = partWithImage?.inlineData;
    if (inlineData?.data) {
      const mimeType = inlineData.mimeType || "image/png";
      const url = `data:${mimeType};base64,${inlineData.data}`;
      console.log("✅ Image generated successfully");
      return url;
    }
    console.log("⚠️ No image data in Gemini response");
    return null;
  } catch (e) {
    console.error("Image generation exception:", e);
    return null;
  }
}

// =============================================================================
// AI SYSTEM PROMPT - Clear, aligned with tool schema
// =============================================================================

function buildSystemPrompt(
  slides: Slide[],
  currentSlideIndex: number,
  language: "he" | "en",
  userAiContext?: string,
  originalPrompt?: string,
  hasVisionImages?: boolean,
  lectureMode: "education" | "webinar" = "education",
): string {
  const isHe = language === "he";
  const slidesData = stripBase64ForContext(slides);
  const modeLine =
    lectureMode === "webinar"
      ? "\n## PRODUCT CONTEXT (FIXED)\nThis presentation is for a **live webinar**. Keep edits aligned with that (persuasive, audience-focused). Do not ask the user to choose between webinar and education.\n"
      : "\n## PRODUCT CONTEXT (FIXED)\nThis presentation is for **teaching / training**. Keep edits aligned with instructional clarity. Do not ask the user to choose between webinar and education.\n";

  return `You are a presentation editing assistant. You receive user requests and return structured commands to modify their presentation.
${modeLine}
${userAiContext ? `\n## INSTRUCTOR CONTEXT (use to personalize edits)\n${userAiContext}\n` : ""}
${originalPrompt ? `\n## PRESENTATION CONTEXT\nThis presentation was created from: "${originalPrompt}"\nUse this to understand topic, tone, and theme when making edits. When the user refers to "the presentation about X" or similar, this is the topic.\n` : ""}

## CURRENT PRESENTATION STATE
Total slides: ${slides.length}
Currently viewing: slide ${currentSlideIndex + 1}
Language: ${isHe ? "Hebrew" : "English"}

### All Slides:
${JSON.stringify(slidesData, null, 1)}

## AVAILABLE COMMANDS

### 1. update_slide - Modify an existing slide
Fields you can set (use ONLY fields relevant to the change):
- "title": string - change the slide title
- "subtitle": string - change subtitle (title slides)
- "text": string - change body text (content slides)
- "question": string - change question text (quiz/poll/scale/yesno/wordcloud/ranking/guess_number/sentiment_meter)
- "options": string[] - change options (quiz/poll) 
- "correctAnswer": number - change correct answer index (quiz, 0-based)
- "correctIsYes": boolean - change correct answer (yesno)
- "bulletPoints": string[] - change bullet points (split_content)
- "events": array of {year, title, description} - change timeline events
- "bars": array of {label, value} - change chart data
- "points": array of {title, description} - change bullet_points items
- "items": string[] - change ranking items
- "correctNumber": number - change correct number (guess_number)
- "minRange": number, "maxRange": number - change range (guess_number)
- "scaleOptions": {minLabel, maxLabel, steps} - change scale options
- "leftLabel": string, "rightLabel": string - change sentiment_meter labels
- "imagePrompt": string - generate a NEW image (describe what to create, NO TEXT in image)
- "gradientPreset": string - change background gradient
- "fontFamily": string - change font

Example: Change title on slide 2:
{"action":"update_slide","slideIndex":1,"title":"New Title Here"}

Example: Change question and options on quiz slide 3:
{"action":"update_slide","slideIndex":2,"question":"What is 2+2?","options":["3","4","5","6"],"correctAnswer":1}

Example: Add image to slide 1:
{"action":"update_slide","slideIndex":0,"imagePrompt":"beautiful sunset over mountains, warm colors, cinematic"}

Example: Change bullet points on slide 2:
{"action":"update_slide","slideIndex":1,"bulletPoints":["First point","Second point","Third point"]}

Example: Change timeline events on slide 4:
{"action":"update_slide","slideIndex":3,"events":[{"year":"2020","title":"Start","description":"The beginning"},{"year":"2021","title":"Growth","description":"Rapid expansion"},{"year":"2022","title":"Peak","description":"Reached the top"},{"year":"2023","title":"Now","description":"Current state"}]}

### 2. insert_slide - Add a new slide
Required: "slideType" and "content" object with appropriate fields for that type.
DEFAULT: when adding new slides without explicit position, use slideIndex: slides.length (append at end). Only use a specific slideIndex when user explicitly says "after slide X".
Supported types: title, split_content, content, bullet_points, timeline, bar_chart, quiz, poll, wordcloud, scale, yesno, ranking, guess_number, sentiment_meter
When adding multiple slides (e.g. 4 quiz slides), add them at the end: slideIndex = slides.length for first, slides.length+1 for second, etc.

Example: Add a poll after slide 3:
{"action":"insert_slide","slideIndex":3,"slideType":"poll","content":{"question":"Do you agree?","options":["Strongly agree","Agree","Disagree","Strongly disagree"]}}

Example: Add a quiz after slide 5:
{"action":"insert_slide","slideIndex":5,"slideType":"quiz","content":{"question":"What year?","options":["2020","2021","2022","2023"],"correctAnswer":2}}

### 3. delete_slide - Remove a slide
{"action":"delete_slide","slideIndex":2}

### 4. duplicate_slide - Copy a slide
{"action":"duplicate_slide","slideIndex":1,"targetIndex":3}

### 5. reorder_slide - Move a slide
targetIndex is REQUIRED. To move a slide to the end: use targetIndex: slides.length - 1.
Example: {"action":"reorder_slide","slideIndex":1,"targetIndex":4}
When user asks to move MULTIPLE slides (e.g. "move the 4 quiz slides to the end"), return multiple reorder_slide commands. Process from the FIRST slide: e.g. to move slides 0,1,2,3 to end of 8 slides, return: reorder 0→7, 0→6, 0→5, 0→4 (each time move the first of the remaining to end).

### COMPOSITE REQUESTS - One message, multiple actions
Parse the user message for multiple distinct requests (e.g. "slide X do A, slide Y do B, create slide about Z"). Return one command per distinct request. You can return up to 10 commands.
Also return a **tasks** array in your JSON: one task per distinct sub-request, each with **targetSlideNumbers** (1-based slides you will touch) and **intent** (short). Every slide number in tasks must have at least one command with matching slideIndex (slideIndex = slideNumber − 1).
Example - User: "בשקופית 2 שנה את התמונה, בשקופית 4 הוסף תמונה של כריש מימין, וצור לי שקופית חדשה על מלחמת האזרחים"
→ Return 3 commands: update_slide slideIndex 1 (imagePrompt), update_slide slideIndex 3 (imagePrompt + imagePosition), insert_slide slideIndex slides.length (content about Civil War).
→ tasks: [{ "targetSlideNumbers": [2], "intent": "change image slide 2" }, { "targetSlideNumbers": [4], "intent": "shark image right" }, { "targetSlideNumbers": [], "intent": "new Civil War slide" }]

## SLIDE NUMBER MAPPING (CRITICAL)
- Each slide has "slideNumber" (1-based) and "index" (0-based). User says "slide 5" / "שקופית 5" / "בשקופית מספר 5" → Find slide with slideNumber: 5 → use slideIndex: 4 (slideIndex = slideNumber - 1).
- NEVER guess. If user says "slide 5", slideIndex MUST be 4. If user says "שקופית 6", slideIndex MUST be 5.
- In responseMessage: When confirming, use the SAME slide number the user used (e.g. "שקופית 5" not "שקופית 6", "slide 5" not "slide 6").

## CRITICAL RULES
1. slideIndex is ALWAYS 0-based. slideNumber in the slide list is 1-based. slideIndex = slideNumber - 1.
2. For update_slide, put content fields DIRECTLY on the command object (title, question, etc.) - NOT nested inside another object.
3. For imagePrompt: describe the visual scene in detail. NEVER include text/words/letters in the description.
4. Parse multiple distinct requests in one message. Return one command per request. You can return up to 10 commands for composite requests.
5. ${isHe ? "Write responseMessage in Hebrew. Use natural, friendly Hebrew." : "Write responseMessage in English."}
6. Match the language of NEW content to the presentation language (${isHe ? "Hebrew" : "English"}).
7. When user says "this slide" or "current slide" or "הזו" or "הנוכחית", use slideIndex: ${currentSlideIndex}.
8. For "last slide" or "אחרונה", use slideIndex: ${slides.length - 1}.
9. When generating images, be specific and vivid in the imagePrompt description.
10. NEVER return empty commands array unless the user is just chatting/asking a question.
11. IMAGE CONTEXT: Each slide summary includes title, text/bulletPoints, and imageDescription (the original image prompt if stored). When the user asks to change an image on a specific slide (e.g. "בשקופית 2 אני רוצה שהבחור שמציץ יהיה יותר עבריין"), FIRST identify what that slide shows from its title, text, bulletPoints, and imageDescription. Then create imagePrompt that KEEPS the same scene but APPLIES the user's modification (e.g. same person peeking at ATM, but looking more sinister/criminal). Never invent a different scene.
12. When user says "slide 2" or "שקופית 2" or "the second slide", use slideIndex: 1 (0-based). Match visual references (person, guy, image) to slide content.
13. CONTEXT: When user says "those 4 slides" or "the slides you just added" or "move them to the end", look at the slide list. Recently added slides are often consecutive and of the same type (e.g. 4 quiz slides). Identify them by index from the current slides array and return reorder_slide for each, moving from smallest index first to end (targetIndex: slides.length-1, then slides.length-2, etc.).
14. IMAGE CHANGES: When user asks to change an image on a slide, use the slide's imageDescription (or title/text) to understand the current scene, then create imagePrompt that keeps the scene but applies the modification.
15. CONVERSATION CONTEXT: Use the full conversation history to understand references: "the slide you just added", "the presentation about X", "change the old man to young man" (referring to a person in an image from a prior message). When user refers to "the image" or "the person" without a slide number, infer from recent messages and slide content.
16. REASONING SCOPE (CRITICAL): The "reasoning" field (shown as "What I understood") must describe ONLY what you understood from the CURRENT user message (the latest request) and what you will do for THIS request. Do NOT include tasks or interpretations from previous messages. Conversation history is for resolving references (e.g. "the slide you just added")—not for re-stating or re-executing old requests. If the user only says "התמונה בשקף 3 לא עובדת", your reasoning must mention only fixing the image on slide 3.
17. CONCISE CONTENT: For quiz, poll, scale, yesno, ranking, guess_number, wordcloud - keep options and answers SHORT (1-2 lines max). Avoid long paragraphs. For content slides - keep text concise. Prefer brief bullet points over long paragraphs.
18. PRESENTATION SCOPE: This chat is for ONE presentation only. Never reference or mix content from other presentations.
${hasVisionImages ? `
19. VISION - ACTUAL IMAGES INCLUDED: We have included the actual slide image(s) below. You MUST analyze the image to understand its current content (people, objects, composition, style). Then create imagePrompt that KEEPS the same scene/structure but APPLIES the user's modification (e.g. same composition, but "old man" → "young man", or change a specific element). Describe what you see and produce the modified imagePrompt accordingly.` : ""}`;
}

// =============================================================================
// TOOL DEFINITION - Flat structure, no nesting confusion
// =============================================================================

function buildToolDefinition() {
  return {
    type: "function",
    function: {
      name: "edit_presentation",
      description: "Execute presentation edit commands. Return 1-10 commands based on user request. For composite requests (multiple actions in one message), return one command per distinct request.",
      parameters: {
        type: "object",
        properties: {
          reasoning: {
            type: "string",
            description: "1-2 sentences: what you understood from the request and what you will do. Show reasoning before the result.",
          },
          responseMessage: {
            type: "string",
            description: "Friendly message confirming what was done, in the user's language",
          },
          commands: {
            type: "array",
            maxItems: 10,
            items: {
              type: "object",
              properties: {
                action: {
                  type: "string",
                  enum: ["update_slide", "insert_slide", "delete_slide", "duplicate_slide", "reorder_slide"],
                },
                slideIndex: { type: "number", description: "0-based slide index" },
                // Content fields for update_slide (flat, not nested)
                title: { type: "string" },
                subtitle: { type: "string" },
                text: { type: "string" },
                question: { type: "string" },
                options: { type: "array", items: { type: "string" } },
                correctAnswer: { type: "number" },
                correctIsYes: { type: "boolean" },
                bulletPoints: { type: "array", items: { type: "string" } },
                events: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      year: { type: "string" },
                      title: { type: "string" },
                      description: { type: "string" },
                    },
                  },
                },
                bars: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      label: { type: "string" },
                      value: { type: "number" },
                    },
                  },
                },
                points: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                    },
                  },
                },
                items: { type: "array", items: { type: "string" } },
                correctNumber: { type: "number" },
                minRange: { type: "number" },
                maxRange: { type: "number" },
                scaleOptions: {
                  type: "object",
                  properties: {
                    minLabel: { type: "string" },
                    maxLabel: { type: "string" },
                    steps: { type: "number" },
                  },
                },
                leftLabel: { type: "string" },
                rightLabel: { type: "string" },
                imagePrompt: {
                  type: "string",
                  description: "Vivid description for image generation. NO text in image.",
                },
                gradientPreset: { type: "string" },
                fontFamily: { type: "string" },
                // For insert_slide
                slideType: {
                  type: "string",
                  enum: [
                    "title",
                    "split_content",
                    "content",
                    "bullet_points",
                    "timeline",
                    "bar_chart",
                    "quiz",
                    "poll",
                    "wordcloud",
                    "scale",
                    "yesno",
                    "ranking",
                    "guess_number",
                    "sentiment_meter",
                  ],
                },
                content: {
                  type: "object",
                  description: "Content for new slide (insert_slide only)",
                },
                // For reorder/duplicate
                targetIndex: { type: "number" },
              },
              required: ["action", "slideIndex"],
            },
          },
        },
        required: ["responseMessage", "commands"],
      },
    },
  };
}

// =============================================================================
// AI CALL WITH ROBUST PARSING
// =============================================================================

interface HistoryTurn {
  role: "user" | "assistant";
  content: string;
}

interface VisionImage {
  slideIndex: number;
  base64: string;
  mimeType: string;
}

async function callAI(
  message: string,
  slides: Slide[],
  currentSlideIndex: number,
  language: "he" | "en",
  conversationHistory: HistoryTurn[] = [],
  userAiContext?: string,
  originalPrompt?: string,
  visionImages: VisionImage[] = [],
  lectureMode: "education" | "webinar" = "education",
  retryHint?: string,
): Promise<{ responseMessage: string; commands: any[]; reasoning?: string; tasks?: PlannerTask[] }> {
  const apiKey = requireGeminiApiKey();

  const systemPrompt = buildSystemPrompt(
    slides,
    currentSlideIndex,
    language,
    userAiContext,
    originalPrompt,
    visionImages.length > 0,
    lectureMode,
  );
  const isHe = language === "he";

  console.log(`🤖 Calling AI with message: "${message.slice(0, 100)}..." | History: ${conversationHistory.length} turns | Vision images: ${visionImages.length}`);

  const jsonInstruction = `You must respond with a single JSON object matching this TypeScript type:
{
  "reasoning": string;  // REQUIRED: 1-2 sentences based ONLY on the CURRENT user message—what you understood and what you will do.
  "tasks": { "targetSlideNumbers": number[]; "intent": string }[];  // REQUIRED: one entry per distinct sub-request; list every 1-based slide number you will change (empty array if only chatting).
  "responseMessage": string;  // Brief tone note only; the server will append factual "what was applied". Do NOT claim slides were updated unless your commands actually target those slideIndex values.
  "commands": {
    "action": "update_slide" | "insert_slide" | "delete_slide" | "duplicate_slide" | "reorder_slide";
    "slideIndex": number;
  }[];
}
Do not include any markdown, commentary, or extra text. Return ONLY the JSON.`;

  const contents: { role: string; parts: { text: string }[] }[] = [];

  contents.push({
    role: "user",
    parts: [{ text: systemPrompt }],
  });
  contents.push({
    role: "model",
    parts: [{ text: isHe ? "הבנתי את מבנה המצגת. אני מוכן לעזור." : "I understand the presentation structure. Ready to help." }],
  });

  for (const turn of conversationHistory) {
    contents.push({
      role: turn.role === "assistant" ? "model" : "user",
      parts: [{ text: turn.content }],
    });
  }

  const lastMessageParts: { text?: string; inlineData?: { mimeType: string; data: string } }[] = [];
  let requestText = `User request:\n${message}\n\n`;
  if (retryHint) {
    requestText += `Server validation (you must fix this in your JSON):\n${retryHint}\n\n`;
  }
  if (visionImages.length > 0) {
    requestText += `[We've included the actual image(s) for the slide(s) you need to edit. Analyze each image and create imagePrompt that applies the user's requested change while keeping the scene/structure.]\n\n`;
  }
  requestText += jsonInstruction;
  lastMessageParts.push({ text: requestText });
  for (const img of visionImages) {
    lastMessageParts.push({
      inlineData: { mimeType: img.mimeType, data: img.base64 },
    });
  }
  contents.push({
    role: "user",
    parts: lastMessageParts,
  });

  try {
    const geminiModel = "gemini-2.5-flash";
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;

    const res = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.3,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!res.ok) {
      const status = res.status;
      const errText = await res.text().catch(() => "");
      console.error(`AI API error: ${status} - ${errText.slice(0, 200)}`);

      if (status === 429) throw new Error("RATE_LIMIT");
      if (status === 402) throw new Error("CREDITS_EXHAUSTED");
      throw new Error(`AI_API_ERROR_${status}`);
    }

    const data = await res.json();
    const contentText = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("").trim() || "";

    if (contentText) {
      try {
        const parsed = JSON.parse(contentText);
        if (parsed.commands && Array.isArray(parsed.commands)) {
          console.log(`✅ Parsed ${parsed.commands.length} commands from Gemini JSON`);
          const tasks: PlannerTask[] = Array.isArray(parsed.tasks)
            ? parsed.tasks.map((t: any) => ({
              targetSlideNumbers: Array.isArray(t?.targetSlideNumbers) ? t.targetSlideNumbers : [],
              intent: typeof t?.intent === "string" ? t.intent : "",
            }))
            : [];
          return {
            responseMessage: parsed.responseMessage || (isHe ? "בוצע ✅" : "Done ✅"),
            commands: parsed.commands,
            reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning.trim() : undefined,
            tasks,
          };
        }
      } catch (e) {
        console.error("Failed to parse Gemini JSON:", e);
      }
    }

    console.error("Could not parse Gemini response. Raw:", JSON.stringify(data).slice(0, 500));
    return {
      responseMessage: isHe
        ? "לא הצלחתי להבין את הבקשה. אפשר לנסח אחרת? 🤔"
        : "I couldn't understand the request. Could you rephrase? 🤔",
      commands: [],
      tasks: [],
    };
  } catch (e) {
    if (
      e instanceof Error &&
      (e.message === "RATE_LIMIT" || e.message === "CREDITS_EXHAUSTED" || e.message.startsWith("AI_API_ERROR"))
    ) {
      throw e;
    }
    console.error("AI call exception:", e);
    throw new Error("AI_CALL_FAILED");
  }
}

// =============================================================================
// COMMAND EXECUTOR - Properly handles flat command structure
// =============================================================================

async function executeCommands(commands: any[], slides: Slide[]): Promise<Slide[]> {
  let result = [...slides.map((s) => ({ ...s, content: { ...s.content }, design: { ...s.design } }))];
  const imagePromises: { promise: Promise<string | null>; slideIndex: number; slideType: string }[] = [];

  // Content fields that can appear directly on the command
  const CONTENT_FIELDS = [
    "title",
    "subtitle",
    "text",
    "question",
    "options",
    "correctAnswer",
    "correctIsYes",
    "bulletPoints",
    "events",
    "bars",
    "points",
    "items",
    "correctNumber",
    "minRange",
    "maxRange",
    "scaleOptions",
    "leftLabel",
    "rightLabel",
  ];
  const DESIGN_FIELDS = ["gradientPreset", "fontFamily", "textColor", "fontSize", "backgroundColor"];

  for (const cmd of commands) {
    const action = cmd.action;
    const idx = cmd.slideIndex;

    console.log(`Executing: ${action} on slide ${idx}`);

    switch (action) {
      case "update_slide": {
        if (idx === undefined || idx < 0 || idx >= result.length) {
          console.warn(`Invalid slideIndex ${idx} for update_slide (total: ${result.length})`);
          continue;
        }

        const slide = result[idx];
        const updatedContent = { ...slide.content };
        const updatedDesign = { ...slide.design };
        let changed = false;

        // Apply content fields directly from command
        for (const field of CONTENT_FIELDS) {
          if (cmd[field] !== undefined) {
            (updatedContent as any)[field] = cmd[field];
            changed = true;
            console.log(`  Set content.${field}`);
          }
        }

        // Apply design fields directly from command
        for (const field of DESIGN_FIELDS) {
          if (cmd[field] !== undefined) {
            (updatedDesign as any)[field] = cmd[field];
            changed = true;
            console.log(`  Set design.${field}`);
          }
        }

        // Also handle legacy nested formats (newValue, field+newValue, etc.)
        if (cmd.newValue && typeof cmd.newValue === "object") {
          if (cmd.field === "design") {
            Object.assign(updatedDesign, cmd.newValue);
            changed = true;
          } else {
            Object.assign(updatedContent, cmd.newValue);
            changed = true;
          }
        }
        // Legacy: newTitle, newQuestion, newText, newOptions
        if (cmd.newTitle) {
          updatedContent.title = cmd.newTitle;
          changed = true;
        }
        if (cmd.newQuestion) {
          updatedContent.question = cmd.newQuestion;
          changed = true;
        }
        if (cmd.newText) {
          updatedContent.text = cmd.newText;
          changed = true;
        }
        if (cmd.newOptions) {
          updatedContent.options = cmd.newOptions;
          changed = true;
        }

        // Handle image generation
        const imgPrompt = cmd.imagePrompt || cmd.newValue?.imagePrompt;
        if (imgPrompt && typeof imgPrompt === "string" && imgPrompt.length > 3) {
          imagePromises.push({
            promise: generateImage(imgPrompt),
            slideIndex: idx,
            slideType: slide.type,
          });
          changed = true;
        }

        if (changed) {
          result[idx] = { ...slide, content: updatedContent, design: updatedDesign };
        }
        break;
      }

      case "insert_slide": {
        const insertIdx = Math.min(Math.max(0, idx ?? result.length), result.length);
        const slideType = cmd.slideType || cmd.newSlideType || "content";
        const slideContent = cmd.content || cmd.newSlideContent || {};

        // Build proper content based on slide type
        const newContent = buildNewSlideContent(slideType, slideContent);

        const lang = detectLanguage(JSON.stringify(newContent));
        const newSlide: Slide = {
          id: generateId(),
          type: slideType,
          order: insertIdx,
          content: newContent,
          design: {
            gradientPreset: cmd.gradientPreset || "purple-blue",
            fontFamily: cmd.fontFamily || "Inter",
            textColor: "#ffffff",
            fontSize: "medium",
            textAlign: lang === "he" ? "right" : "left",
            direction: lang === "he" ? "rtl" : "ltr",
          },
          layout: "centered",
          // Default interactive timer should match frontend defaults (20s). `0` is "Off".
          activitySettings: { duration: 20, showResults: true, interactionStyle: "bar_chart" },
        };

        // Handle image for new slide
        const newImgPrompt = cmd.imagePrompt || slideContent.imagePrompt;
        if (newImgPrompt) {
          imagePromises.push({
            promise: generateImage(newImgPrompt),
            slideIndex: insertIdx,
            slideType: slideType,
          });
        }

        result.splice(insertIdx, 0, newSlide);
        result = result.map((s, i) => ({ ...s, order: i }));
        break;
      }

      case "delete_slide": {
        if (idx !== undefined && idx >= 0 && idx < result.length && result.length > 1) {
          console.log(`  Deleting slide ${idx + 1}`);
          result.splice(idx, 1);
          result = result.map((s, i) => ({ ...s, order: i }));
        } else {
          console.warn(`Cannot delete slide ${idx} (total: ${result.length})`);
        }
        break;
      }

      case "duplicate_slide": {
        if (idx !== undefined && idx >= 0 && idx < result.length) {
          const original = result[idx];
          const dup: Slide = {
            ...JSON.parse(JSON.stringify(original)),
            id: generateId(),
          };
          const targetIdx = Math.min(cmd.targetIndex ?? idx + 1, result.length);
          result.splice(targetIdx, 0, dup);
          result = result.map((s, i) => ({ ...s, order: i }));
        }
        break;
      }

      case "reorder_slide": {
        if (cmd.targetIndex === undefined) {
          console.warn(`reorder_slide: targetIndex is REQUIRED, skipping slide ${idx}`);
          break;
        }
        if (
          idx !== undefined &&
          idx >= 0 &&
          idx < result.length &&
          cmd.targetIndex >= 0 &&
          cmd.targetIndex < result.length
        ) {
          const [moved] = result.splice(idx, 1);
          result.splice(cmd.targetIndex, 0, moved);
          result = result.map((s, i) => ({ ...s, order: i }));
          console.log(`  Reordered slide from index ${idx} to ${cmd.targetIndex}`);
        }
        break;
      }

      default:
        console.warn(`Unknown action: ${action}`);
    }
  }

  // Wait for all image generations in parallel
  if (imagePromises.length > 0) {
    console.log(`⏳ Waiting for ${imagePromises.length} image(s)...`);
    const imageResults = await Promise.allSettled(imagePromises.map((p) => p.promise));

    for (let i = 0; i < imageResults.length; i++) {
      const res = imageResults[i];
      const { slideIndex: imgIdx, slideType: imgType } = imagePromises[i];

      if (res.status === "fulfilled" && res.value && imgIdx < result.length) {
        const imageUrl = res.value;
        const targetSlide = result[imgIdx];

        if (imgType === "split_content") {
          result[imgIdx] = {
            ...targetSlide,
            content: { ...targetSlide.content, imageUrl },
          };
        } else {
          result[imgIdx] = {
            ...targetSlide,
            design: { ...targetSlide.design, overlayImageUrl: imageUrl, overlayImagePosition: "background" },
          };
        }
        console.log(`✅ Image applied to slide ${imgIdx + 1}`);
      } else if (res.status === "rejected") {
        console.error(`❌ Image failed for slide ${imgIdx + 1}:`, res.reason);
      }
    }
  }

  return result.map(ensureDesignDefaults);
}

// =============================================================================
// BUILD NEW SLIDE CONTENT - Ensures proper structure for each type
// =============================================================================

function buildNewSlideContent(slideType: string, raw: any): SlideContent {
  const content: SlideContent = {};

  switch (slideType) {
    case "title":
      content.title = raw.title || "New Slide";
      content.subtitle = raw.subtitle || "";
      break;
    case "split_content":
      content.title = raw.title || "Content";
      content.bulletPoints = raw.bulletPoints || raw.text?.split?.("\n") || ["Point 1", "Point 2", "Point 3"];
      content.imagePosition = raw.imagePosition || "right";
      break;
    case "content":
      content.title = raw.title || "Content";
      content.text = raw.text || "";
      break;
    case "bullet_points":
      content.title = raw.title || "Key Points";
      content.points = (raw.points || raw.items || ["Point 1", "Point 2", "Point 3"]).map((p: any) =>
        typeof p === "string" ? { title: p, description: "" } : p,
      );
      break;
    case "timeline":
      content.title = raw.title || "Timeline";
      content.events = (
        raw.events || [
          { year: "2020", title: "Event 1", description: "" },
          { year: "2021", title: "Event 2", description: "" },
          { year: "2022", title: "Event 3", description: "" },
          { year: "2023", title: "Event 4", description: "" },
        ]
      ).slice(0, 5);
      break;
    case "bar_chart":
      content.title = raw.title || "Chart";
      content.bars = raw.bars || [
        { label: "A", value: 60 },
        { label: "B", value: 80 },
        { label: "C", value: 45 },
      ];
      break;
    case "quiz":
      content.question = raw.question || "Question?";
      content.options = (raw.options || ["A", "B", "C", "D"]).slice(0, 4);
      content.correctAnswer = typeof raw.correctAnswer === "number" ? raw.correctAnswer : 0;
      break;
    case "poll":
      content.question = raw.question || "What do you think?";
      content.options = (raw.options || ["Option 1", "Option 2", "Option 3"]).slice(0, 6);
      break;
    case "wordcloud":
      content.question = raw.question || "Share your thoughts...";
      break;
    case "scale":
      content.question = raw.question || "Rate this:";
      content.scaleOptions = raw.scaleOptions || { minLabel: "Low", maxLabel: "High", steps: 5 };
      break;
    case "yesno":
      content.question = raw.question || "Yes or No?";
      content.correctIsYes = raw.correctIsYes ?? true;
      break;
    case "ranking":
      content.question = raw.question || "Rank these:";
      content.items = (raw.items || ["Item 1", "Item 2", "Item 3", "Item 4"]).slice(0, 6);
      break;
    case "guess_number":
      content.question = raw.question || "Guess the number!";
      content.correctNumber = raw.correctNumber || 50;
      content.minRange = raw.minRange || raw.min || 0;
      content.maxRange = raw.maxRange || raw.max || 100;
      break;
    case "sentiment_meter":
      content.question = raw.question || "How do you feel?";
      content.leftLabel = raw.leftLabel || "Not great";
      content.rightLabel = raw.rightLabel || "Amazing";
      break;
    default:
      content.title = raw.title || "Slide";
      content.text = raw.text || "";
  }

  return content;
}

// =============================================================================
// USER PLAN: MAX SLIDES
// =============================================================================

async function getUserMaxSlides(userId: string): Promise<number> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceKey) return 5;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select("plan_id")
    .eq("user_id", userId)
    .single();

  if (!sub?.plan_id) return 5;

  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("max_slides")
    .eq("id", sub.plan_id)
    .single();

  const max = plan?.max_slides;
  return typeof max === "number" ? max : 5;
}

async function getUserAiSettings(userId: string): Promise<{
  who_am_i?: string;
  what_i_lecture?: string;
  teaching_style?: string;
  additional_context?: string;
} | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceKey) return null;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data } = await supabase
    .from("user_ai_settings")
    .select("who_am_i, what_i_lecture, teaching_style, additional_context")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

// =============================================================================
// CREDIT CONSUMPTION
// =============================================================================

async function consumeCredits(
  userId: string,
  amount: number,
  description: string
): Promise<{ success: boolean; error?: string }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase configuration for credits");
    return { success: false, error: "Server configuration error" };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get current balance
  const { data: credits, error: fetchError } = await supabase
    .from("user_credits")
    .select("ai_tokens_balance, ai_tokens_consumed")
    .eq("user_id", userId)
    .single();

  if (fetchError) {
    console.error("Error fetching user credits:", fetchError);
    return { success: false, error: "Could not fetch credits" };
  }

  if (!credits || credits.ai_tokens_balance < amount) {
    return { success: false, error: "Insufficient credits" };
  }

  // Deduct credits
  const { error: updateError } = await supabase
    .from("user_credits")
    .update({
      ai_tokens_balance: credits.ai_tokens_balance - amount,
      ai_tokens_consumed: (credits.ai_tokens_consumed || 0) + amount,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (updateError) {
    console.error("Error updating credits:", updateError);
    return { success: false, error: "Could not update credits" };
  }

  // Log transaction
  await supabase.from("credit_transactions").insert({
    user_id: userId,
    credit_type: "ai_tokens",
    transaction_type: "consume",
    amount: -amount,
    description,
  });

  console.log(`💳 Consumed ${amount} credits from user ${userId}: ${description}`);
  return { success: true };
}

// =============================================================================
// SLIDE NUMBER VALIDATION - Correct off-by-one when user explicitly says "slide X"
// =============================================================================

const MAX_EXPLICIT_SLIDE_NUMBERS = 15;

/** Collect (position, slide number) pairs, sort by position, dedupe preserving first mention order. */
function extractExplicitSlideNumbersInOrder(message: string): number[] {
  const matches: { pos: number; n: number }[] = [];
  const pushGroup = (m: RegExpExecArray, groups: number[]) => {
    const pos = m.index;
    for (const g of groups) {
      const n = parseInt(String(m[g]), 10);
      if (n >= 1 && n <= 50) matches.push({ pos, n });
    }
  };

  const pairRes: RegExp[] = [
    /\bslides?\s+(\d+)\s*(?:,|and|&|\/|ו(?:גם)?)\s+(\d+)\b/gi,
    /\bslides?\s+(\d+)\s+ו-?\s*(\d+)\b/gi,
    /שקופיות\s+(\d+)\s*ו-?\s*(\d+)/gi,
    /שקופית\s+(\d+)\s*ו-?\s*(?:שקופית\s+)?(\d+)/gi,
    /בין\s+שקופית\s+(\d+)\s+ל-?\s*(\d+)/gi,
    /(?:slide|שקופית)\s*(\d+)\s*(?:,|and|&|\/|ו(?:גם)?)\s*(?:slide|שקופית)?\s*(\d+)/gi,
  ];
  for (const re of pairRes) {
    let m: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((m = re.exec(message)) !== null) {
      pushGroup(m, [1, 2]);
    }
  }

  const normalized = message.toLowerCase();
  const singlePatterns = [
    /\b(?:slide|שקופית|שקופיות)\s*(?:מספר\s*)?(\d+)/gi,
    /(?:slide|שקופית)(\d+)/gi,
    /\b(?:the\s+)?(\d+)(?:st|nd|rd|th)\s+slides?\b/gi,
  ];
  for (const p of singlePatterns) {
    let m: RegExpExecArray | null;
    p.lastIndex = 0;
    while ((m = p.exec(normalized)) !== null) {
      pushGroup(m, [1]);
    }
  }

  matches.sort((a, b) => a.pos - b.pos || a.n - b.n);
  const ordered: number[] = [];
  const seen = new Set<number>();
  for (const { n } of matches) {
    if (!seen.has(n)) {
      seen.add(n);
      ordered.push(n);
    }
  }
  return ordered.slice(0, MAX_EXPLICIT_SLIDE_NUMBERS);
}

/** Unique slide numbers mentioned (order not guaranteed — prefer extractExplicitSlideNumbersInOrder). */
function extractExplicitSlideNumbers(message: string): number[] {
  return [...extractExplicitSlideNumbersInOrder(message)];
}

function setsOfNumbersEqual(a: Set<number>, b: Set<number>): boolean {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

function hasStructuralSlideCommands(commands: any[]): boolean {
  return commands.some((c) =>
    c.action === "delete_slide" || c.action === "reorder_slide" || c.action === "duplicate_slide"
  );
}

/** When user explicitly says "slide X" and we have one slide-modifying command with wrong slideIndex, correct it. */
function correctSlideIndexIfMismatch(commands: any[], message: string, totalSlides: number): any[] {
  const explicit = extractExplicitSlideNumbersInOrder(message);
  if (explicit.length !== 1) return commands;

  const expectedSlideIndex = explicit[0] - 1;
  const slideModifyingActions = new Set(["update_slide", "delete_slide", "duplicate_slide", "reorder_slide"]);

  const cmds = commands.filter((c: any) => slideModifyingActions.has(c.action) && typeof c.slideIndex === "number");
  if (cmds.length !== 1) return commands;

  const cmd = cmds[0];
  if (cmd.slideIndex !== expectedSlideIndex && expectedSlideIndex >= 0 && expectedSlideIndex < totalSlides) {
    console.log(
      `⚠️ Slide number correction: user said "slide ${explicit[0]}", AI used slideIndex ${cmd.slideIndex}. Correcting to slideIndex ${expectedSlideIndex}.`
    );
    return commands.map((c: any) =>
      c === cmd ? { ...c, slideIndex: expectedSlideIndex } : c
    );
  }
  return commands;
}

/**
 * When the user names multiple slides and the model emits multiple update_slide commands with the wrong
 * (or duplicate) slideIndex, remap command order → explicit slide order (1-based from message).
 */
function correctMultiUpdateSlideIndices(commands: any[], message: string, totalSlides: number): any[] {
  const explicitOrdered = extractExplicitSlideNumbersInOrder(message);
  const updateCmdIndices: number[] = [];
  commands.forEach((c, i) => {
    if (c.action === "update_slide") updateCmdIndices.push(i);
  });
  const updateCmds = updateCmdIndices.map((i) => commands[i]);

  if (
    hasStructuralSlideCommands(commands) ||
    explicitOrdered.length < 2 ||
    updateCmds.length !== explicitOrdered.length ||
    !explicitOrdered.every((n) => n >= 1 && n <= totalSlides)
  ) {
    return commands;
  }

  const expectedSeq = explicitOrdered.map((n) => n - 1);
  const actualSeq = updateCmds.map((c) => Number(c.slideIndex));
  if (actualSeq.some((x) => !Number.isFinite(x))) return commands;

  const expectedSet = new Set(expectedSeq);
  const actualSet = new Set(actualSeq);
  const allSameWrong = updateCmds.length > 1 && actualSet.size === 1;
  const setMismatch = !setsOfNumbersEqual(expectedSet, actualSet);

  if (!allSameWrong && !setMismatch) return commands;

  const next = [...commands];
  for (let k = 0; k < updateCmdIndices.length; k++) {
    const cmdI = updateCmdIndices[k];
    next[cmdI] = { ...next[cmdI], slideIndex: explicitOrdered[k] - 1 };
  }
  console.log(`🔧 Multi-slide update_slide remap → slides: ${explicitOrdered.join(", ")}`);
  return next;
}

function correctSlideIndices(commands: any[], message: string, totalSlides: number): any[] {
  const afterMulti = correctMultiUpdateSlideIndices(commands, message, totalSlides);
  return correctSlideIndexIfMismatch(afterMulti, message, totalSlides);
}

// =============================================================================
// Truthful diff + task validation (no false "done")
// =============================================================================

function slidePayloadForDiff(s: Slide): unknown {
  return {
    type: s.type,
    content: s.content,
    design: s.design,
    layout: s.layout,
    activitySettings: s.activitySettings,
  };
}

function summarizeSlideDiff(before: Slide[], after: Slide[]): {
  changedNumbers: number[];
  inserted: number;
  deleted: number;
  reordered: boolean;
} {
  const inserted = Math.max(0, after.length - before.length);
  const deleted = Math.max(0, before.length - after.length);
  const changedNumbers: number[] = [];
  const minLen = Math.min(before.length, after.length);
  for (let i = 0; i < minLen; i++) {
    if (JSON.stringify(slidePayloadForDiff(before[i])) !== JSON.stringify(slidePayloadForDiff(after[i]))) {
      changedNumbers.push(i + 1);
    }
  }
  let reordered = false;
  if (before.length === after.length && before.length > 0) {
    const idsBefore = before.map((s) => s.id).join("\0");
    const idsAfter = after.map((s) => s.id).join("\0");
    if (idsBefore !== idsAfter) reordered = true;
  }
  return { changedNumbers, inserted, deleted, reordered };
}

function buildFactualAppliedMessage(
  language: "he" | "en",
  d: ReturnType<typeof summarizeSlideDiff>,
): string {
  const isHe = language === "he";
  const parts: string[] = [];
  if (d.changedNumbers.length) {
    parts.push(
      isHe
        ? `**בוצע בפועל:** עודכנו שקופיות: ${d.changedNumbers.join(", ")}.`
        : `**Applied:** Updated slide(s): ${d.changedNumbers.join(", ")}.`,
    );
  }
  if (d.inserted) {
    parts.push(isHe ? `נוספו ${d.inserted} שקופיות.` : `Added ${d.inserted} slide(s).`);
  }
  if (d.deleted) {
    parts.push(isHe ? `הוסרו ${d.deleted} שקופיות.` : `Removed ${d.deleted} slide(s).`);
  }
  if (d.reordered && (d.changedNumbers.length > 0 || d.inserted > 0 || d.deleted > 0)) {
    parts.push(isHe ? `סדר השקופיות עודכן.` : `Slide order was updated.`);
  } else if (d.reordered && d.changedNumbers.length === 0 && d.inserted === 0 && d.deleted === 0) {
    parts.push(isHe ? `**בוצע בפועל:** סדר השקופיות עודכן.` : `**Applied:** Slide order was updated.`);
  }
  if (
    d.changedNumbers.length === 0 &&
    d.inserted === 0 &&
    d.deleted === 0 &&
    !d.reordered
  ) {
    parts.push(
      isHe
        ? "**בוצע בפועל:** לא זוהו שינויים בשקופיות (ייתכן שהבקשה לא יושמה, אינדקס שגוי, או שהתוכן כבר היה זהה)."
        : "**Applied:** No slide changes were detected (the request may not have applied, indices may be wrong, or content was unchanged).",
    );
  }
  return parts.join(" ");
}

function findTaskSlidesMissingCommands(
  tasks: PlannerTask[] | undefined,
  commands: any[],
  totalSlides: number,
): number[] {
  if (!tasks?.length) return [];
  const required = new Set<number>();
  for (const t of tasks) {
    const nums = t?.targetSlideNumbers;
    if (!Array.isArray(nums)) continue;
    for (const raw of nums) {
      const n = typeof raw === "number" ? raw : parseInt(String(raw), 10);
      if (n >= 1 && n <= totalSlides) required.add(n);
    }
  }
  if (required.size === 0) return [];

  const touched = new Set<number>();
  for (const cmd of commands) {
    if (!cmd || typeof cmd.slideIndex !== "number") continue;
    const idx = cmd.slideIndex;
    if (idx < 0 || idx >= totalSlides) continue;
    const num = idx + 1;
    if (cmd.action === "update_slide" || cmd.action === "delete_slide" || cmd.action === "duplicate_slide") {
      touched.add(num);
    }
    if (cmd.action === "reorder_slide") {
      touched.add(num);
      if (typeof cmd.targetIndex === "number") {
        const t = cmd.targetIndex + 1;
        if (t >= 1 && t <= totalSlides) touched.add(t);
      }
    }
    if (cmd.action === "insert_slide") {
      touched.add(Math.min(num, totalSlides));
    }
  }

  const missing: number[] = [];
  for (const n of required) {
    if (!touched.has(n)) missing.push(n);
  }
  return missing;
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const { user, error: authError } = await verifyAuth(req);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: authError || "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log(`🔐 User: ${user.id}`);

    // Parse body
    const body = await req.json();
    const {
      message,
      slides = [],
      currentSlideIndex = 0,
      originalPrompt,
      targetAudience,
      conversationHistory = [],
      lectureMode: rawLectureMode,
    } = body;
    const lectureMode: "education" | "webinar" = rawLectureMode === "webinar" ? "webinar" : "education";

    // Validate
    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (message.length > 2000) {
      return new Response(JSON.stringify({ error: "Message too long (max 2000 chars)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safeSlides: Slide[] = Array.isArray(slides) ? slides : [];
    const safeIndex = Math.max(0, Math.min(currentSlideIndex, Math.max(0, safeSlides.length - 1)));
    const language = detectLanguage(originalPrompt || message);

    console.log(
      `📝 Message: "${message.slice(0, 80)}..." | Slides: ${safeSlides.length} | Viewing: ${safeIndex + 1} | Lang: ${language}`,
    );

    const safeHistory: HistoryTurn[] = Array.isArray(conversationHistory)
      ? conversationHistory
        .filter((t: any) => t && (t.role === "user" || t.role === "assistant") && typeof t.content === "string")
        .slice(-20)
        .map((t: any) => ({ role: t.role, content: t.content }))
      : [];

    // Early check BEFORE AI call: do not waste tokens if user has no credits
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (supabaseUrl && supabaseServiceKey) {
      const checkSupabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data: credits } = await checkSupabase
        .from("user_credits")
        .select("ai_tokens_balance")
        .eq("user_id", user.id)
        .single();
      if (!credits || (credits.ai_tokens_balance ?? 0) < 1) {
        const msgHe = "אין לך מספיק קרדיטים. שדרג את התוכנית שלך או רכוש קרדיטים נוספים כדי להמשיך.";
        const msgEn = "You don't have enough credits. Upgrade your plan or purchase more credits to continue.";
        return new Response(
          JSON.stringify({
            message: language === "he" ? msgHe : msgEn,
            updatedSlides: safeSlides,
            creditsConsumed: 0,
            error: "Insufficient credits",
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const userAiSettings = await getUserAiSettings(user.id);
    const userAiContext = userAiSettings
      ? [
          userAiSettings.who_am_i && `Instructor: ${userAiSettings.who_am_i}`,
          userAiSettings.what_i_lecture && `Typically lectures on: ${userAiSettings.what_i_lecture}`,
          userAiSettings.teaching_style && `Teaching style: ${userAiSettings.teaching_style}`,
          userAiSettings.additional_context && `Additional context: ${userAiSettings.additional_context}`,
        ]
          .filter(Boolean)
          .join("\n")
      : undefined;

    // Vision: include slide images when user asks to change something IN the image
    const visionImages = getSlidesWithImagesForVision(safeSlides, message);

    // Call AI (optional one retry if tasks promise slides that commands omit)
    let aiResult = await callAI(
      message,
      safeSlides,
      safeIndex,
      language,
      safeHistory,
      userAiContext,
      originalPrompt,
      visionImages,
      lectureMode,
    );

    const missingAfterFirst = findTaskSlidesMissingCommands(
      aiResult.tasks,
      aiResult.commands,
      safeSlides.length,
    );
    if (missingAfterFirst.length > 0) {
      const hint =
        language === "he"
          ? `חובה לכלול פקודות (למשל update_slide עם slideIndex נכון) עבור שקופיות מספר: ${missingAfterFirst.join(", ")} (מספור מ-1). ציינת אותן ב-tasks אבל אין פקודה שמיישמת אותן. החזר JSON מלא מתוקן עם reasoning, tasks, responseMessage, commands.`
          : `You MUST include commands (e.g. update_slide with correct 0-based slideIndex) for slide number(s): ${missingAfterFirst.join(", ")} (1-based). They appear in tasks but no command applies them. Return full corrected JSON with reasoning, tasks, responseMessage, and commands.`;
      console.log(`🔁 Retrying AI: missing slides ${missingAfterFirst.join(", ")}`);
      aiResult = await callAI(
        message,
        safeSlides,
        safeIndex,
        language,
        safeHistory,
        userAiContext,
        originalPrompt,
        visionImages,
        lectureMode,
        hint,
      );
    }

    console.log(
      `🤖 AI response: "${aiResult.responseMessage.slice(0, 60)}..." | Commands: ${aiResult.commands.length}`,
    );

    // Execute commands if any
    let updatedSlides: Slide[] | null = null;
    let creditsConsumed = 0;
    const reasoningBlock = aiResult.reasoning
      ? `**What I understood:** ${aiResult.reasoning}\n\n`
      : "";
    let outputMessage = `${reasoningBlock}${aiResult.responseMessage}`;

    if (aiResult.commands.length > 0) {
      let commandsToUse = correctSlideIndices(aiResult.commands, message, safeSlides.length);

      // Filter out any invalid commands
      let validCommands = commandsToUse.filter((cmd: any) => {
        if (!cmd.action) {
          console.warn("Skipping command without action:", cmd);
          return false;
        }
        if (cmd.action === "no_change") return false;
        return true;
      });

      // Enforce subscription slide limit: filter out insert_slide/duplicate_slide that would exceed max
      const maxSlides = await getUserMaxSlides(user.id);
      let slideLimitMessage = "";
      let slideCount = safeSlides.length;

      validCommands = validCommands.filter((cmd: any) => {
        if (cmd.action === "insert_slide" || cmd.action === "duplicate_slide") {
          slideCount += 1;
          if (slideCount > maxSlides) {
            slideLimitMessage = language === "he"
              ? "מגבלת השקופיות הגיעה. שדרג את התוכנית כדי להוסיף עוד שקופיות."
              : "Slide limit reached. Upgrade your plan to add more slides.";
            console.log(`⛔ Skipping ${cmd.action}: would exceed max_slides (${maxSlides})`);
            return false;
          }
        } else if (cmd.action === "delete_slide") {
          slideCount = Math.max(0, slideCount - 1);
        }
        return true;
      });

      if (slideLimitMessage) {
        outputMessage = `${reasoningBlock}${aiResult.responseMessage}\n\n${slideLimitMessage}`;
      }

      if (validCommands.length > 0) {
        // Calculate credits: 1 token per AFFECTED SLIDE (not per command)
        // Count unique slides being modified
        const affectedSlideIndices = new Set<number>();
        for (const cmd of validCommands) {
          if (typeof cmd.slideIndex === "number") {
            affectedSlideIndices.add(cmd.slideIndex);
          }
        }
        // Minimum 1 credit if any commands, otherwise count unique slides
        creditsConsumed = Math.max(1, affectedSlideIndices.size);

        // Check if user has enough credits BEFORE executing
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        const checkSupabase = createClient(supabaseUrl!, supabaseServiceKey!);
        
        const { data: credits } = await checkSupabase
          .from("user_credits")
          .select("ai_tokens_balance")
          .eq("user_id", user.id)
          .single();

        if (!credits || credits.ai_tokens_balance < creditsConsumed) {
          return new Response(
            JSON.stringify({ 
              error: "Insufficient credits",
              message: language === "he" 
                ? "אין לך מספיק קרדיטים. אנא שדרג את התוכנית שלך או רכוש קרדיטים נוספים."
                : "You don't have enough credits. Please upgrade your plan or purchase more credits."
            }),
            { 
              status: 402, 
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            }
          );
        }

        // Execute commands FIRST
        console.log(`⚡ Executing ${validCommands.length} valid command(s) on ${affectedSlideIndices.size} slide(s)...`);
        updatedSlides = await executeCommands(validCommands, safeSlides);
        console.log(`✅ Execution complete. Result: ${updatedSlides.length} slides.`);

        // Only deduct credits AFTER successful execution
        const creditResult = await consumeCredits(
          user.id,
          creditsConsumed,
          `Chat builder: ${affectedSlideIndices.size} slide(s) modified`
        );

        if (creditResult.success) {
          console.log(`💳 Credits consumed: ${creditsConsumed} (after successful execution)`);
        } else {
          console.warn(`⚠️ Failed to deduct credits after execution: ${creditResult.error}`);
        }

        const diff = summarizeSlideDiff(safeSlides, updatedSlides);
        const factual = buildFactualAppliedMessage(language, diff);
        outputMessage = `${reasoningBlock}${aiResult.responseMessage}\n\n${factual}`;
      } else {
        const factual = buildFactualAppliedMessage(language, {
          changedNumbers: [],
          inserted: 0,
          deleted: 0,
          reordered: false,
        });
        outputMessage = `${reasoningBlock}${aiResult.responseMessage}${
          slideLimitMessage ? `\n\n${slideLimitMessage}` : ""
        }\n\n${factual}`;
      }
    }

    return new Response(
      JSON.stringify({
        message: outputMessage,
        updatedSlides,
        creditsConsumed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("❌ Handler error:", error);

    const errMsg = error instanceof Error ? error.message : "Unknown error";
    let status = 500;
    let userMessage = "An unexpected error occurred. Please try again.";

    if (errMsg === "RATE_LIMIT") {
      status = 429;
      userMessage = "Too many requests. Please wait a moment and try again.";
    } else if (errMsg === "CREDITS_EXHAUSTED") {
      status = 402;
      userMessage = "AI credits exhausted. Please try again later.";
    } else if (errMsg === "AI_CALL_FAILED" || errMsg.startsWith("AI_API_ERROR")) {
      status = 502;
      userMessage = "AI service temporarily unavailable. Please try again.";
    }

    return new Response(JSON.stringify({ error: userMessage }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
