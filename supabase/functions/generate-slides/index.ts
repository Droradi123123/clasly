import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    .select("ai_tokens_balance, ai_tokens_consumed, presentations_created, slides_created")
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

async function updateUsageStats(
  userId: string,
  slidesCreated: number,
  presentationCreated: boolean
): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseServiceKey) return;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get current stats
  const { data: credits } = await supabase
    .from("user_credits")
    .select("slides_created, presentations_created")
    .eq("user_id", userId)
    .single();

  if (!credits) return;

  await supabase
    .from("user_credits")
    .update({
      slides_created: (credits.slides_created || 0) + slidesCreated,
      presentations_created: (credits.presentations_created || 0) + (presentationCreated ? 1 : 0),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
}

// =============================================================================
// BUILDER CONVERSATION LOG (Supabase: public.builder_conversation)
// =============================================================================

async function appendBuilderConversation(
  userId: string,
  sessionId: string,
  rows: { role: string; content: string; metadata?: Record<string, unknown> }[],
): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceKey || !sessionId || rows.length === 0) return;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { error } = await supabase.from("builder_conversation").insert(
    rows.map((r) => ({
      user_id: userId,
      session_id: sessionId,
      role: r.role,
      content: r.content,
      metadata: r.metadata ?? {},
    })),
  );
  if (error) {
    console.error("builder_conversation insert failed:", error);
  }
}

// =============================================================================
// 1. THEME DEFINITIONS - Cinematic themes for generated presentations
// =============================================================================

interface GeneratedTheme {
  id: string;
  name: string;
  colors: {
    background: string;
    textPrimary: string;
    accent: string;
    secondary: string;
  };
  font: string;
  mood: string;
  gradientPalette: string[];
}

const CINEMATIC_THEMES: GeneratedTheme[] = [
  {
    id: "neon-cyber",
    name: "Neon Cyber",
    colors: {
      background: "240 20% 8%",
      textPrimary: "0 0% 100%",
      accent: "280 100% 65%",
      secondary: "200 100% 50%",
    },
    font: "Space Grotesk",
    mood: "Tech, Futuristic, High-Energy",
    gradientPalette: ["purple-blue", "blue-cyan", "purple-pink", "dark-blue", "cyan-teal"],
  },
  {
    id: "soft-pop",
    name: "Soft Pop",
    colors: {
      background: "330 30% 95%",
      textPrimary: "330 50% 20%",
      accent: "330 80% 60%",
      secondary: "280 60% 70%",
    },
    font: "Poppins",
    mood: "Playful, Friendly, Creative",
    gradientPalette: ["pink-orange", "peach-rose", "soft-pink", "lavender-pink", "coral-warm"],
  },
  {
    id: "academic-pro",
    name: "Academic Pro",
    colors: {
      background: "220 20% 98%",
      textPrimary: "220 30% 15%",
      accent: "220 70% 50%",
      secondary: "160 50% 45%",
    },
    font: "Inter",
    mood: "Professional, Trustworthy, Clean",
    gradientPalette: ["blue-gray", "steel-blue", "navy-slate", "teal-blue", "cool-gray"],
  },
  {
    id: "swiss-minimal",
    name: "Swiss Minimal",
    colors: {
      background: "0 0% 8%",
      textPrimary: "0 0% 100%",
      accent: "0 85% 55%",
      secondary: "45 100% 50%",
    },
    font: "Inter",
    mood: "Bold, Modern, Minimalist",
    gradientPalette: ["dark-red", "charcoal-black", "red-orange", "dark-gold", "mono-dark"],
  },
  {
    id: "sunset-warmth",
    name: "Sunset Warmth",
    colors: {
      background: "30 40% 96%",
      textPrimary: "20 30% 20%",
      accent: "15 90% 55%",
      secondary: "35 100% 60%",
    },
    font: "Lora",
    mood: "Warm, Narrative, Human",
    gradientPalette: ["orange-gold", "sunset-warm", "amber-rose", "terracotta", "warm-peach"],
  },
  {
    id: "ocean-breeze",
    name: "Ocean Breeze",
    colors: {
      background: "200 30% 97%",
      textPrimary: "200 40% 15%",
      accent: "195 85% 45%",
      secondary: "170 60% 50%",
    },
    font: "Poppins",
    mood: "Calm, Fresh, Educational",
    gradientPalette: ["ocean-teal", "aqua-green", "sky-blue", "sea-foam", "blue-green"],
  },
];

// =============================================================================
// 2. DYNAMIC GRADIENT SYSTEM - Per-slide gradient selection
// =============================================================================

