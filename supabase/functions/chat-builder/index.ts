import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) return { user: null, error: "Server configuration error" };

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return { user: null, error: "Invalid or expired authentication token" };
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

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function detectLanguage(text: string): "he" | "en" {
  const hebrewChars = (text.match(/[\u0590-\u05FF]/g) || []).length;
  const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
  return hebrewChars > latinChars * 0.3 ? "he" : "en";
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function stripBase64ForContext(slides: Slide[]): any[] {
  return slides.map((s, i) => {
    const c = s.content;
    const title = c.title || c.question || c.statement || "";
    const hasImg =
      !!(c.imageUrl && !c.imageUrl.startsWith("data:")) ||
      !!(s.design?.overlayImageUrl && !s.design.overlayImageUrl.startsWith("data:"));

    // Build a concise but complete representation
    const summary: any = {
      index: i,
      type: s.type,
      hasImage: hasImg,
    };

    // Include all relevant content fields based on type
    switch (s.type) {
      case "title":
        summary.title = c.title || "";
        summary.subtitle = c.subtitle || "";
        break;
      case "split_content":
        summary.title = c.title || "";
        summary.bulletPoints = c.bulletPoints || (c.text ? c.text.split("\n") : []);
        summary.hasImage = !!c.imageUrl;
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

    // Include design info
    summary.gradient = s.design?.gradientPreset || "unknown";

    return summary;
  });
}

// =============================================================================
// IMAGE GENERATION
// =============================================================================

async function generateImage(prompt: string): Promise<string | null> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
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

function buildSystemPrompt(slides: Slide[], currentSlideIndex: number, language: "he" | "en"): string {
  const isHe = language === "he";
  const slidesData = stripBase64ForContext(slides);

  return `You are a presentation editing assistant. You receive user requests and return structured commands to modify their presentation.

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
Supported types: title, split_content, content, bullet_points, timeline, bar_chart, quiz, poll, wordcloud, scale, yesno, ranking, guess_number, sentiment_meter

Example: Add a poll after slide 3:
{"action":"insert_slide","slideIndex":3,"slideType":"poll","content":{"question":"Do you agree?","options":["Strongly agree","Agree","Disagree","Strongly disagree"]}}

Example: Add a quiz after slide 5:
{"action":"insert_slide","slideIndex":5,"slideType":"quiz","content":{"question":"What year?","options":["2020","2021","2022","2023"],"correctAnswer":2}}

### 3. delete_slide - Remove a slide
{"action":"delete_slide","slideIndex":2}

### 4. duplicate_slide - Copy a slide
{"action":"duplicate_slide","slideIndex":1,"targetIndex":3}

### 5. reorder_slide - Move a slide
{"action":"reorder_slide","slideIndex":1,"targetIndex":4}

## CRITICAL RULES
1. slideIndex is ALWAYS 0-based. When user says "slide 1", use slideIndex: 0. "slide 3" = slideIndex: 2.
2. For update_slide, put content fields DIRECTLY on the command object (title, question, etc.) - NOT nested inside another object.
3. For imagePrompt: describe the visual scene in detail. NEVER include text/words/letters in the description.
4. You can return up to 5 commands to handle complex requests.
5. ${isHe ? "Write responseMessage in Hebrew. Use natural, friendly Hebrew." : "Write responseMessage in English."}
6. Match the language of NEW content to the presentation language (${isHe ? "Hebrew" : "English"}).
7. When user says "this slide" or "current slide" or "הזו" or "הנוכחית", use slideIndex: ${currentSlideIndex}.
8. For "last slide" or "אחרונה", use slideIndex: ${slides.length - 1}.
9. When generating images, be specific and vivid in the imagePrompt description.
10. NEVER return empty commands array unless the user is just chatting/asking a question.`;
}

// =============================================================================
// TOOL DEFINITION - Flat structure, no nesting confusion
// =============================================================================

function buildToolDefinition() {
  return {
    type: "function",
    function: {
      name: "edit_presentation",
      description: "Execute presentation edit commands. Return 1-5 commands based on user request.",
      parameters: {
        type: "object",
        properties: {
          responseMessage: {
            type: "string",
            description: "Friendly message confirming what was done, in the user's language",
          },
          commands: {
            type: "array",
            maxItems: 5,
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

async function callAI(
  message: string,
  slides: Slide[],
  currentSlideIndex: number,
  language: "he" | "en",
): Promise<{ responseMessage: string; commands: any[] }> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const systemPrompt = buildSystemPrompt(slides, currentSlideIndex, language);
  const isHe = language === "he";

  console.log(`🤖 Calling AI with message: "${message.slice(0, 100)}..."`);

  try {
    const geminiModel = "gemini-2.5-flash";
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;

    const res = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{
              text: `${systemPrompt}\n\nUser request:\n${message}\n\nYou must respond with a single JSON object matching this TypeScript type:\n{\n  "responseMessage": string;\n  "commands": {\n    "action": "update_slide" | "insert_slide" | "delete_slide" | "duplicate_slide" | "reorder_slide";\n    "slideIndex": number;\n  }[];\n}\n\nDo not include any markdown, commentary, or extra text. Return ONLY the JSON.`,
            }],
          },
        ],
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
          return {
            responseMessage: parsed.responseMessage || (isHe ? "בוצע ✅" : "Done ✅"),
            commands: parsed.commands,
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
            textAlign: detectLanguage(JSON.stringify(newContent)) === "he" ? "right" : "left",
          },
          layout: "centered",
          activitySettings: { duration: 60, showResults: true, interactionStyle: "bar_chart" },
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
        if (
          idx !== undefined &&
          cmd.targetIndex !== undefined &&
          idx >= 0 &&
          idx < result.length &&
          cmd.targetIndex >= 0 &&
          cmd.targetIndex < result.length
        ) {
          const [moved] = result.splice(idx, 1);
          result.splice(cmd.targetIndex, 0, moved);
          result = result.map((s, i) => ({ ...s, order: i }));
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

  return result;
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
    const { message, slides = [], currentSlideIndex = 0, originalPrompt, targetAudience } = body;

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

    // Call AI
    const aiResult = await callAI(message, safeSlides, safeIndex, language);

    console.log(
      `🤖 AI response: "${aiResult.responseMessage.slice(0, 60)}..." | Commands: ${aiResult.commands.length}`,
    );

    // Execute commands if any
    let updatedSlides: Slide[] | null = null;
    let creditsConsumed = 0;
    
    if (aiResult.commands.length > 0) {
      // Filter out any invalid commands
      const validCommands = aiResult.commands.filter((cmd: any) => {
        if (!cmd.action) {
          console.warn("Skipping command without action:", cmd);
          return false;
        }
        if (cmd.action === "no_change") return false;
        return true;
      });

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
      }
    }

    return new Response(
      JSON.stringify({
        message: aiResult.responseMessage,
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
