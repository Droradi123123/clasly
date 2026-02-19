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
    const msg = error?.message || "Invalid or expired authentication token";
    return { user: null, error: msg };
  }
  return { user, error: null };
}

// =============================================================================
// CREDIT CONSUMPTION
// =============================================================================

const INITIAL_FREE_CREDITS = 10;

/** Ensure user has a user_credits row (creates one with initial credits if missing). */
async function ensureUserCredits(userId: string): Promise<{ ok: boolean; error?: string }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceKey) {
    return { ok: false, error: "Server configuration error" };
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: existing } = await supabase
    .from("user_credits")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) return { ok: true };
  const { error } = await supabase.from("user_credits").insert({
    user_id: userId,
    ai_tokens_balance: INITIAL_FREE_CREDITS,
    vibe_credits_balance: 0,
  });
  if (error) {
    console.error("[generate-slides] Failed to create user_credits:", error);
    return { ok: false, error: "Could not create credits" };
  }
  console.log(`💳 Created user_credits for ${userId} with ${INITIAL_FREE_CREDITS} AI tokens`);
  return { ok: true };
}

/** Check if user has enough credits (does not deduct). */
async function checkCreditsBalance(
  userId: string,
  amount: number
): Promise<{ allowed: boolean; error?: string }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceKey) {
    return { allowed: false, error: "Server configuration error" };
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: credits, error: fetchError } = await supabase
    .from("user_credits")
    .select("ai_tokens_balance")
    .eq("user_id", userId)
    .single();
  if (fetchError || !credits) {
    return { allowed: false, error: "Could not fetch credits" };
  }
  if (credits.ai_tokens_balance < amount) {
    return { allowed: false, error: "Insufficient credits" };
  }
  return { allowed: true };
}

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
  // Some models return "Here is the JSON:" or similar before the array
  const arrayStart = text.indexOf("[");
  if (arrayStart > 0 && arrayStart < 100) {
    text = text.slice(arrayStart);
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

/** If AI returned { "slides": [...] } or similar, extract the array. Handles single-slide object. */
function normalizeToSlidesArray(parsed: any): any[] | null {
  if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  if (parsed && typeof parsed === "object") {
    for (const key of ["slides", "data", "content", "result"]) {
      if (Array.isArray(parsed[key]) && parsed[key].length > 0) return parsed[key];
    }
    // Single slide returned as one object (type + content)
    if (parsed.type && parsed.content && typeof parsed.content === "object") {
      return [parsed];
    }
  }
  return null;
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
// 10. THE BRAIN: INSTRUCTIONAL DESIGN SYSTEM PROMPT (UPGRADED)
// =============================================================================

function buildInstructionalDesignPrompt(description: string, audience: string, slideCount: number): string {
  // Determine the actual slide count based on plan limits
  const effectiveSlideCount = Math.min(Math.max(slideCount, 3), 10);
  
  return `
You are a world-class Instructional Designer, TED-Talk coach, and Presentation Architect.
Your goal: create a RIVETING, MEMORABLE presentation that captivates the audience from start to finish.

## YOUR TASK
Create a ${effectiveSlideCount}-slide interactive presentation about: "${description}"
Target Audience: ${audience}

## CONTENT QUALITY STANDARDS (CRITICAL)
- Every title must be COMPELLING - use power words, questions, or bold statements. Never generic.
- Every bullet point must deliver REAL VALUE - specific facts, surprising stats, actionable insights.
- Quiz questions must be THOUGHT-PROVOKING, not trivially obvious.
- Timeline events must include SPECIFIC dates/years and vivid, concrete details.
- Scale/YesNo questions must spark GENUINE REFLECTION or DEBATE.
- Write like a storyteller: hook → build → surprise → reflect → close.

## LANGUAGE DETECTION (CRITICAL)
- If the topic is in Hebrew → ALL content MUST be in Hebrew (natural, fluent Hebrew)
- If the topic is in English → ALL content MUST be in English
- Never mix languages

## AVAILABLE SLIDE TYPES

### CATEGORY A: CONTENT (Teaching)
1. "title" → Opening slide - Make it CINEMATIC. A title that makes people lean forward.
   { "type": "title", "content": { "title": "Bold compelling title", "subtitle": "Intriguing subtitle that creates curiosity" }, "imagePrompt": "Visual description (NO TEXT IN IMAGE)..." }

2. "split_content" → Visual + Text - MUST include imagePrompt! Each bullet should be a mini-revelation.
   { "type": "split_content", "content": { "title": "Engaging section title", "text": "Surprising fact or insight 1\\nDeeper explanation with specifics 2\\nActionable takeaway 3" }, "imagePrompt": "Visual description (NO TEXT IN IMAGE)..." }

3. "content" → Deep dive text - Write like a TED talk, not a textbook.
   { "type": "content", "content": { "title": "Title", "text": "Rich, engaging explanation with specific examples, data, and stories..." } }

4. "timeline" → EXACTLY 4 events with SPECIFIC years and vivid details
   { "type": "timeline", "content": { "title": "The Journey of...", "events": [{ "year": "2020", "title": "The Turning Point", "description": "Specific, vivid details" }, ...4 events] } }

### CATEGORY B: ENGAGEMENT (Interactive)
5. "scale" → Rating scale - ask something that makes people THINK
   { "type": "scale", "content": { "question": "Thought-provoking rating question?", "minLabel": "Label", "maxLabel": "Label" } }

6. "yesno" → Yes/No question - something DEBATABLE, not obvious
   { "type": "yesno", "content": { "question": "Provocative yes/no question that sparks discussion?" } }

### CATEGORY C: COMPETITION (Quiz)
7. "quiz" → Multiple choice - make it CHALLENGING and EDUCATIONAL
   { "type": "quiz", "content": { "question": "Non-obvious question that teaches something?", "options": ["Plausible A", "Plausible B", "Correct C", "Plausible D"], "correctAnswer": 2 } }

## MANDATORY SLIDE STRUCTURE (EXACTLY ${effectiveSlideCount} SLIDES)

${effectiveSlideCount <= 5 ? `
### For ${effectiveSlideCount} slides (compact format):
### Slide 1: "title" - CINEMATIC opening. Include imagePrompt for stunning abstract background.
### Slide 2: "split_content" - HOOK with surprising facts. MUST include imagePrompt.
### Slide 3: "quiz" - Test knowledge with a TRICKY question.
${effectiveSlideCount >= 4 ? `### Slide 4: "scale" - THOUGHT-PROVOKING rating question.` : ''}
${effectiveSlideCount >= 5 ? `### Slide 5: "yesno" - END with a PROVOCATIVE discussion question.` : ''}
` : `
### Slide 1: "title" - CINEMATIC opening. Include imagePrompt for stunning abstract background.
### Slide 2: "split_content" - HOOK with surprising facts. MUST include imagePrompt.
### Slide 3: "quiz" - Test knowledge with a TRICKY question based on Slide 2.
### Slide 4: "timeline" - EXACTLY 4 events with real years and vivid descriptions.
### Slide 5: "scale" - THOUGHT-PROVOKING rating question that sparks reflection.
### Slide 6: "content" - DEEP DIVE with stories, examples, specific data.
### Slide 7: "yesno" - END with a PROVOCATIVE discussion question.
${effectiveSlideCount > 7 ? `### Additional slides: Mix of content, quiz, and engagement slides to reach ${effectiveSlideCount} total.` : ''}
`}

## CRITICAL IMAGE RULES
- ALL imagePrompt must describe images with NO TEXT, NO WORDS, NO LETTERS
- For title: subtle, abstract, soft backgrounds that evoke the topic mood
- For split_content: clear subject, professional style, emotionally resonant

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
// 13. AI API CALL (Gemini)
// =============================================================================

async function callAI(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const model = "gemini-2.5-flash";
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini API Error:", response.status, errorText);
    throw new Error(`AI Service Error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("").trim() || "";
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

    const model = "gemini-2.5-flash-image";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: enhancedPrompt }] }],
      }),
    });

    if (!response.ok) {
      console.error("Image generation failed:", response.status);
      return null;
    }

    const data = await response.json();
    const partWithImage = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData) || null;
    const inlineData = partWithImage?.inlineData;

    if (inlineData?.data) {
      const mimeType = inlineData.mimeType || "image/png";
      const dataUrl = `data:${mimeType};base64,${inlineData.data}`;
      console.log("✅ Image generated successfully");
      imageCache.set(cacheKey, dataUrl);
      return dataUrl;
    }

    console.warn("No image data returned from Gemini");
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
      console.error("[generate-slides] Auth failed:", authError || "No user");
      const message = authError && /expired|invalid|token/i.test(authError)
        ? "Session expired or invalid. Please sign out and sign in again, then try again."
        : (authError || "Unauthorized");
      return new Response(JSON.stringify({ error: message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log(`🔐 User: ${user.id}`);

    // Ensure user has a user_credits row (for OAuth users who might not have triggered handle_new_user_signup)
    const ensureResult = await ensureUserCredits(user.id);
    if (!ensureResult.ok) {
      console.error("[generate-slides] ensureUserCredits failed:", ensureResult.error);
      return new Response(
        JSON.stringify({ error: ensureResult.error || "Could not initialize credits" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const { description, targetAudience = "General Audience", slideCount = 8, singleSlide, skipImages = false } = body;

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
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

      // Check balance first (don't deduct until after success)
      const balanceCheck = await checkCreditsBalance(user.id, 1);
      if (!balanceCheck.allowed) {
        return new Response(
          JSON.stringify({ 
            error: balanceCheck.error || "Insufficient credits",
          }),
          { 
            status: 402, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }

      const systemPrompt = buildSingleSlidePrompt(type, prompt, style, includeImage);
      const rawContent = await callAI(
        GEMINI_API_KEY,
        systemPrompt,
        `Generate the JSON for a ${type} slide about: "${prompt}"`,
      );

      let rawSlide = cleanAndParseJSON(rawContent);
      if (Array.isArray(rawSlide) && rawSlide.length > 0) rawSlide = rawSlide[0];
      if (!rawSlide || typeof rawSlide !== "object") {
        throw new Error("Failed to parse slide from AI response");
      }

      rawSlide = validateAndFixSlide(rawSlide, 0, prompt);

      let generatedImageUrl: string | null = null;
      const slidesNeedingImages = ["title", "split_content", "poll", "wordcloud"];

      if (!skipImages && (includeImage || slidesNeedingImages.includes(type))) {
        const imagePromptText = rawSlide.imagePrompt || `Professional visual for ${type} slide about: ${prompt}`;
        generatedImageUrl = await generateImage(GEMINI_API_KEY, imagePromptText, type);
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

      // Deduct credits only after successful generation
      const creditResult = await consumeCredits(
        user.id,
        1,
        `Single slide generation: ${type}`
      );
      if (!creditResult.success) {
        console.error("[generate-slides] Failed to consume after single slide:", creditResult.error);
        return new Response(
          JSON.stringify({ error: creditResult.error || "Failed to deduct credits" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      await updateUsageStats(user.id, 1, false);

      console.log(`✅ Single slide generated: ${type}`);

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

    // Check balance first (don't deduct until after success)
    const creditsToConsume = slideCount;
    const balanceCheck = await checkCreditsBalance(user.id, creditsToConsume);
    if (!balanceCheck.allowed) {
      return new Response(
        JSON.stringify({ 
          error: balanceCheck.error || "Insufficient credits",
        }),
        { 
          status: 402, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const selectedTheme = selectThemeForTopic(description);
    console.log(`🎨 Selected theme: ${selectedTheme.name}`);

    const systemPrompt = buildInstructionalDesignPrompt(description, targetAudience, slideCount);
    const rawContent = await callAI(
      GEMINI_API_KEY,
      systemPrompt,
      `Create the JSON slides array for: "${description}".`,
    );

    console.log(`📝 Raw AI response length: ${rawContent.length} chars`);

    const parsed = cleanAndParseJSON(rawContent);
    let rawSlides = normalizeToSlidesArray(parsed) ?? (Array.isArray(parsed) ? parsed : null);

    if (!rawSlides || !rawSlides.length) {
      const what = parsed == null ? "null" : Array.isArray(parsed) ? `array(length=${parsed.length})` : typeof parsed;
      console.error("[generate-slides] Parse failed. Got:", what);
      console.error("[generate-slides] Raw preview (400 chars):", rawContent.substring(0, 400));
      throw new Error("Failed to parse slides from AI response. Please try again or use a shorter topic.");
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
          const imageUrl = await generateImage(GEMINI_API_KEY, slide.imagePrompt, slide.type);
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

    // Deduct credits only after successful generation
    const creditResult = await consumeCredits(
      user.id,
      creditsToConsume,
      `Presentation generation: ${mappedSlides.length} slides`
    );
    if (!creditResult.success) {
      console.error("[generate-slides] Failed to consume after full presentation:", creditResult.error);
      return new Response(
        JSON.stringify({ error: creditResult.error || "Failed to deduct credits" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    await updateUsageStats(user.id, mappedSlides.length, true);

    console.log(`🚀 Mapped ${mappedSlides.length} slides. Credits consumed: ${creditsToConsume}`);

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
    const errMsg = error?.message || String(error) || "Unknown error occurred";
    console.error("[generate-slides] Error:", errMsg, error?.stack ? "\n" + error.stack : "");
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