const GRADIENT_DEFINITIONS: Record<string, { colors: string[]; angle: number }> = {
  // Neon Cyber palette
  "purple-blue": { colors: ["#7c3aed", "#2563eb"], angle: 135 },
  "blue-cyan": { colors: ["#1d4ed8", "#06b6d4"], angle: 145 },
  "purple-pink": { colors: ["#9333ea", "#ec4899"], angle: 120 },
  "dark-blue": { colors: ["#1e1b4b", "#312e81"], angle: 160 },
  "cyan-teal": { colors: ["#06b6d4", "#14b8a6"], angle: 135 },
  // Soft Pop palette
  "pink-orange": { colors: ["#ec4899", "#f97316"], angle: 135 },
  "peach-rose": { colors: ["#fb923c", "#f472b6"], angle: 140 },
  "soft-pink": { colors: ["#f9a8d4", "#c084fc"], angle: 130 },
  "lavender-pink": { colors: ["#a78bfa", "#f472b6"], angle: 150 },
  "coral-warm": { colors: ["#fb7185", "#fdba74"], angle: 135 },
  // Academic Pro palette
  "blue-gray": { colors: ["#3b82f6", "#64748b"], angle: 145 },
  "steel-blue": { colors: ["#475569", "#1e40af"], angle: 135 },
  "navy-slate": { colors: ["#1e3a5f", "#334155"], angle: 160 },
  "teal-blue": { colors: ["#0d9488", "#2563eb"], angle: 140 },
  "cool-gray": { colors: ["#4b5563", "#6b7280"], angle: 150 },
  // Swiss Minimal palette
  "dark-red": { colors: ["#991b1b", "#1c1917"], angle: 135 },
  "charcoal-black": { colors: ["#292524", "#0c0a09"], angle: 160 },
  "red-orange": { colors: ["#dc2626", "#ea580c"], angle: 130 },
  "dark-gold": { colors: ["#78350f", "#292524"], angle: 145 },
  "mono-dark": { colors: ["#27272a", "#18181b"], angle: 150 },
  // Sunset Warmth palette
  "orange-gold": { colors: ["#ea580c", "#ca8a04"], angle: 135 },
  "sunset-warm": { colors: ["#dc2626", "#f59e0b"], angle: 140 },
  "amber-rose": { colors: ["#d97706", "#e11d48"], angle: 130 },
  terracotta: { colors: ["#9a3412", "#b45309"], angle: 150 },
  "warm-peach": { colors: ["#f97316", "#fbbf24"], angle: 135 },
  // Ocean Breeze palette
  "ocean-teal": { colors: ["#0891b2", "#0d9488"], angle: 135 },
  "aqua-green": { colors: ["#06b6d4", "#10b981"], angle: 140 },
  "sky-blue": { colors: ["#0ea5e9", "#38bdf8"], angle: 150 },
  "sea-foam": { colors: ["#14b8a6", "#34d399"], angle: 130 },
  "blue-green": { colors: ["#2563eb", "#059669"], angle: 145 },
};

// Slide-type to gradient mood mapping
const SLIDE_TYPE_GRADIENT_MOOD: Record<string, number> = {
  title: 0, // First (hero) gradient - most dramatic
  split_content: 1, // Second gradient - informative
  content: 2, // Third - educational
  quiz: 3, // Fourth - energetic/competitive
  timeline: 1, // Informative
  scale: 4, // Fifth - interactive feel
  yesno: 3, // Energetic
  poll: 2, // Balanced
  wordcloud: 4, // Creative
  bullet_points: 1, // Informative
  bar_chart: 2, // Data-driven
  ranking: 3, // Competitive
  guess_number: 3, // Fun
  sentiment_meter: 4, // Emotional
};

function selectGradientForSlide(slideType: string, slideIndex: number, theme: GeneratedTheme): string {
  const palette = theme.gradientPalette;
  // Use slide type mood as primary selector, index as fallback for variety
  const moodIndex = SLIDE_TYPE_GRADIENT_MOOD[slideType] ?? slideIndex;
  // Combine mood + index to ensure no two consecutive slides share a gradient
  const effectiveIndex = (moodIndex + slideIndex) % palette.length;
  return palette[effectiveIndex];
}

// =============================================================================
// 3. DESIGN STYLE SYSTEM - Varied visual styles per slide
// =============================================================================

const DESIGN_STYLES = ["dynamic", "elegant", "bold", "minimal", "cinematic"];

function selectDesignStyle(slideType: string, slideIndex: number): string {
  const typeStyles: Record<string, string[]> = {
    title: ["cinematic", "bold", "elegant"],
    split_content: ["dynamic", "elegant", "minimal"],
    content: ["minimal", "elegant", "dynamic"],
    quiz: ["bold", "dynamic", "cinematic"],
    timeline: ["elegant", "minimal", "dynamic"],
    scale: ["dynamic", "bold", "minimal"],
    yesno: ["bold", "dynamic", "cinematic"],
    poll: ["dynamic", "bold", "elegant"],
    wordcloud: ["cinematic", "dynamic", "elegant"],
    bullet_points: ["minimal", "elegant", "dynamic"],
    bar_chart: ["minimal", "dynamic", "elegant"],
    ranking: ["bold", "dynamic", "cinematic"],
    guess_number: ["bold", "dynamic", "cinematic"],
    sentiment_meter: ["dynamic", "elegant", "cinematic"],
  };
  const styles = typeStyles[slideType] || DESIGN_STYLES;
  return styles[slideIndex % styles.length];
}

// =============================================================================
// 4. FALLBACK IMAGES BY CATEGORY
// =============================================================================

const FALLBACK_IMAGES: Record<string, string[]> = {
  tech: [
    "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200",
    "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200",
    "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200",
  ],
  business: [
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200",
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200",
    "https://images.unsplash.com/photo-1553484771-371a605b060b?w=1200",
  ],
  education: [
    "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200",
    "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=1200",
    "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1200",
  ],
  nature: [
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200",
    "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=1200",
    "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=1200",
  ],
  creative: [
    "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1200",
    "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=1200",
    "https://images.unsplash.com/photo-1499892477393-f675706cbe6e?w=1200",
  ],
  general: [
    "https://images.unsplash.com/photo-1557683316-973673baf926?w=1200",
    "https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1200",
    "https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?w=1200",
  ],
};

function getCategoryFromTopic(topic: string): string {
  const t = topic.toLowerCase();
  if (/tech|ai|cyber|digital|computer|software|code|robot/.test(t)) return "tech";
  if (/business|corporate|marketing|sales|finance|money/.test(t)) return "business";
  if (/education|learn|school|teach|study|course/.test(t)) return "education";
  if (/nature|ocean|environment|animal|plant|earth/.test(t)) return "nature";
  if (/art|creative|design|music|color|paint/.test(t)) return "creative";
  return "general";
}

function getFallbackImage(topic: string, index: number = 0): string {
  const category = getCategoryFromTopic(topic);
  const images = FALLBACK_IMAGES[category] || FALLBACK_IMAGES.general;
  return images[index % images.length];
}

// =============================================================================
// 5. IMAGE PROMPT ENHANCEMENT
// =============================================================================

function enhanceImagePrompt(originalPrompt: string, slideType: string): string {
  const noTextRequirement = `ABSOLUTE REQUIREMENT - TEXT-FREE IMAGE ONLY:
- DO NOT include ANY text, words, letters, numbers, labels, titles, captions, watermarks, logos, or typography of ANY kind
- DO NOT include any signs, banners, or written content
- DO NOT include any UI elements, buttons, or interface text
- This is a pure visual/photographic image with ZERO textual elements
- Any text in the image is a FAILURE`;

  const styleByType: Record<string, string> = {
    title:
      "Abstract, subtle, soft focus background, muted colors, gradient, minimal, elegant negative space. Photographic or illustrated, never infographic.",
    split_content:
      "Clear subject, vibrant but not overwhelming, professional photography style, good composition. Real photo or artistic illustration only.",
    poll: "Abstract patterns, geometric shapes, modern design, clean aesthetic. Pure visual art, no diagrams.",
    wordcloud: "Flowing abstract shapes, soft gradients, dreamy atmosphere, ethereal. Artistic background only.",
  };

  const style = styleByType[slideType] || styleByType.split_content;
  const quality =
    "Ultra high quality, 4K resolution, professional lighting, cinematic composition. Pure visual content.";

  return `${noTextRequirement}\n\nSubject: ${originalPrompt}\n\nStyle: ${style}\n\n${quality}`;
}

// =============================================================================
// 6. SIMPLE IN-MEMORY CACHE FOR IMAGE PROMPTS
// =============================================================================

const imageCache = new Map<string, string>();

function getImageCacheKey(prompt: string): string {
  return `${prompt.substring(0, 100).replace(/\s+/g, "_")}_${prompt.length}`;
}

// =============================================================================
// 7. ROBUST JSON PARSER
// =============================================================================

function cleanAndParseJSON(rawContent: string): any {
  let text = rawContent;

  const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    text = jsonBlockMatch[1];
  }

  text = text
    .trim()
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/,(\s*[}\]])/g, "$1")
    .replace(/(\{|\,)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

  const openBraces = (text.match(/{/g) || []).length;
  const closeBraces = (text.match(/}/g) || []).length;
  const openBrackets = (text.match(/\[/g) || []).length;
  const closeBrackets = (text.match(/]/g) || []).length;

  if (openBraces > closeBraces) text += "}".repeat(openBraces - closeBraces);
  if (openBrackets > closeBrackets) text += "]".repeat(openBrackets - closeBrackets);

  try {
    return JSON.parse(text);
  } catch (firstError) {
    console.error("First parse attempt failed:", firstError);

    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch {}
    }

    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {}
    }

    console.error("JSON content preview:", text.substring(0, 500));
    return null;
  }
}

// =============================================================================
// 8. SLIDE VALIDATION & AUTO-FIX
// =============================================================================

interface RawSlide {
  type: string;
  content: Record<string, any>;
  imagePrompt?: string;
}

function validateAndFixSlide(slide: RawSlide, index: number, topic: string): RawSlide {
  const fixedSlide = { ...slide, content: { ...slide.content } };

  const typeNorm: Record<string, string> = {
    agreeSpectrum: "agree_spectrum",
    sentiment: "sentiment_meter",
  };
  if (fixedSlide.type && typeNorm[fixedSlide.type]) {
    fixedSlide.type = typeNorm[fixedSlide.type];
  }

  if (!fixedSlide.type) {
    fixedSlide.type = index === 0 ? "title" : "content";
  }

  switch (fixedSlide.type) {
    case "title":
      if (!fixedSlide.content.title) fixedSlide.content.title = topic || "Presentation";
      if (!fixedSlide.content.subtitle) fixedSlide.content.subtitle = "";
      break;

    case "split_content":
      if (!fixedSlide.content.title) fixedSlide.content.title = "Introduction";
      if (!fixedSlide.content.text && !fixedSlide.content.bulletPoints) {
        fixedSlide.content.text = "Key point 1\nKey point 2\nKey point 3";
      }
      break;

    case "quiz":
      if (!fixedSlide.content.question) fixedSlide.content.question = "Question?";
      if (!fixedSlide.content.options || fixedSlide.content.options.length < 2) {
        fixedSlide.content.options = ["Option A", "Option B", "Option C", "Option D"];
      }
      if (typeof fixedSlide.content.correctAnswer !== "number") {
        fixedSlide.content.correctAnswer = 0;
      }
      fixedSlide.content.correctAnswer = Math.max(
        0,
        Math.min(fixedSlide.content.correctAnswer, fixedSlide.content.options.length - 1),
      );
      break;

    case "timeline":
      if (!fixedSlide.content.title) fixedSlide.content.title = "Timeline";
      if (!fixedSlide.content.events || !Array.isArray(fixedSlide.content.events)) {
        fixedSlide.content.events = [];
      }
      while (fixedSlide.content.events.length < 4) {
        fixedSlide.content.events.push({
          year: `${2020 + fixedSlide.content.events.length}`,
          title: `Event ${fixedSlide.content.events.length + 1}`,
          description: "Description",
        });
      }
      fixedSlide.content.events = fixedSlide.content.events.slice(0, 4);
      break;

    case "scale":
      if (!fixedSlide.content.question) fixedSlide.content.question = "Rate this:";
      if (!fixedSlide.content.minLabel) fixedSlide.content.minLabel = "Low";
      if (!fixedSlide.content.maxLabel) fixedSlide.content.maxLabel = "High";
      break;

    case "poll":
      if (!fixedSlide.content.question) fixedSlide.content.question = "What do you think?";
      if (!fixedSlide.content.options || fixedSlide.content.options.length < 2) {
        fixedSlide.content.options = ["Option 1", "Option 2", "Option 3"];
      }
      break;

    case "yesno":
      if (!fixedSlide.content.question) fixedSlide.content.question = "Yes or No?";
      break;

    case "sentiment_meter":
      if (!fixedSlide.content.question) fixedSlide.content.question = "How do you feel about this?";
      if (!fixedSlide.content.leftLabel) fixedSlide.content.leftLabel = "Not great";
      if (!fixedSlide.content.rightLabel) fixedSlide.content.rightLabel = "Amazing";
      break;

    case "agree_spectrum":
      if (!fixedSlide.content.statement) {
        fixedSlide.content.statement =
          (typeof fixedSlide.content.question === "string" && fixedSlide.content.question) ||
          topic ||
          "State your position on this topic.";
      }
      if (!fixedSlide.content.leftLabel) fixedSlide.content.leftLabel = "Strongly Disagree";
      if (!fixedSlide.content.rightLabel) fixedSlide.content.rightLabel = "Strongly Agree";
      break;

    case "wordcloud":
      if (!fixedSlide.content.question) fixedSlide.content.question = "Share your response in one word:";
      break;

    case "finish_sentence":
      if (!fixedSlide.content.sentenceStart) {
        fixedSlide.content.sentenceStart = "The key insight from this topic is...";
      }
      if (typeof fixedSlide.content.maxCharacters !== "number" || fixedSlide.content.maxCharacters < 1) {
        fixedSlide.content.maxCharacters = 120;
      }
      break;
  }

  return fixedSlide;
}

// =============================================================================
// 9. SLIDE TYPE MAPPING - Now with dynamic gradients & styles
// =============================================================================

interface MappedSlide {
  id: string;
  type: string;
  content: Record<string, any>;
  design: Record<string, any>;
  layout: string;
  activitySettings?: Record<string, any>;
  order: number;
}

function generateSlideId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

function mapSlideToFrontendFormat(
  rawSlide: RawSlide,
  index: number,
  theme: GeneratedTheme,
  detectedLanguage: string,
  generatedImageUrl?: string,
  topic?: string,
): MappedSlide {
  const textAlign: "left" | "center" | "right" = detectedLanguage === "hebrew" ? "right" : "left";

  // *** KEY CHANGE: Dynamic gradient per slide ***
  const gradientPreset = selectGradientForSlide(rawSlide.type, index, theme);
  const designStyle = selectDesignStyle(rawSlide.type, index);

  const baseDesign: Record<string, any> = {
    gradientPreset,
    textColor: "#ffffff",
    fontFamily: theme.font,
    fontSize: "medium",
    textAlign,
    themeId: theme.id,
    designStyleId: designStyle,
  };

  const baseActivitySettings = {
    duration: 60,
    showResults: true,
    interactionStyle: "bar_chart",
  };

  const typeMap: Record<string, string> = {
    splitContent: "split_content",
    split_content: "split_content",
    guessNumber: "guess_number",
    guess_number: "guess_number",
    yesNo: "yesno",
    yesno: "yesno",
    sentiment: "sentiment_meter",
    sentiment_meter: "sentiment_meter",
    bullets: "bullet_points",
    bullet_points: "bullet_points",
    bar_chart: "bar_chart",
    barChart: "bar_chart",
    agreeSpectrum: "agree_spectrum",
    agree_spectrum: "agree_spectrum",
  };

  const normalizedType = typeMap[rawSlide.type] || rawSlide.type;
  let mappedContent: Record<string, any> = {};

  const fallbackImage = topic ? getFallbackImage(topic, index) : undefined;
  const imageUrl = generatedImageUrl || fallbackImage;

  switch (normalizedType) {
    case "title":
      mappedContent = {
        title: rawSlide.content.title || "Welcome",
        subtitle: rawSlide.content.subtitle || "",
      };
      if (imageUrl) {
        baseDesign.overlayImageUrl = imageUrl;
        baseDesign.overlayImagePosition = "background";
      }
      break;

    case "split_content":
      mappedContent = {
        title: rawSlide.content.title || "Introduction",
        bulletPoints: rawSlide.content.text
          ? rawSlide.content.text.split("\n").filter((t: string) => t.trim())
          : rawSlide.content.bulletPoints || ["Key point 1", "Key point 2"],
        imageUrl: imageUrl || "",
        imagePosition: detectedLanguage === "hebrew" ? "left" : "right",
      };
      break;

    case "content":
      mappedContent = {
        title: rawSlide.content.title || "Content",
        text: rawSlide.content.text || "",
      };
      break;

    case "timeline":
      mappedContent = {
        title: rawSlide.content.title || "Timeline",
        events: (rawSlide.content.events || []).slice(0, 5).map((e: any) => ({
          year: e.year || e.date || "2024",
          title: e.title || e.event || "Event",
          description: e.description || "",
        })),
      };
      break;

    case "bullet_points":
      mappedContent = {
        title: rawSlide.content.title || "Key Points",
        points: (rawSlide.content.points || rawSlide.content.items || [])
          .slice(0, 6)
          .map((p: any) =>
            typeof p === "string"
              ? { title: p, description: "" }
              : { title: p.title || p, description: p.description || "" },
          ),
      };
      break;

    case "bar_chart":
      mappedContent = {
        title: rawSlide.content.title || "Data",
        subtitle: rawSlide.content.subtitle || "",
        bars: (rawSlide.content.bars || rawSlide.content.data || []).slice(0, 6).map((b: any) => ({
          label: b.label || b.name || "Item",
          value: b.value || 50,
        })),
      };
      break;

    case "quiz":
      mappedContent = {
        question: rawSlide.content.question || "Question?",
        options: (rawSlide.content.options || ["A", "B", "C", "D"]).slice(0, 4),
        correctAnswer: typeof rawSlide.content.correctAnswer === "number" ? rawSlide.content.correctAnswer : 0,
      };
      break;

    case "poll":
      mappedContent = {
        question: rawSlide.content.question || "What do you think?",
        options: (rawSlide.content.options || ["Option 1", "Option 2", "Option 3"]).slice(0, 4),
      };
      if (imageUrl) {
        baseDesign.overlayImageUrl = imageUrl;
        baseDesign.overlayImagePosition = "background";
      }
      break;

    case "wordcloud":
      mappedContent = {
        question: rawSlide.content.question || "Share your thoughts...",
      };
      if (imageUrl) {
        baseDesign.overlayImageUrl = imageUrl;
        baseDesign.overlayImagePosition = "background";
      }
      break;

    case "scale":
      mappedContent = {
        question: rawSlide.content.question || "Rate this:",
        scaleOptions: {
          minLabel: rawSlide.content.minLabel || "Low",
          maxLabel: rawSlide.content.maxLabel || "High",
          steps: 5,
        },
      };
      break;

    case "sentiment_meter":
      mappedContent = {
        question: rawSlide.content.question || "How do you feel?",
        leftEmoji: "😡",
        rightEmoji: "😍",
        leftLabel: rawSlide.content.leftLabel || "Not great",
        rightLabel: rawSlide.content.rightLabel || "Amazing",
      };
      break;

    case "yesno":
      mappedContent = {
        question: rawSlide.content.question || "Yes or No?",
        correctAnswer: rawSlide.content.correctIsYes ?? true,
      };
      break;

    case "ranking":
      mappedContent = {
        question: rawSlide.content.question || "Rank these items:",
        items: (rawSlide.content.items || ["Item 1", "Item 2", "Item 3", "Item 4"]).slice(0, 4),
      };
      break;

    case "guess_number":
      mappedContent = {
        question: rawSlide.content.question || "Guess the number!",
        correctNumber: rawSlide.content.correctNumber || 50,
        minRange: rawSlide.content.min || 0,
        maxRange: rawSlide.content.max || 100,
      };
      break;

    case "agree_spectrum":
      mappedContent = {
        statement:
          rawSlide.content.statement ||
          rawSlide.content.question ||
          "Agree or disagree with this statement.",
        leftLabel: rawSlide.content.leftLabel || "Strongly Disagree",
        rightLabel: rawSlide.content.rightLabel || "Strongly Agree",
      };
      break;

    case "finish_sentence":
      mappedContent = {
        sentenceStart: rawSlide.content.sentenceStart || rawSlide.content.text || "Complete this thought:",
        maxCharacters: typeof rawSlide.content.maxCharacters === "number" ? rawSlide.content.maxCharacters : 120,
      };
      break;

    default:
      mappedContent = {
        title: rawSlide.content.title || "Slide",
        text: rawSlide.content.text || JSON.stringify(rawSlide.content),
      };
  }

  return {
    id: generateSlideId(),
    type: normalizedType === "content" ? "content" : normalizedType,
    content: mappedContent,
    design: baseDesign,
    layout: "centered",
    activitySettings: baseActivitySettings,
    order: index,
  };
}

// =============================================================================
// 10. FULL-DECK PROMPTS (interactive-only vs mixed content)
// =============================================================================

const INTERACTIVE_TYPE_CYCLE = [
  "poll",
  "quiz",
  "yesno",
  "sentiment_meter",
  "agree_spectrum",
  "scale",
  "wordcloud",
] as const;

function buildInteractiveSlideSequence(slideCount: number): string[] {
  const n = Math.min(Math.max(slideCount, 3), 15);
  const types: string[] = ["title"];
  for (let i = 1; i < n; i++) {
    types.push(INTERACTIVE_TYPE_CYCLE[(i - 1) % INTERACTIVE_TYPE_CYCLE.length]);
  }
  return types;
}

function buildInteractiveOnlyPrompt(description: string, difficulty: string, slideCount: number): string {
  const effectiveSlideCount = Math.min(Math.max(slideCount, 3), 15);
  const sequence = buildInteractiveSlideSequence(effectiveSlideCount);
  const orderLines = sequence
    .map((t, i) => `### Slide ${i + 1}: type MUST be exactly "${t}" (fill ALL required fields for that type).`)
    .join("\n");

  return `
You are an expert designer of LIVE interactive classroom presentations.

## TASK
Topic: "${description}"
Difficulty / depth: ${difficulty}

## LANGUAGE (CRITICAL)
- Match the topic language (Hebrew topic → all Hebrew; English → all English). Never mix.

## ABSOLUTE RULES
- Return EXACTLY ${effectiveSlideCount} slides in the order below. Do not skip or reorder.
- Every slide MUST include a complete "content" object with every required field for its type (no empty strings, no missing arrays).
- Slide 1 is always "title" with title + subtitle + imagePrompt.

## JSON SHAPES (use these exact keys)
- "title": { "type":"title", "content": { "title": "...", "subtitle": "..." }, "imagePrompt": "Abstract background, NO TEXT..." }
- "poll": { "type":"poll", "content": { "question": "...", "options": ["","",""] (3-4 items) }, "imagePrompt": "optional abstract, NO TEXT" }
- "quiz": { "type":"quiz", "content": { "question": "...", "options": [4 strings], "correctAnswer": 0-3 } }
- "yesno": { "type":"yesno", "content": { "question": "..." } }
- "sentiment_meter": { "type":"sentiment_meter", "content": { "question": "...", "leftLabel": "...", "rightLabel": "..." } }
- "agree_spectrum": { "type":"agree_spectrum", "content": { "statement": "A clear claim to agree/disagree with", "leftLabel": "...", "rightLabel": "..." } }
- "scale": { "type":"scale", "content": { "question": "...", "minLabel": "...", "maxLabel": "..." } }
- "wordcloud": { "type":"wordcloud", "content": { "question": "Open question for one-word answers" }, "imagePrompt": "optional" }

## REQUIRED ORDER (${effectiveSlideCount} slides)
${orderLines}

## OUTPUT
Return ONLY a valid JSON array of ${effectiveSlideCount} objects. No markdown fences, no commentary.
`;
}

function buildMixedContentPrompt(description: string, difficulty: string, slideCount: number): string {
  const effectiveSlideCount = Math.min(Math.max(slideCount, 3), 15);

  return `
You are a world-class Instructional Designer and Presentation Architect.
Your goal: create a RIVETING, MEMORABLE presentation that captivates the audience from start to finish.

## YOUR TASK
Create a ${effectiveSlideCount}-slide presentation about: "${description}"
Depth / difficulty: ${difficulty}

## CONTENT QUALITY STANDARDS (CRITICAL)
- Every title must be COMPELLING. Never generic.
- Every bullet point must deliver REAL VALUE - specific facts, surprising stats, actionable insights.
- Quiz questions must be THOUGHT-PROVOKING. Poll options must be distinct and plausible.
- For "agree_spectrum": "statement" must be a single clear claim (NOT empty).
- For "sentiment_meter": include meaningful leftLabel and rightLabel.
- Timeline events: SPECIFIC years and vivid details.

## LANGUAGE DETECTION (CRITICAL)
- If the topic is in Hebrew → ALL content MUST be in Hebrew
- If the topic is in English → ALL content MUST be in English
- Never mix languages

## AVAILABLE SLIDE TYPES (use a DIVERSE mix — include poll, quiz, yesno, sentiment_meter, agree_spectrum, scale, wordcloud where appropriate)

### CONTENT
1. "title" — { "type": "title", "content": { "title": "...", "subtitle": "..." }, "imagePrompt": "NO TEXT IN IMAGE" }
2. "split_content" — { "type": "split_content", "content": { "title": "...", "text": "line1\\nline2\\nline3" }, "imagePrompt": "..." }
3. "content" — { "type": "content", "content": { "title": "...", "text": "..." } }
4. "timeline" — 4 events with year, title, description each

### INTERACTIVE & QUIZ
5. "poll" — { "content": { "question": "...", "options": [3-4 strings] } }
6. "wordcloud" — { "content": { "question": "..." } }
7. "scale" — { "content": { "question": "...", "minLabel": "...", "maxLabel": "..." } }
8. "sentiment_meter" — { "content": { "question": "...", "leftLabel": "...", "rightLabel": "..." } }
9. "agree_spectrum" — { "content": { "statement": "...", "leftLabel": "...", "rightLabel": "..." } }
10. "quiz" — { "content": { "question": "...", "options": [4 strings], "correctAnswer": number 0-3 } }
11. "yesno" — { "content": { "question": "..." } }

## STRUCTURE (EXACTLY ${effectiveSlideCount} SLIDES)
- Slide 1: "title" — cinematic opening + imagePrompt
- Slide 2: "split_content" — hook + imagePrompt
- Include at least one "poll", one "quiz", one "yesno", one "sentiment_meter", "agree_spectrum", "scale", and "wordcloud" if ${effectiveSlideCount} >= 8; otherwise prioritize variety in: poll, quiz, yesno, sentiment_meter, agree_spectrum, scale, wordcloud
- Remaining slides: mix "content", "timeline", "bullet_points" as needed to reach ${effectiveSlideCount}

## CRITICAL IMAGE RULES
- imagePrompt: NO TEXT, NO WORDS, NO LETTERS in the image

## OUTPUT FORMAT
Return ONLY valid JSON array with EXACTLY ${effectiveSlideCount} slides. No markdown, no explanation:
[{ "type": "title", ... }, ...]
`;
}

// =============================================================================
// 11. SINGLE SLIDE GENERATION PROMPT (UPGRADED)
// =============================================================================

function buildSingleSlidePrompt(slideType: string, prompt: string, style: string, includeImage: boolean): string {
  const typeInstructions: Record<string, string> = {
    title: `Generate a "title" slide with a CINEMATIC, compelling title. Output: { "type": "title", "content": { "title": "Bold compelling title", "subtitle": "Intriguing subtitle" }, "imagePrompt": "Visual description NO TEXT..." }`,
    split_content: `Generate a "split_content" slide with 3-5 bullet points. Each bullet must deliver REAL VALUE - specific facts, surprising stats, or actionable insights. Output: { "type": "split_content", "content": { "title": "Engaging title", "text": "Surprising insight 1\\nSpecific detail 2\\nActionable takeaway 3" }, "imagePrompt": "Visual NO TEXT..." }`,
    content: `Generate a "content" slide. Write like a TED talk - engaging, specific, story-driven. Output: { "type": "content", "content": { "title": "Compelling title", "text": "Rich engaging explanation with examples..." } }`,
    timeline: `Generate a "timeline" slide with 3-5 events. Use SPECIFIC years and vivid details. Output: { "type": "timeline", "content": { "title": "The Journey of...", "events": [{ "year": "2020", "title": "Turning Point", "description": "Vivid details..." }, ...] } }`,
    bullet_points: `Generate a "bullet_points" slide with 4-6 points. Each point must be insightful. Output: { "type": "bullet_points", "content": { "title": "...", "points": [{ "title": "Bold Point", "description": "Supporting detail..." }, ...] } }`,
    bar_chart: `Generate a "bar_chart" slide with 4-6 bars using realistic data. Output: { "type": "bar_chart", "content": { "title": "...", "subtitle": "...", "bars": [{ "label": "Item", "value": 75 }, ...] } }`,
    quiz: `Generate a "quiz" slide. Make it CHALLENGING - all options should be plausible. Output: { "type": "quiz", "content": { "question": "Non-obvious question?", "options": ["Plausible A", "Plausible B", "Correct C", "Plausible D"], "correctAnswer": 2 } }`,
    poll: `Generate a "poll" slide with 4 thought-provoking options. Output: { "type": "poll", "content": { "question": "Engaging question?", "options": ["A", "B", "C", "D"] }, "imagePrompt": "Abstract background NO TEXT..." }`,
    wordcloud: `Generate a "wordcloud" slide. Output: { "type": "wordcloud", "content": { "question": "Open-ended engaging question..." }, "imagePrompt": "Abstract background NO TEXT..." }`,
    scale: `Generate a "scale" slide. Ask something that makes people THINK. Output: { "type": "scale", "content": { "question": "Thought-provoking question?", "minLabel": "Label", "maxLabel": "Label" } }`,
    sentiment_meter: `Generate a "sentiment_meter" slide. Output: { "type": "sentiment_meter", "content": { "question": "How do you feel about...?" } }`,
    yesno: `Generate a "yesno" slide. Make it DEBATABLE, not obvious. Output: { "type": "yesno", "content": { "question": "Provocative question?", "correctIsYes": true } }`,
    ranking: `Generate a "ranking" slide with 4 items. Output: { "type": "ranking", "content": { "question": "Rank these...", "items": ["A", "B", "C", "D"] } }`,
    guess_number: `Generate a "guess_number" slide with a surprising answer. Output: { "type": "guess_number", "content": { "question": "Surprising number question?", "correctNumber": 42, "min": 0, "max": 100 } }`,
  };

  const instruction = typeInstructions[slideType] || typeInstructions.content;

  return `You are an expert content creator who creates COMPELLING, MEMORABLE content.

Topic: "${prompt}"
Style: ${style}
Type: ${slideType}

## LANGUAGE: Match the topic language (Hebrew→Hebrew, English→English)

## CONTENT QUALITY
- Titles must be COMPELLING - use power words, questions, or bold statements
- Content must deliver REAL VALUE - specific facts, surprising stats, actionable insights
- Write like a storyteller, not a textbook

## SPECIFICATION
${instruction}

${
  includeImage
    ? `## IMAGE REQUIREMENT
Include "imagePrompt" with detailed visual description.
CRITICAL: NO TEXT, NO WORDS, NO LETTERS in the image - only visual elements!`
    : ""
}

## OUTPUT: Return ONLY the JSON object, no markdown:
`;
}

// =============================================================================
// 12. THEME SELECTION LOGIC
// =============================================================================

function selectThemeForTopic(topic: string): GeneratedTheme {
  const t = topic.toLowerCase();

  if (/tech|ai|cyber|digital|future|robot/.test(t)) {
    return CINEMATIC_THEMES.find((th) => th.id === "neon-cyber")!;
  }
  if (/kids|game|fun|creative|art/.test(t)) {
    return CINEMATIC_THEMES.find((th) => th.id === "soft-pop")!;
  }
  if (/history|story|culture|heritage/.test(t)) {
    return CINEMATIC_THEMES.find((th) => th.id === "sunset-warmth")!;
  }
  if (/ocean|nature|environment|science|biology/.test(t)) {
    return CINEMATIC_THEMES.find((th) => th.id === "ocean-breeze")!;
  }
  if (/business|corporate|professional|marketing/.test(t)) {
    return CINEMATIC_THEMES.find((th) => th.id === "academic-pro")!;
  }
  return CINEMATIC_THEMES.find((th) => th.id === "swiss-minimal")!;
}

// =============================================================================
// 13. AI API CALL
// =============================================================================

async function callAI(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI API Error:", response.status, errorText);
    throw new Error(`AI Service Error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// =============================================================================
// 14. IMAGE GENERATION
// =============================================================================

async function generateImage(apiKey: string, prompt: string, slideType: string): Promise<string | null> {
  try {
    const cacheKey = getImageCacheKey(prompt);
    const cachedUrl = imageCache.get(cacheKey);
    if (cachedUrl) {
      console.log("🎯 Cache hit for image");
      return cachedUrl;
    }

    console.log("🖼️ Generating image for:", prompt.substring(0, 50));

    const enhancedPrompt = enhanceImagePrompt(prompt, slideType);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: enhancedPrompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      console.error("Image generation failed:", response.status);
      return null;
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (imageUrl) {
      console.log("✅ Image generated successfully");
      imageCache.set(cacheKey, imageUrl);
      return imageUrl;
    }

    return null;
  } catch (error) {
    console.error("Image generation error:", error);
    return null;
  }
}

// =============================================================================
// 15. MAIN REQUEST HANDLER
// =============================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth verification
    const { user, error: authError } = await verifyAuth(req);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: authError || "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log(`🔐 User: ${user.id}`);

    const body = await req.json();
    const sessionId =
      typeof body.sessionId === "string" && body.sessionId.length >= 8 ? body.sessionId : undefined;
    const {
      description,
      slideCount = 8,
      contentType = "with_content",
      difficulty = "intermediate",
      singleSlide,
      skipImages = false,
    } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const inputText = singleSlide?.prompt || description || "";
    const hebrewRegex = /[\u0590-\u05FF]/;
    const detectedLanguage = hebrewRegex.test(inputText) ? "hebrew" : "english";
    console.log(`🌍 Detected language: ${detectedLanguage}`);

    // ==========================================================================
    // SINGLE SLIDE MODE
    // ==========================================================================
    if (singleSlide) {
      const { type, prompt, style = "professional", includeImage = false } = singleSlide;

      console.log(`🎯 Generating single ${type} slide`);

      // Consume 1 credit for single slide generation
      const creditResult = await consumeCredits(
        user.id,
        1,
        `Single slide generation: ${type}`
      );

      if (!creditResult.success) {
        return new Response(
          JSON.stringify({ 
            error: creditResult.error || "Insufficient credits",
          }),
          { 
            status: 402, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }

      const systemPrompt = buildSingleSlidePrompt(type, prompt, style, includeImage);
      const rawContent = await callAI(
        LOVABLE_API_KEY,
        systemPrompt,
        `Generate the JSON for a ${type} slide about: "${prompt}"`,
      );

      let rawSlide = cleanAndParseJSON(rawContent);

      if (!rawSlide || typeof rawSlide !== "object") {
        throw new Error("Failed to parse slide from AI response");
      }

      rawSlide = validateAndFixSlide(rawSlide, 0, prompt);

      let generatedImageUrl: string | null = null;
      const slidesNeedingImages = ["title", "split_content", "poll", "wordcloud"];

      if (!skipImages && (includeImage || slidesNeedingImages.includes(type))) {
        const imagePromptText = rawSlide.imagePrompt || `Professional visual for ${type} slide about: ${prompt}`;
        generatedImageUrl = await generateImage(LOVABLE_API_KEY, imagePromptText, type);
      }

      const selectedTheme = selectThemeForTopic(prompt);
      const mappedSlide = mapSlideToFrontendFormat(
        rawSlide as RawSlide,
        0,
        selectedTheme,
        detectedLanguage,
        generatedImageUrl || undefined,
        prompt,
      );

      // Update usage stats
      await updateUsageStats(user.id, 1, false);

      console.log(`✅ Single slide generated: ${type}`);

      if (sessionId) {
        await appendBuilderConversation(user.id, sessionId, [
          {
            role: "user",
            content: prompt || "",
            metadata: { kind: "single_slide_request", slideType: type, contentType },
          },
          {
            role: "assistant",
            content: `Generated one ${type} slide.`,
            metadata: { kind: "single_slide_result", slideType: type },
          },
        ]);
      }

      return new Response(
        JSON.stringify({
          slides: [mappedSlide],
          singleSlide: true,
          detectedLanguage,
          creditsConsumed: 1,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ==========================================================================
    // FULL PRESENTATION MODE
    // ==========================================================================
    if (!description) {
      throw new Error("Missing 'description' in request body");
    }

    console.log(`🎯 Generating full presentation: "${description}"`);

    // Consume credits: 1 credit per slide for full presentation
    const creditsToConsume = slideCount;
    const creditResult = await consumeCredits(
      user.id,
      creditsToConsume,
      `Presentation generation: ${slideCount} slides`
    );

    if (!creditResult.success) {
      return new Response(
        JSON.stringify({ 
          error: creditResult.error || "Insufficient credits",
        }),
        { 
          status: 402, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const selectedTheme = selectThemeForTopic(description);
    console.log(`🎨 Selected theme: ${selectedTheme.name}`);

    const systemPrompt =
      contentType === "interactive"
        ? buildInteractiveOnlyPrompt(description, difficulty, slideCount)
        : buildMixedContentPrompt(description, difficulty, slideCount);
    const rawContent = await callAI(
      LOVABLE_API_KEY,
      systemPrompt,
      `Create the JSON slides array for: "${description}".`,
    );

    console.log(`📝 Raw AI response length: ${rawContent.length} chars`);

    let rawSlides = cleanAndParseJSON(rawContent);

    if (!rawSlides || !Array.isArray(rawSlides) || !rawSlides.length) {
      throw new Error("Failed to parse slides from AI response");
    }

    rawSlides = rawSlides.map((slide: any, index: number) => validateAndFixSlide(slide, index, description));

    console.log(`✅ Parsed and validated ${rawSlides.length} slides`);

    let imageMap = new Map<number, string>();

    if (!skipImages) {
      const slidesNeedingImages = rawSlides
        .map((slide: any, index: number) => ({ slide, index }))
        .filter(
          ({ slide }: { slide: any }) =>
            ["title", "split_content", "poll", "wordcloud"].includes(slide.type) && slide.imagePrompt,
        )
        .slice(0, 3);

      console.log(`🖼️ Generating ${slidesNeedingImages.length} images...`);

      const imageResults = await Promise.all(
        slidesNeedingImages.map(async ({ slide, index }: { slide: any; index: number }) => {
          const imageUrl = await generateImage(LOVABLE_API_KEY, slide.imagePrompt, slide.type);
          return { index, imageUrl };
        }),
      );

      imageResults.forEach(({ index, imageUrl }) => {
        if (imageUrl) imageMap.set(index, imageUrl);
      });
    }

    // *** KEY CHANGE: Pass full theme object instead of just theme.id ***
    const mappedSlides = rawSlides.map((slide: any, index: number) =>
      mapSlideToFrontendFormat(slide, index, selectedTheme, detectedLanguage, imageMap.get(index), description),
    );

    // Update usage stats
    await updateUsageStats(user.id, mappedSlides.length, true);

    console.log(`🚀 Mapped ${mappedSlides.length} slides. Credits consumed: ${creditsToConsume}`);

    if (sessionId) {
      await appendBuilderConversation(user.id, sessionId, [
        {
          role: "user",
          content: description,
          metadata: { kind: "initial_prompt", contentType, difficulty, slideCount },
        },
        {
          role: "assistant",
          content:
            `Generated ${mappedSlides.length} slides. Theme: ${selectedTheme.name} (${selectedTheme.id}).`,
          metadata: {
            kind: "initial_generation",
            slideCount: mappedSlides.length,
            themeId: selectedTheme.id,
            creditsConsumed: creditsToConsume,
          },
        },
      ]);
    }

    return new Response(
      JSON.stringify({
        slides: mappedSlides,
        theme: {
          id: selectedTheme.id,
          themeName: selectedTheme.name,
          colors: selectedTheme.colors,
          font: selectedTheme.font,
          mood: selectedTheme.mood,
        },
        slideCount: mappedSlides.length,
        detectedLanguage,
        creditsConsumed: creditsToConsume,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    return new Response(JSON.stringify({ error: error.message || "Unknown error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
