import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireGeminiApiKey } from "../_shared/gemini-key.ts";

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

const INITIAL_FREE_CREDITS = 15;

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
  });
  if (error) {
    console.error("[generate-slides] Failed to create user_credits:", error);
    return { ok: false, error: "Could not create credits" };
  }
  console.log(`💳 Created user_credits for ${userId} with ${INITIAL_FREE_CREDITS} AI tokens`);
  return { ok: true };
}

/** Get user's subscription plan name (Free, Standard, Pro). */
async function getUserPlan(userId: string): Promise<{ planName: string; isPro: boolean }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceKey) return { planName: "Free", isPro: false };

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select("plan_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!sub?.plan_id) return { planName: "Free", isPro: false };

  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("name")
    .eq("id", sub.plan_id)
    .single();
  const planName = plan?.name || "Free";
  const isPro = planName === "Pro" || planName === "Standard";
  return { planName, isPro };
}

/** Get user's max slides for their plan (Free=5, Standard/Pro=higher). */
async function getUserMaxSlides(userId: string): Promise<number> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceKey) return 5;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select("plan_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!sub?.plan_id) return 5;

  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("max_slides")
    .eq("id", sub.plan_id)
    .single();
  const max = plan?.max_slides;
  return typeof max === "number" ? max : 5;
}

/** Get user AI settings for personalization (Pro/Standard). */
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

// WYSIWYG: Frontend only supports "minimal" | "dynamic" - must match exactly for Editor === Present
const DESIGN_STYLES = ["dynamic", "minimal"] as const;

function selectDesignStyle(slideType: string, slideIndex: number): "dynamic" | "minimal" {
  const typeStyles: Record<string, ("dynamic" | "minimal")[]> = {
    title: ["dynamic", "minimal"],
    split_content: ["dynamic", "minimal"],
    content: ["minimal", "dynamic"],
    quiz: ["dynamic", "minimal"],
    timeline: ["minimal", "dynamic"],
    scale: ["dynamic", "minimal"],
    yesno: ["dynamic", "minimal"],
    poll: ["dynamic", "minimal"],
    wordcloud: ["dynamic", "minimal"],
    bullet_points: ["minimal", "dynamic"],
    bar_chart: ["minimal", "dynamic"],
    ranking: ["dynamic", "minimal"],
    guess_number: ["dynamic", "minimal"],
    sentiment_meter: ["dynamic", "minimal"],
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
  let text = (rawContent || "").trim();
  if (!text) return null;

  // Extract from markdown code blocks
  const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    text = jsonBlockMatch[1].trim();
  }

  // Some models add preamble before the JSON - find start of array or object
  const arrayStart = text.indexOf("[");
  const objectStart = text.indexOf("{");
  const firstJson = arrayStart >= 0 && (objectStart < 0 || arrayStart <= objectStart)
    ? arrayStart
    : objectStart;
  if (firstJson > 0 && firstJson < 300) {
    text = text.slice(firstJson);
  }

  // Clean common JSON issues
  text = text
    .trim()
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/,(\s*[}\]])/g, "$1")
    .replace(/([\{\,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, (_, prefix, key) => `${prefix}"${key}":`);

  // Balance braces (helps with truncated responses)
  const openBraces = (text.match(/{/g) || []).length;
  const closeBraces = (text.match(/}/g) || []).length;
  const openBrackets = (text.match(/\[/g) || []).length;
  const closeBrackets = (text.match(/]/g) || []).length;
  if (openBraces > closeBraces) text += "}".repeat(openBraces - closeBraces);
  if (openBrackets > closeBrackets) text += "]".repeat(openBrackets - closeBrackets);

  try {
    return JSON.parse(text);
  } catch {
    // Fallback: extract outermost array
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch {}
    }
    // Fallback: extract outermost object
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {}
    }
    console.error("[generate-slides] JSON parse failed. Preview:", text.substring(0, 400));
    return null;
  }
}

/** Prefer strict JSON from model (responseSchema / responseMimeType); fall back to legacy cleanup. */
function parseModelJson(rawContent: string): any {
  const t = (rawContent || "").trim();
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    return cleanAndParseJSON(rawContent);
  }
}

/** Gemini structured output for plan phase (no thinking — schema enforces shape). */
const GEMINI_PLAN_RESPONSE_SCHEMA: Record<string, unknown> = {
  type: "OBJECT",
  properties: {
    interpretation: { type: "STRING" },
    plan: { type: "STRING" },
    slideTypes: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
  },
  required: ["interpretation", "plan", "slideTypes"],
};

/** Single-slide JSON shape (content is free-form object). */
const GEMINI_SINGLE_SLIDE_SCHEMA: Record<string, unknown> = {
  type: "OBJECT",
  properties: {
    type: { type: "STRING" },
    content: { type: "OBJECT" },
    imagePrompt: { type: "STRING", nullable: true },
  },
  required: ["type", "content"],
};

/** Prompt line: optimal count in band, capped by plan (not a rigid “exactly N”). */
function slideCountBandInstruction(maxSlidesAllowed: number): string {
  const hi = Math.min(12, Math.max(1, maxSlidesAllowed));
  const lo = Math.min(5, hi);
  if (hi <= 4) {
    return `Choose the optimal number of slides between 3 and ${hi} based on topic depth (at most ${hi}).`;
  }
  return `Choose the optimal number of slides between ${lo} and ${hi} based on topic depth (at most ${hi}).`;
}

/** Recursively search for slides array in nested objects. */
function findSlidesArray(obj: any, depth = 0): any[] | null {
  if (depth > 3) return null;
  if (Array.isArray(obj) && obj.length > 0) return obj;
  if (obj && typeof obj === "object") {
    for (const key of ["slides", "data", "content", "result", "presentation", "output"]) {
      const found = findSlidesArray(obj[key], depth + 1);
      if (found) return found;
    }
    // Single slide: { type, content }
    if (obj.type && obj.content && typeof obj.content === "object") return [obj];
  }
  return null;
}

/** If AI returned { "slides": [...] } or similar, extract the array. Handles single-slide object. */
function normalizeToSlidesArray(parsed: any): any[] | null {
  const found = findSlidesArray(parsed);
  if (found) return found;
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

    case "content":
      if (!fixedSlide.content.title) fixedSlide.content.title = "Content";
      if (!fixedSlide.content.text || !String(fixedSlide.content.text).trim()) {
        fixedSlide.content.text = topic ? `Key insight about ${topic}` : "Add your content here.";
      }
      break;

    case "bullet_points": {
      if (!fixedSlide.content.title) fixedSlide.content.title = "Key Points";
      const pts = fixedSlide.content.points || fixedSlide.content.items || [];
      const defPts = [
        { title: "Point 1", description: "Detail" },
        { title: "Point 2", description: "Detail" },
        { title: "Point 3", description: "Detail" },
      ];
      const hasEmpty = pts.length < 3 || pts.some((p: any) => !String((p?.title ?? p) || "").trim());
      fixedSlide.content.points = hasEmpty ? defPts : pts.slice(0, 6).map((p: any, i: number) => {
        const t = p?.title ?? p;
        const d = p?.description ?? "";
        return {
          title: (typeof t === "string" && t.trim()) ? t.trim() : defPts[Math.min(i, 2)].title,
          description: (typeof d === "string" && d.trim()) ? d.trim() : "",
        };
      });
      break;
    }

    case "bar_chart": {
      if (!fixedSlide.content.title) fixedSlide.content.title = "Data";
      const bars = fixedSlide.content.bars || fixedSlide.content.data || [];
      const defBars = [
        { label: "Item 1", value: 25 },
        { label: "Item 2", value: 50 },
        { label: "Item 3", value: 75 },
        { label: "Item 4", value: 100 },
      ];
      const barsHasEmpty = bars.length < 4 || bars.some((b: any) => !String(b?.label ?? b?.name ?? "").trim());
      fixedSlide.content.bars = barsHasEmpty ? defBars : bars.slice(0, 6).map((b: any, i: number) => ({
        label: (typeof (b?.label ?? b?.name) === "string" && String(b?.label ?? b?.name).trim())
          ? String(b?.label ?? b?.name).trim()
          : defBars[Math.min(i, 3)].label,
        value: typeof b?.value === "number" ? b.value : 50,
      }));
      break;
    }

    case "wordcloud":
      if (!fixedSlide.content.question || !String(fixedSlide.content.question).trim()) {
        fixedSlide.content.question = topic ? `What comes to mind when you think of ${topic}?` : "Share your thoughts...";
      }
      break;

    case "quiz": {
      if (!fixedSlide.content.question) fixedSlide.content.question = "Question?";
      const defOpts = ["Option A", "Option B", "Option C", "Option D"];
      const opts = fixedSlide.content.options || [];
      const hasEmpty = opts.length < 2 || opts.some((o: any) => !String(o || "").trim());
      fixedSlide.content.options = hasEmpty ? defOpts : opts.slice(0, 6).map((o: any, i: number) =>
        (typeof o === "string" && o.trim()) ? o.trim() : defOpts[Math.min(i, 3)],
      );
      if (typeof fixedSlide.content.correctAnswer !== "number") {
        fixedSlide.content.correctAnswer = 0;
      }
      fixedSlide.content.correctAnswer = Math.max(
        0,
        Math.min(fixedSlide.content.correctAnswer, fixedSlide.content.options.length - 1),
      );
      break;
    }

    case "finish_sentence":
      if (!fixedSlide.content.sentenceStart || !String(fixedSlide.content.sentenceStart).trim()) {
        fixedSlide.content.sentenceStart = "The best part of today was...";
      }
      if (!Array.isArray(fixedSlide.content.wordBankOptions)) {
        fixedSlide.content.wordBankOptions = [];
      }
      if (typeof fixedSlide.content.maxCharacters !== "number") {
        fixedSlide.content.maxCharacters = 100;
      }
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

    case "poll": {
      if (!fixedSlide.content.question) fixedSlide.content.question = "What do you think?";
      const pollDefOpts = ["Option 1", "Option 2", "Option 3", "Option 4"];
      const pollOpts = fixedSlide.content.options || [];
      const pollHasEmpty = pollOpts.length < 2 || pollOpts.some((o: any) => !String(o || "").trim());
      fixedSlide.content.options = pollHasEmpty ? pollDefOpts : pollOpts.slice(0, 6).map((o: any, i: number) =>
        (typeof o === "string" && o.trim()) ? o.trim() : pollDefOpts[Math.min(i, 3)],
      );
      break;
    }

    case "poll_quiz": {
      if (!fixedSlide.content.question) fixedSlide.content.question = "What do you think?";
      const pqDefOpts = ["Option 1", "Option 2", "Option 3", "Option 4"];
      const pqOpts = fixedSlide.content.options || [];
      const pqHasEmpty = pqOpts.length < 2 || pqOpts.some((o: any) => !String(o || "").trim());
      fixedSlide.content.options = pqHasEmpty ? pqDefOpts : pqOpts.slice(0, 6).map((o: any, i: number) =>
        (typeof o === "string" && o.trim()) ? o.trim() : pqDefOpts[Math.min(i, 3)],
      );
      if (typeof fixedSlide.content.correctAnswer !== "number") {
        fixedSlide.content.correctAnswer = 0;
      }
      fixedSlide.content.correctAnswer = Math.max(
        0,
        Math.min(fixedSlide.content.correctAnswer, fixedSlide.content.options.length - 1),
      );
      break;
    }

    case "yesno":
      if (!fixedSlide.content.question) fixedSlide.content.question = "Yes or No?";
      if (typeof fixedSlide.content.correctIsYes !== "boolean") {
        fixedSlide.content.correctIsYes = true;
      }
      break;

    case "ranking": {
      const defItems = ["Item 1", "Item 2", "Item 3", "Item 4"];
      const items = fixedSlide.content.items || [];
      const itemsHasEmpty = items.length < 2 || items.some((i: any) => !String(i || "").trim());
      fixedSlide.content.items = itemsHasEmpty ? defItems : items.slice(0, 6).map((i: any, idx: number) =>
        (typeof i === "string" && i.trim()) ? i.trim() : defItems[Math.min(idx, 3)],
      );
      if (!fixedSlide.content.question) fixedSlide.content.question = "Rank these items:";
      break;
    }

    case "guess_number":
      if (!fixedSlide.content.question) fixedSlide.content.question = "Guess the number!";
      if (typeof fixedSlide.content.correctNumber !== "number") fixedSlide.content.correctNumber = 50;
      if (typeof fixedSlide.content.min !== "number") fixedSlide.content.min = 0;
      if (typeof fixedSlide.content.max !== "number") fixedSlide.content.max = 100;
      break;

    case "sentiment_meter":
      if (!fixedSlide.content.question || !String(fixedSlide.content.question).trim()) {
        fixedSlide.content.question = "How do you feel about this?";
      }
      if (!fixedSlide.content.leftLabel) fixedSlide.content.leftLabel = "Not great";
      if (!fixedSlide.content.rightLabel) fixedSlide.content.rightLabel = "Amazing";
      break;

    case "agree_spectrum":
      if (!fixedSlide.content.statement) fixedSlide.content.statement = "I agree with this statement.";
      if (!fixedSlide.content.leftLabel) fixedSlide.content.leftLabel = "Disagree";
      if (!fixedSlide.content.rightLabel) fixedSlide.content.rightLabel = "Agree";
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
  const direction: "ltr" | "rtl" = detectedLanguage === "hebrew" ? "rtl" : "ltr";

  // *** KEY CHANGE: Dynamic gradient per slide ***
  const gradientPreset = selectGradientForSlide(rawSlide.type, index, theme);
  const designStyle = selectDesignStyle(rawSlide.type, index);

  // WYSIWYG: textColor must suit theme - light themes (soft-pop) need dark text for visibility
  const isLightTheme = theme.id === "soft-pop";
  const textColor = isLightTheme ? "#1f2937" : "#ffffff";

  const baseDesign: Record<string, any> = {
    gradientPreset,
    textColor,
    fontFamily: theme.font,
    fontSize: "medium",
    textAlign,
    direction,
    themeId: theme.id,
    designStyleId: designStyle,
  };

  const baseActivitySettings = {
    // Default interactive timer should match frontend defaults (20s). `0` is special-cased as "Off".
    duration: 20,
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
    agreeSpectrum: "agree_spectrum",
    agree_spectrum: "agree_spectrum",
    finishSentence: "finish_sentence",
    finish_sentence: "finish_sentence",
    poll_quiz: "poll_quiz",
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
        imagePrompt: rawSlide.imagePrompt || "",
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
        ...(imageUrl ? { imageUrl } : {}),
        imagePosition: detectedLanguage === "hebrew" ? "left" : "right",
        imagePrompt: rawSlide.imagePrompt || "",
      };
      break;

    case "content": {
      const contentText = rawSlide.content.text;
      const textVal = (typeof contentText === "string" && contentText.trim())
        ? contentText.trim()
        : (topic ? `Key insight about ${topic}.` : "Add your content here.");
      mappedContent = {
        title: rawSlide.content.title || "Content",
        text: textVal,
      };
      break;
    }

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

    case "bullet_points": {
      const defPtsMap = [
        { title: "Point 1", description: "Detail" },
        { title: "Point 2", description: "Detail" },
        { title: "Point 3", description: "Detail" },
      ];
      const rawPts = (rawSlide.content.points || rawSlide.content.items || []).slice(0, 6);
      const pts = rawPts.length >= 3 ? rawPts : defPtsMap;
      mappedContent = {
        title: rawSlide.content.title || "Key Points",
        points: pts.map((p: any, i: number) => {
          const t = typeof p === "string" ? p : (p?.title ?? p);
          const d = typeof p === "object" && p?.description != null ? p.description : "";
          return {
            title: (typeof t === "string" && t.trim()) ? t.trim() : defPtsMap[Math.min(i, 2)].title,
            description: (typeof d === "string" && d.trim()) ? d.trim() : "",
          };
        }),
      };
      break;
    }

    case "bar_chart": {
      const defBarsMap = [
        { label: "Item 1", value: 25 },
        { label: "Item 2", value: 50 },
        { label: "Item 3", value: 75 },
        { label: "Item 4", value: 100 },
      ];
      const rawBars = (rawSlide.content.bars || rawSlide.content.data || []).slice(0, 6);
      const bars = rawBars.length >= 4 ? rawBars : defBarsMap;
      mappedContent = {
        title: rawSlide.content.title || "Data",
        subtitle: rawSlide.content.subtitle || "",
        bars: bars.map((b: any, i: number) => ({
          label: (typeof (b?.label ?? b?.name) === "string" && String(b?.label ?? b?.name).trim())
            ? String(b?.label ?? b?.name).trim()
            : defBarsMap[Math.min(i, 3)].label,
          value: typeof b?.value === "number" ? b.value : 50,
        })),
      };
      break;
    }

    case "quiz": {
      const quizDef = ["Option A", "Option B", "Option C", "Option D"];
      const quizOpts = (rawSlide.content.options || quizDef).slice(0, 6).map((o: any, i: number) =>
        (typeof o === "string" && String(o).trim()) ? String(o).trim() : quizDef[Math.min(i, 3)],
      );
      mappedContent = {
        question: rawSlide.content.question || "Question?",
        options: quizOpts.length >= 2 ? quizOpts : quizDef,
        correctAnswer: typeof rawSlide.content.correctAnswer === "number" ? rawSlide.content.correctAnswer : 0,
      };
      break;
    }

    case "poll": {
      const pollDef = ["Option 1", "Option 2", "Option 3", "Option 4"];
      const pollOpts = (rawSlide.content.options || pollDef).slice(0, 6).map((o: any, i: number) =>
        (typeof o === "string" && String(o).trim()) ? String(o).trim() : pollDef[Math.min(i, 3)],
      );
      mappedContent = {
        question: rawSlide.content.question || "What do you think?",
        options: pollOpts.length >= 2 ? pollOpts : pollDef,
      };
      if (imageUrl) {
        baseDesign.overlayImageUrl = imageUrl;
        baseDesign.overlayImagePosition = "background";
      }
      break;
    }

    case "wordcloud": {
      const wcQ = rawSlide.content.question;
      mappedContent = {
        question: (typeof wcQ === "string" && wcQ.trim())
          ? wcQ.trim()
          : (topic ? `What comes to mind when you think of ${topic}?` : "Share your thoughts..."),
      };
      if (imageUrl) {
        baseDesign.overlayImageUrl = imageUrl;
        baseDesign.overlayImagePosition = "background";
      }
      break;
    }

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

    case "ranking": {
      const rankDef = ["Item 1", "Item 2", "Item 3", "Item 4"];
      const rankItems = (rawSlide.content.items || rankDef).slice(0, 6).map((i: any, idx: number) =>
        (typeof i === "string" && String(i).trim()) ? String(i).trim() : rankDef[Math.min(idx, 3)],
      );
      mappedContent = {
        question: rawSlide.content.question || "Rank these items:",
        items: rankItems.length >= 2 ? rankItems : rankDef,
      };
      break;
    }

    case "guess_number":
      mappedContent = {
        question: rawSlide.content.question || "Guess the number!",
        correctNumber: rawSlide.content.correctNumber || 50,
        minRange: rawSlide.content.min || 0,
        maxRange: rawSlide.content.max || 100,
      };
      break;

    case "finish_sentence":
      mappedContent = {
        sentenceStart: rawSlide.content.sentenceStart || "Complete the sentence...",
        wordBankOptions: Array.isArray(rawSlide.content.wordBankOptions) ? rawSlide.content.wordBankOptions : [],
        maxCharacters: typeof rawSlide.content.maxCharacters === "number" ? rawSlide.content.maxCharacters : 100,
      };
      break;

    case "agree_spectrum":
      mappedContent = {
        statement: (rawSlide.content.statement && String(rawSlide.content.statement).trim())
          ? String(rawSlide.content.statement).trim()
          : "I agree with this statement.",
        leftLabel: rawSlide.content.leftLabel || "Strongly Disagree",
        rightLabel: rawSlide.content.rightLabel || "Strongly Agree",
      };
      break;

    case "poll_quiz": {
      const pqDef = ["Option 1", "Option 2", "Option 3", "Option 4"];
      const pqOpts = (rawSlide.content.options || pqDef).slice(0, 6).map((o: any, i: number) =>
        (typeof o === "string" && String(o).trim()) ? String(o).trim() : pqDef[Math.min(i, 3)],
      );
      mappedContent = {
        question: rawSlide.content.question || "What do you think?",
        options: pqOpts.length >= 2 ? pqOpts : pqDef,
        correctAnswer: typeof rawSlide.content.correctAnswer === "number"
          ? Math.min(rawSlide.content.correctAnswer, (pqOpts.length || pqDef.length) - 1)
          : 0,
      };
      break;
    }

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

const SLIDE_TYPE_SCHEMA = `
## REQUIRED CONTENT PER SLIDE TYPE (NEVER OMIT)
- **title**: title, subtitle. Optional imagePrompt.
- **split_content**: title, text (or bulletPoints). 3-4 bullets max.
- **content**: title, text. Short paragraph.
- **timeline**: title, events (4 items: year, title, description each).
- **bullet_points**: title, points (3-5 items: {title, description} each).
- **bar_chart**: title, bars (4-6 items: {label, value} each).
- **quiz**: question, options (4 non-empty strings), correctAnswer (0-3).
- **poll**: question, options (4 non-empty strings).
- **wordcloud**: question.
- **scale**: question, minLabel, maxLabel.
- **yesno**: question, correctIsYes.
- **ranking**: question, items (4 non-empty strings).
- **guess_number**: question, correctNumber, min, max.
- **finish_sentence**: sentenceStart (required). Optional wordBankOptions.
- **sentiment_meter**: question.
- **agree_spectrum**: statement, leftLabel, rightLabel.

CRITICAL: Never return a slide with missing or empty required fields. If unsure, use sensible topic-related defaults. Never leave options[], items[], events[], points[], bars[] empty.
`;

const CLEAN_READABLE_PRINCIPLE = `
## DESIGN PRINCIPLE - CLEAN & READABLE
- One main idea per slide. Avoid cramming.
- Prefer fewer, stronger points over many weak ones (3-4 bullet points max, not 6).
- Leave breathing room - short text that fits on screen without overflow.
- Titles: short and punchy (under 10 words when possible).
- Bullet points: one line each, avoid nesting or long paragraphs.
- Clear and readable over dense and overwhelming.
`;

function buildInstructionalDesignPrompt(description: string, audience: string, slideCount: number): string {
  const effectiveSlideCount = Math.min(Math.max(slideCount, 3), 10);
  const band = slideCountBandInstruction(effectiveSlideCount);

  return `
You are a world-class Instructional Designer and Presentation Architect.
Your goal: create a clear, memorable presentation that engages the audience without overwhelming them.

## YOUR TASK
${band}
Create an interactive presentation about: "${description}"
Target Audience: ${audience}
${CLEAN_READABLE_PRINCIPLE}

## CONTENT QUALITY STANDARDS
- Titles: clear and compelling, short (under 10 words when possible). Never generic.
- Bullet points: specific facts and actionable insights. 3-4 strong points per slide, not 6.
- Quiz: thought-provoking, plausible distractors. Exactly 4 non-empty options.
- Timeline: 4 events with specific years and clear descriptions.
- Scale/YesNo: spark reflection. Keep labels short.
- Write clearly: hook, build, reflect. Avoid cramming.

## LANGUAGE DETECTION (CRITICAL)
- If the topic is in Hebrew → ALL content MUST be in Hebrew (natural, fluent Hebrew)
- If the topic is in English → ALL content MUST be in English
- Never mix languages

## AVAILABLE SLIDE TYPES

### CATEGORY A: CONTENT (Teaching)
1. "title" → Opening slide - Make it CINEMATIC. A title that makes people lean forward.
   { "type": "title", "content": { "title": "Bold compelling title", "subtitle": "Intriguing subtitle that creates curiosity" }, "imagePrompt": "Visual description (NO TEXT IN IMAGE)..." }

2. "split_content" → Visual + Text - MUST include imagePrompt! 3-4 concise bullets.
   { "type": "split_content", "content": { "title": "Section title", "text": "Key insight 1\\nKey insight 2\\nKey insight 3" }, "imagePrompt": "Visual description (NO TEXT IN IMAGE)..." }

3. "content" → Focused text - One main idea. Keep it short and clear.
   { "type": "content", "content": { "title": "Title", "text": "Brief, clear explanation with key points..." } }

4. "timeline" → EXACTLY 4 events with specific years and clear descriptions
   { "type": "timeline", "content": { "title": "The Journey of...", "events": [{ "year": "2020", "title": "Event title", "description": "Clear description" }, ...4 events] } }

### CATEGORY B: ENGAGEMENT (Interactive)
5. "scale" → Rating scale - ask something that makes people THINK
   { "type": "scale", "content": { "question": "Thought-provoking rating question?", "minLabel": "Label", "maxLabel": "Label" } }

6. "yesno" → Yes/No question - something DEBATABLE, not obvious
   { "type": "yesno", "content": { "question": "Provocative yes/no question that sparks discussion?" } }

### CATEGORY C: COMPETITION (Quiz)
7. "quiz" → Multiple choice - make it CHALLENGING and EDUCATIONAL
   { "type": "quiz", "content": { "question": "Non-obvious question that teaches something?", "options": ["Plausible A", "Plausible B", "Correct C", "Plausible D"], "correctAnswer": 2 } }

## SLIDE STRUCTURE (flexible count within band — use a strong arc: hook → teach → engage → close)

${effectiveSlideCount <= 5 ? `
### Example arc for shorter decks (compact format):
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
${effectiveSlideCount > 7 ? `### Additional slides: Mix of content, quiz, and engagement as needed (stay within the band).` : ''}
`}

## CRITICAL IMAGE RULES
- ALL imagePrompt must describe images with NO TEXT, NO WORDS, NO LETTERS
- For title: subtle, abstract, soft backgrounds that evoke the topic mood
- For split_content: clear subject, professional style, emotionally resonant

## CONCISE CONTENT
- Quiz/Poll: 4 options, SHORT (1-2 lines). Each must be non-empty.
- Content: Keep text brief. 3-4 bullet points max per slide.
- Scale labels, ranking items: Keep short.
${SLIDE_TYPE_SCHEMA}

## OUTPUT FORMAT (CRITICAL)
Return a single JSON object (no markdown, no code blocks):
{
  "interpretation": "1-2 sentences: what you understood from the request and the learning goals",
  "plan": "Brief plan: what each slide will cover (2-4 sentences)",
  "slides": [
    {"type":"...","content":{...},"imagePrompt":"..." optional},
    ...one object per slide (count within the band above, never more than ${effectiveSlideCount})
  ]
}
- Valid JSON only - no trailing commas, all keys in double quotes
- interpretation and plan help the user see your reasoning BEFORE the slides
`;
}

// =============================================================================
// 10b. PRO AI: DYNAMIC INSTRUCTIONAL DESIGN (no fixed structure)
// =============================================================================

function buildProInstructionalDesignPrompt(
  description: string,
  audience: string,
  slideCount: number,
  userAiSettings: { who_am_i?: string; what_i_lecture?: string; teaching_style?: string; additional_context?: string } | null,
  difficulty = "intermediate",
): string {
  const effectiveSlideCount = Math.min(Math.max(slideCount, 3), 12);
  const band = slideCountBandInstruction(effectiveSlideCount);
  const difficultyNote =
    difficulty === "beginner"
      ? "Use simpler language and more accessible content depth."
      : difficulty === "advanced"
        ? "Use deeper, more nuanced content and challenging questions."
        : "Balance between accessible and thought-provoking.";
  const userContext = userAiSettings
    ? [
        userAiSettings.who_am_i && `Instructor profile: ${userAiSettings.who_am_i}`,
        userAiSettings.what_i_lecture && `Typically lectures on: ${userAiSettings.what_i_lecture}`,
        userAiSettings.teaching_style && `Teaching style: ${userAiSettings.teaching_style}`,
        userAiSettings.additional_context && `Additional context: ${userAiSettings.additional_context}`,
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  return `
You are a world-class Instructional Designer and Presentation Architect. Your goal: create a presentation that perfectly matches the user's request—clear, readable, and complete.

## USER REQUEST
"${description}"
Target Audience: ${audience}
Difficulty: ${difficulty}. ${difficultyNote}
${userContext ? `\n## INSTRUCTOR CONTEXT (use to personalize)\n${userContext}\n` : ""}
${CLEAN_READABLE_PRINCIPLE}

## YOUR TASK
1. DEEP REASONING: Analyze the request. What does the user want? Match content vs interactive mix (e.g. 100% interactive, 70/30, or mostly content).
2. CHOOSE SLIDE TYPES DYNAMICALLY: Select optimal types. Types: title, split_content, content, timeline, bullet_points, bar_chart, quiz, poll, wordcloud, scale, yesno, ranking, guess_number, sentiment_meter, agree_spectrum, finish_sentence
3. For technical topics: LaTeX ($...$), precise definitions when needed.
4. ${band}

## CONTENT QUALITY
- Titles: clear, short (under 10 words when possible)
- Bullet points: 3-4 strong points per slide, not 6. One line each.
- Quiz: educational, 4 plausible options. Always non-empty.
- Content: brief, readable. Avoid long paragraphs.

## LANGUAGE
- If topic is in Hebrew → ALL content in Hebrew
- If topic is in English → ALL content in English

## IMAGE RULES
- imagePrompt: NO TEXT, NO WORDS in images. Describe visuals only.
${SLIDE_TYPE_SCHEMA}

## CONCISE CONTENT
- Quiz/Poll: exactly 4 non-empty options. Short (1-2 lines).
- EVERY option/item/choice MUST have real text. NEVER leave empty. Finish_sentence: always sentenceStart.

## OUTPUT FORMAT (CRITICAL)
Return a single JSON object (no markdown, no code blocks):
{
  "interpretation": "1-2 sentences: what you understood from the request and the learning goals",
  "plan": "Brief plan: what each slide will cover and why (2-4 sentences total)",
  "slides": [
    { "type": "title", "content": { "title": "...", "subtitle": "..." }, "imagePrompt": "..." },
    { "type": "split_content", "content": { "title": "...", "text": "..." }, "imagePrompt": "..." },
    ...one per slide (within the band; cap at ${effectiveSlideCount})
  ]
}

Valid JSON only. Each slide must have "type" and "content". Add "imagePrompt" for title, split_content, poll, wordcloud.
`;
}

function buildInteractiveOnlyPrompt(
  description: string,
  slideCount: number,
  difficulty: string,
  userAiSettings: { who_am_i?: string; what_i_lecture?: string; teaching_style?: string; additional_context?: string } | null
): string {
  const effectiveSlideCount = Math.min(Math.max(slideCount, 3), 12);
  const band = slideCountBandInstruction(effectiveSlideCount);
  const difficultyNote =
    difficulty === "beginner"
      ? "Use simple, accessible questions. Avoid jargon."
      : difficulty === "advanced"
        ? "Use challenging questions. Deeper, nuanced options."
        : "Balance between accessible and thought-provoking.";

  const userContext = userAiSettings
    ? [
        userAiSettings.who_am_i && `Instructor profile: ${userAiSettings.who_am_i}`,
        userAiSettings.what_i_lecture && `Typically lectures on: ${userAiSettings.what_i_lecture}`,
        userAiSettings.teaching_style && `Teaching style: ${userAiSettings.teaching_style}`,
        userAiSettings.additional_context && `Additional context: ${userAiSettings.additional_context}`,
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  return `
You are a world-class Instructional Designer. Create an INTERACTIVE-ONLY presentation: one title slide + all remaining slides are engagement/quiz slides.

## USER REQUEST
"${description}"
${userContext ? `\n## INSTRUCTOR CONTEXT\n${userContext}\n` : ""}
Difficulty level: ${difficulty}. ${difficultyNote}
${CLEAN_READABLE_PRINCIPLE}

## MANDATORY STRUCTURE
${band}
- Slide 1: "title" - CINEMATIC opening. Include imagePrompt for stunning background.
- Following slides: Use a DIVERSE mix of these types (at least one of each per round if possible); total slides within the band above (cap ${effectiveSlideCount}):
  - poll: question + options (3-4 non-empty strings)
  - quiz: question + options (3-4 non-empty strings) + correctAnswer (index 0-3)
  - yesno: question + correctIsYes (boolean)
  - sentiment_meter: question (optional leftLabel, rightLabel)
  - agree_spectrum: statement (required) + leftLabel + rightLabel
  - scale: question + minLabel + maxLabel
  - wordcloud: question
  - finish_sentence: sentenceStart (required) + optional wordBankOptions
  - poll_quiz: like poll but with correctAnswer (index)

## REQUIRED FIELDS
- agree_spectrum: MUST have statement (non-empty), leftLabel, rightLabel
- poll/quiz/poll_quiz: question + options array (2-4 items), each non-empty. correctAnswer in range for quiz/poll_quiz
- yesno: correctAnswer = boolean (true=Yes correct). Frontend uses correctAnswer not correctIsYes for yesno—map correctIsYes to correctAnswer
- sentiment_meter: question required; leftLabel/rightLabel optional
- wordcloud, finish_sentence: question/sentenceStart required

## LANGUAGE
- If topic in Hebrew → ALL content in Hebrew
- If topic in English → ALL content in English

${SLIDE_TYPE_SCHEMA}

## OUTPUT FORMAT (CRITICAL)
{
  "interpretation": "1-2 sentences: what you understood",
  "plan": "Brief plan (2-4 sentences)",
  "slides": [
    { "type": "title", "content": { "title": "...", "subtitle": "..." }, "imagePrompt": "..." },
    { "type": "poll", "content": { "question": "...", "options": ["A","B","C","D"] } },
    { "type": "quiz", "content": { "question": "...", "options": ["A","B","C","D"], "correctAnswer": 2 } },
    { "type": "agree_spectrum", "content": { "statement": "I agree that...", "leftLabel": "Disagree", "rightLabel": "Agree" } },
    ...one per slide within the band (at most ${effectiveSlideCount})
  ]
}
Valid JSON only. Add "imagePrompt" for title, poll, wordcloud when appropriate.
`;
}

function buildInteractiveOnlyPlanPrompt(
  description: string,
  slideCount: number,
  difficulty: string,
  userAiSettings: { who_am_i?: string; what_i_lecture?: string; teaching_style?: string; additional_context?: string } | null
): string {
  const effectiveSlideCount = Math.min(Math.max(slideCount, 3), 12);
  const band = slideCountBandInstruction(effectiveSlideCount);
  const userContext = userAiSettings
    ? [
        userAiSettings.who_am_i && `Instructor profile: ${userAiSettings.who_am_i}`,
        userAiSettings.what_i_lecture && `Typically lectures on: ${userAiSettings.what_i_lecture}`,
        userAiSettings.teaching_style && `Teaching style: ${userAiSettings.teaching_style}`,
        userAiSettings.additional_context && `Additional context: ${userAiSettings.additional_context}`,
      ]
        .filter(Boolean)
        .join("\n")
    : "";
  return `
You are a world-class Instructional Designer.

The user chose **INTERACTIVE ONLY**. You MUST return slideTypes that are:
- Slide 1: "title"
- Remaining slots: ONLY from these interactive types:
  poll, quiz, poll_quiz, yesno, wordcloud, scale, ranking, guess_number, sentiment_meter, agree_spectrum, finish_sentence
${band}
Return slideTypes array length within that band (at most ${effectiveSlideCount} items total).

Do NOT include content, split_content, timeline, bullet_points, or bar_chart.

## USER REQUEST
"${description}"
${userContext ? `\n## INSTRUCTOR CONTEXT\n${userContext}\n` : ""}
Difficulty: ${difficulty}

## OUTPUT (JSON only)
{
  "interpretation": "1-2 sentences: what you understood",
  "plan": "Brief plan (2-4 sentences)",
  "slideTypes": ["title", "poll", "quiz", ...]
}
`;
}

const INTERACTIVE_ONLY_SLIDE_TYPES = new Set([
  "poll",
  "quiz",
  "poll_quiz",
  "yesno",
  "wordcloud",
  "scale",
  "ranking",
  "guess_number",
  "sentiment_meter",
  "agree_spectrum",
  "finish_sentence",
]);

function enforceInteractiveOnlySlideTypes(slideTypes: string[], count: number): string[] {
  const effectiveCount = Math.min(Math.max(count, 3), 12);
  const out: string[] = [];
  out.push("title");
  const desired = slideTypes.filter((t) => typeof t === "string").map((t) => t.trim());
  for (const t of desired) {
    if (out.length >= effectiveCount) break;
    if (out.length === 1 && t === "title") continue;
    out.push(INTERACTIVE_ONLY_SLIDE_TYPES.has(t) ? t : "poll");
  }
  const fallbackSeq = ["poll", "quiz", "scale", "wordcloud", "yesno", "agree_spectrum", "ranking", "sentiment_meter", "finish_sentence", "poll_quiz"];
  let i = 0;
  while (out.length < effectiveCount) {
    out.push(fallbackSeq[i % fallbackSeq.length]);
    i++;
  }
  return out.slice(0, effectiveCount);
}

function enforceInteractiveOnlySlides(rawSlides: any[], slideCount: number): any[] {
  const desiredCount = Math.min(Math.max(slideCount, 3), 12);
  const result: any[] = [];
  for (let i = 0; i < rawSlides.length && result.length < desiredCount; i++) {
    const s = rawSlides[i] || {};
    const t = String(s.type || "").trim();
    if (result.length === 0) {
      // First slide must be title; if not, coerce to title-ish.
      result.push(t === "title" ? s : { type: "title", content: { title: s?.content?.title || "Title", subtitle: s?.content?.subtitle || "" }, imagePrompt: s?.imagePrompt });
      continue;
    }
    if (INTERACTIVE_ONLY_SLIDE_TYPES.has(t)) {
      result.push(s);
    } else {
      // Coerce non-interactive slide into a poll to guarantee interactive-only output.
      const topic = (s?.content?.title || s?.content?.question || "").toString().trim();
      result.push({
        type: "poll",
        content: {
          question: topic ? `Quick check: ${topic}?` : "Quick check: what do you think?",
          options: ["Option A", "Option B", "Option C", "Option D"],
        },
      });
    }
  }
  // Pad if AI returned too few slides
  while (result.length < desiredCount) {
    result.push({
      type: "poll",
      content: { question: "Quick check: which option best fits?", options: ["A", "B", "C", "D"] },
    });
  }
  return result;
}

function buildProPlanOnlyPrompt(
  description: string,
  audience: string,
  slideCount: number,
  userAiSettings: { who_am_i?: string; what_i_lecture?: string; teaching_style?: string; additional_context?: string } | null
): string {
  const effectiveSlideCount = Math.min(Math.max(slideCount, 3), 12);
  const band = slideCountBandInstruction(effectiveSlideCount);
  const userContext = userAiSettings
    ? [
        userAiSettings.who_am_i && `Instructor profile: ${userAiSettings.who_am_i}`,
        userAiSettings.what_i_lecture && `Typically lectures on: ${userAiSettings.what_i_lecture}`,
        userAiSettings.teaching_style && `Teaching style: ${userAiSettings.teaching_style}`,
        userAiSettings.additional_context && `Additional context: ${userAiSettings.additional_context}`,
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  return `
You are a world-class Instructional Designer. Analyze the user's request and create a plan—NO slide content yet.

## USER REQUEST
"${description}"
Target Audience: ${audience}
${userContext ? `\n## INSTRUCTOR CONTEXT\n${userContext}\n` : ""}

## YOUR TASK
1. DEEP REASONING: What does the user REALLY want? What learning goals? Adapt the mix: 100% interactive (poll/quiz/scale), 70% interactive 30% content, or mostly content (timeline/content)—based on the request.
2. CHOOSE SLIDE TYPES DYNAMICALLY: Select optimal types and order. Do NOT use a fixed template.
   Types: title, split_content, content, timeline, bullet_points, bar_chart, quiz, poll, wordcloud, scale, yesno, ranking, guess_number, sentiment_meter, agree_spectrum, finish_sentence
3. ${band} Return one entry in slideTypes per slide (at most ${effectiveSlideCount}).

## OUTPUT FORMAT (JSON only, no markdown)
{
  "interpretation": "1-2 sentences: what you understood and the learning goals",
  "plan": "Brief plan: what each slide will cover and why (2-4 sentences)",
  "slideTypes": ["title", "split_content", "quiz", ...]
}
`;
}

function buildProSlidesFromPlanPrompt(
  description: string,
  interpretation: string,
  plan: string,
  slideTypes: string[]
): string {
  const slidesSpec = slideTypes.map((t, i) => `Slide ${i + 1}: ${t}`).join("\n");
  return `
You are a presentation content creator. Generate the full slide content based on this plan.
${CLEAN_READABLE_PRINCIPLE}

## ORIGINAL REQUEST
"${description}"

## INTERPRETATION
${interpretation}

## PLAN
${plan}

## SLIDE TYPES (in order)
${slidesSpec}
${SLIDE_TYPE_SCHEMA}

## REQUIRED FIELDS CHECKLIST - BEFORE RETURNING
For each slide, verify: quiz→question+options(4)+correctAnswer; poll→question+options(4); finish_sentence→sentenceStart; timeline→title+events(4); bullet_points→title+points(3-5); bar_chart→title+bars(4-6); ranking→question+items(4); content→title+text; wordcloud→question; etc.
Empty = failure. Use topic-relevant defaults if unsure.

## OUTPUT
Return a JSON array of ${slideTypes.length} slides. Each: {"type":"...","content":{...},"imagePrompt":"..." when needed}
Types must match the plan. Every slide MUST have ALL required fields filled. Language: match request. NO TEXT in images.
`;
}

// =============================================================================
// 11. SINGLE SLIDE GENERATION PROMPT (UPGRADED)
// =============================================================================

function buildSingleSlidePrompt(slideType: string, prompt: string, style: string, includeImage: boolean): string {
  const typeInstructions: Record<string, string> = {
    title: `Generate a "title" slide with a CINEMATIC, compelling title. Output: { "type": "title", "content": { "title": "Bold compelling title", "subtitle": "Intriguing subtitle" }, "imagePrompt": "Visual description NO TEXT..." }`,
    split_content: `Generate a "split_content" slide with 3-5 CONCISE bullet points. Each bullet short - specific facts, surprising stats, or actionable insights. Output: { "type": "split_content", "content": { "title": "Engaging title", "text": "Short insight 1\\nShort detail 2\\nShort takeaway 3" }, "imagePrompt": "Visual NO TEXT..." }`,
    content: `Generate a "content" slide. Engaging but CONCISE - avoid long paragraphs. Keep text brief. Output: { "type": "content", "content": { "title": "Compelling title", "text": "Brief engaging explanation..." } }`,
    timeline: `Generate a "timeline" slide with 3-5 events. Use SPECIFIC years and vivid details. Output: { "type": "timeline", "content": { "title": "The Journey of...", "events": [{ "year": "2020", "title": "Turning Point", "description": "Vivid details..." }, ...] } }`,
    bullet_points: `Generate a "bullet_points" slide with 4-6 points. Keep titles and descriptions SHORT and insightful. Output: { "type": "bullet_points", "content": { "title": "...", "points": [{ "title": "Short", "description": "Short detail" }, ...] } }`,
    bar_chart: `Generate a "bar_chart" slide with 4-6 bars using realistic data. Labels MUST be SHORT. Output: { "type": "bar_chart", "content": { "title": "...", "subtitle": "...", "bars": [{ "label": "Short", "value": 75 }, ...] } }`,
    quiz: `Generate a "quiz" slide. Make it CHALLENGING - all options plausible. Options MUST be SHORT (1-2 lines max). Output: { "type": "quiz", "content": { "question": "Non-obvious question?", "options": ["Short A", "Short B", "Short C", "Short D"], "correctAnswer": 2 } }`,
    poll: `Generate a "poll" slide with 4 thought-provoking options. Options MUST be SHORT (1-2 lines max). Output: { "type": "poll", "content": { "question": "Engaging question?", "options": ["Short A", "Short B", "Short C", "Short D"] }, "imagePrompt": "Abstract background NO TEXT..." }`,
    wordcloud: `Generate a "wordcloud" slide. Output: { "type": "wordcloud", "content": { "question": "Open-ended engaging question..." }, "imagePrompt": "Abstract background NO TEXT..." }`,
    scale: `Generate a "scale" slide. Ask something that makes people THINK. minLabel and maxLabel MUST be SHORT. Output: { "type": "scale", "content": { "question": "Thought-provoking question?", "minLabel": "Short", "maxLabel": "Short" } }`,
    sentiment_meter: `Generate a "sentiment_meter" slide. Output: { "type": "sentiment_meter", "content": { "question": "How do you feel about...?" } }`,
    yesno: `Generate a "yesno" slide. Make it DEBATABLE, not obvious. Output: { "type": "yesno", "content": { "question": "Provocative question?", "correctIsYes": true } }`,
    ranking: `Generate a "ranking" slide with 4 items. Items MUST be SHORT (1-2 lines max). Output: { "type": "ranking", "content": { "question": "Rank these...", "items": ["Short A", "Short B", "Short C", "Short D"] } }`,
    guess_number: `Generate a "guess_number" slide with a surprising answer. Output: { "type": "guess_number", "content": { "question": "Surprising number question?", "correctNumber": 42, "min": 0, "max": 100 } }`,
    finish_sentence: `Generate a "finish_sentence" slide. REQUIRED: sentenceStart with a compelling incomplete sentence for participants to complete. Optional: wordBankOptions array for word-bank variant. Output: { "type": "finish_sentence", "content": { "sentenceStart": "Complete this thought-provoking sentence...", "wordBankOptions": ["option1", "option2", "option3", "option4"] } }`,
    agree_spectrum: `Generate an "agree_spectrum" slide. REQUIRED: statement (provocative or debatable claim), leftLabel, rightLabel (e.g. Disagree/Agree). Output: { "type": "agree_spectrum", "content": { "statement": "Debatable statement?", "leftLabel": "Disagree", "rightLabel": "Agree" } }`,
  };

  const instruction = typeInstructions[slideType] || typeInstructions.content;

  return `You are an expert content creator who creates COMPELLING, MEMORABLE content.

Topic: "${prompt}"
Style: ${style}
Type: ${slideType}
${CLEAN_READABLE_PRINCIPLE}

## LANGUAGE: Match the topic language (Hebrew→Hebrew, English→English)

## CONTENT QUALITY
- Titles must be COMPELLING - use power words, questions, or bold statements
- Content must deliver REAL VALUE - specific facts, surprising stats, actionable insights
- Write like a storyteller, not a textbook

## REQUIRED FIELDS - ZERO TOLERANCE
Output MUST include every required field for this slide type. Never omit:
- quiz/poll: question + options (4 non-empty) + correctAnswer for quiz
- finish_sentence: sentenceStart (incomplete sentence)
- timeline: title + events (4 items with year, title, description)
- bullet_points: title + points (3-5 with title, description)
- bar_chart: title + bars (4-6 with label, value)
- ranking: question + items (4 non-empty)
- content: title + text (non-empty)
- wordcloud/scale/yesno/sentiment_meter: question
- agree_spectrum: statement, leftLabel, rightLabel
Empty or missing = failure. Use topic-relevant defaults if unsure.

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

type CallAiOptions = {
  responseSchema?: Record<string, unknown>;
  maxOutputTokens?: number;
};

async function callAI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  options?: CallAiOptions,
): Promise<string> {
  const model = "gemini-2.5-flash";
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const generationConfig: Record<string, unknown> = {
    temperature: 0.7,
    maxOutputTokens: options?.maxOutputTokens ?? 8192,
    responseMimeType: "application/json",
  };
  if (options?.responseSchema) {
    generationConfig.responseSchema = options.responseSchema;
  }

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
      generationConfig,
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

/** Pro AI: Call Gemini with thinking/reasoning for deeper analysis. */
async function callAIWithThinking(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const model = "gemini-2.5-flash";
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body: Record<string, unknown> = {
    contents: [
      {
        role: "user",
        parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 16384,
      responseMimeType: "application/json",
      thinkingConfig: {
        thinkingBudget: 4096,
      },
    },
  };

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini API Error (thinking):", response.status, errorText);
    throw new Error(`AI Service Error: ${response.status}`);
  }

  const data = await response.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const textPart = parts.find((p: any) => p.text);
  return textPart?.text?.trim() || "";
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
    const {
      description,
      contentType = "with_content",
      difficulty = "intermediate",
      targetAudience = "General Audience",
      slideCount = 8,
      singleSlide,
      skipImages = false,
      maxImages,
      phase,
      plan: providedPlan,
      interpretation: providedInterpretation,
      slideTypes: providedSlideTypes,
      progressiveSlide,
      /** When true (default), full-deck slide images are returned as pendingSlideImages for client-side generate-image hydration. */
      asyncImages = true,
    } = body;

    const GEMINI_API_KEY = requireGeminiApiKey();

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
        { responseSchema: GEMINI_SINGLE_SLIDE_SCHEMA },
      );

      let rawSlide = parseModelJson(rawContent);
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
    // PROGRESSIVE SLIDE MODE (one slide at a time, with plan context)
    // ==========================================================================
    if (progressiveSlide && typeof progressiveSlide === "object") {
      const { index, slideType, plan, interpretation } = progressiveSlide;
      const desc = progressiveSlide.description || description;
      if (!desc || typeof slideType !== "string") {
        throw new Error("progressiveSlide requires description and slideType");
      }
      const progressiveContentType =
        (typeof progressiveSlide.contentType === "string" ? progressiveSlide.contentType : contentType) || "with_content";
      const effectiveSlideType =
        progressiveContentType === "interactive" && slideType !== "title" && !INTERACTIVE_ONLY_SLIDE_TYPES.has(slideType)
          ? "poll"
          : slideType;
      const balanceCheck = await checkCreditsBalance(user.id, 1);
      if (!balanceCheck.allowed) {
        return new Response(
          JSON.stringify({ error: balanceCheck.error || "Insufficient credits" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const ctxPrompt = plan && interpretation
        ? `Presentation: "${desc}". Plan: ${plan}. This is slide ${(index || 0) + 1}. Context: ${interpretation}`
        : desc;
      const includeImage = ["title", "split_content", "poll", "wordcloud"].includes(effectiveSlideType);
      const sysPrompt = buildSingleSlidePrompt(effectiveSlideType, ctxPrompt, "professional", includeImage);
      const rawContent = await callAI(GEMINI_API_KEY, sysPrompt, `Generate ${effectiveSlideType} slide: "${desc}"`, {
        responseSchema: GEMINI_SINGLE_SLIDE_SCHEMA,
      });
      let rawSlide = parseModelJson(rawContent);
      if (Array.isArray(rawSlide) && rawSlide.length > 0) rawSlide = rawSlide[0];
      if (!rawSlide || typeof rawSlide !== "object") {
        throw new Error("Failed to parse slide from AI response");
      }
      rawSlide = validateAndFixSlide(rawSlide, index || 0, desc);
      let generatedImageUrl: string | null = null;
      if (!skipImages && ["title", "split_content", "poll", "wordcloud"].includes(effectiveSlideType) && rawSlide.imagePrompt) {
        generatedImageUrl = await generateImage(GEMINI_API_KEY, rawSlide.imagePrompt, effectiveSlideType);
      }
      const selectedTheme = selectThemeForTopic(desc);
      const hebrewRegex = /[\u0590-\u05FF]/;
      const detectedLanguage = hebrewRegex.test(desc) ? "hebrew" : "english";
      const mappedSlide = mapSlideToFrontendFormat(rawSlide as RawSlide, index || 0, selectedTheme, detectedLanguage, generatedImageUrl || undefined, desc);
      const creditResult = await consumeCredits(user.id, 1, `Progressive slide ${(index || 0) + 1}`);
      if (!creditResult.success) {
        return new Response(JSON.stringify({ error: creditResult.error || "Failed to deduct credits" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(
        JSON.stringify({ slide: mappedSlide, theme: { id: selectedTheme.id, themeName: selectedTheme.name, colors: selectedTheme.colors, font: selectedTheme.font, mood: selectedTheme.mood } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ==========================================================================
    // FULL PRESENTATION MODE
    // ==========================================================================
    if (!description) {
      throw new Error("Missing 'description' in request body");
    }

    console.log(`🎯 Generating full presentation: "${description}"`);

    // Early checks BEFORE any AI call: credits + max_slides
    const maxSlidesAllowed = await getUserMaxSlides(user.id);
    if (slideCount > maxSlidesAllowed) {
      return new Response(
        JSON.stringify({
          error: "Slide limit exceeded",
          message: `Your plan allows up to ${maxSlidesAllowed} slides. Upgrade to add more.`,
          maxSlides: maxSlidesAllowed,
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const effectiveSlideCount = Math.min(slideCount, maxSlidesAllowed);

    const { isPro } = await getUserPlan(user.id);
    const userAiSettings = isPro ? await getUserAiSettings(user.id) : null;

    // Phase 1: Plan only - return reasoning + plan before building slides (all users, same AI capability)
    if (phase === "plan") {
      const planBalanceCheck = await checkCreditsBalance(user.id, 1);
      if (!planBalanceCheck.allowed) {
        return new Response(
          JSON.stringify({ error: planBalanceCheck.error || "Insufficient credits" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const systemPrompt =
        contentType === "interactive"
          ? buildInteractiveOnlyPlanPrompt(description, slideCount, difficulty, userAiSettings)
          : buildProPlanOnlyPrompt(description, targetAudience, slideCount, userAiSettings);
      const planRaw = await callAI(GEMINI_API_KEY, systemPrompt, `Analyze and plan: "${description}".`, {
        responseSchema: GEMINI_PLAN_RESPONSE_SCHEMA,
        maxOutputTokens: 8192,
      });
      const planParsed = parseModelJson(planRaw);
      if (!planParsed || typeof planParsed !== "object" || !Array.isArray(planParsed.slideTypes)) {
        throw new Error("Failed to parse plan from AI response.");
      }
      if (contentType === "interactive") {
        planParsed.slideTypes = enforceInteractiveOnlySlideTypes(planParsed.slideTypes || [], maxSlidesAllowed);
      }
      // Cap slide types to user's max_slides
      const cappedSlideTypes = (planParsed.slideTypes || []).slice(0, maxSlidesAllowed);
      const planCreditResult = await consumeCredits(user.id, 1, "Presentation plan");
      if (!planCreditResult.success) {
        return new Response(
          JSON.stringify({ error: planCreditResult.error || "Failed to deduct credits" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({
          phase: "plan",
          interpretation: planParsed.interpretation || "",
          plan: planParsed.plan || "",
          slideCount: cappedSlideTypes.length,
          slideTypes: cappedSlideTypes,
          creditsConsumed: 1,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const balanceCheck = await checkCreditsBalance(user.id, effectiveSlideCount);
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
    console.log(`🎨 Selected theme: ${selectedTheme.name}. Pro mode: ${isPro}`);

    let rawContent: string;
    let plan: string | undefined;
    let interpretation: string | undefined;

    if (isPro && providedPlan && providedInterpretation && Array.isArray(providedSlideTypes) && providedSlideTypes.length > 0) {
      const slideTypes =
        contentType === "interactive"
          ? enforceInteractiveOnlySlideTypes(providedSlideTypes, effectiveSlideCount)
          : providedSlideTypes;
      const slidesFromPlanPrompt = buildProSlidesFromPlanPrompt(
        description,
        providedInterpretation,
        providedPlan,
        slideTypes
      );
      rawContent = await callAI(
        GEMINI_API_KEY,
        slidesFromPlanPrompt,
        `Generate slide content for: "${description}".`
      );
      plan = providedPlan;
      interpretation = providedInterpretation;
      const parsed = parseModelJson(rawContent);
      rawContent = Array.isArray(parsed) ? JSON.stringify(parsed) : rawContent;
    } else {
      // Same Pro-quality path for all users (Free only differs by max_slides cap)
      const systemPrompt =
        contentType === "interactive"
          ? buildInteractiveOnlyPrompt(description, effectiveSlideCount, difficulty, userAiSettings)
          : buildProInstructionalDesignPrompt(
              description,
              targetAudience,
              effectiveSlideCount,
              userAiSettings,
              difficulty,
            );
      rawContent = await callAIWithThinking(
        GEMINI_API_KEY,
        systemPrompt,
        `Create the presentation with interpretation, plan, and slides for: "${description}".`,
      );
      const proParsed = parseModelJson(rawContent);
      if (proParsed && typeof proParsed === "object" && Array.isArray(proParsed.slides)) {
        plan = proParsed.plan;
        interpretation = proParsed.interpretation;
        rawContent = JSON.stringify(proParsed.slides);
      }
    }

    console.log(`📝 Raw AI response length: ${rawContent.length} chars`);

    const parsed = parseModelJson(rawContent);
    let rawSlides = normalizeToSlidesArray(parsed) ?? (Array.isArray(parsed) ? parsed : null);

    if (!rawSlides || !rawSlides.length) {
      const what = parsed == null ? "null" : Array.isArray(parsed) ? `array(length=${parsed.length})` : typeof parsed;
      console.error("[generate-slides] Parse failed. Got:", what);
      console.error("[generate-slides] Raw preview (400 chars):", rawContent.substring(0, 400));
      throw new Error("Failed to parse slides from AI response. Please try again or use a shorter topic.");
    }

    rawSlides = rawSlides.map((slide: any, index: number) => validateAndFixSlide(slide, index, description));
    if (contentType === "interactive") {
      rawSlides = enforceInteractiveOnlySlides(rawSlides, effectiveSlideCount);
      rawSlides = rawSlides.map((slide: any, index: number) => validateAndFixSlide(slide, index, description));
    }
    rawSlides = rawSlides.slice(0, effectiveSlideCount);

    console.log(`✅ Parsed and validated ${rawSlides.length} slides`);

    // WYSIWYG: Detect language from actual slide content (not just prompt) for correct direction/textAlign
    const contentText = rawSlides
      .map((s: any) => {
        const c = s.content || {};
        return [
          c.title,
          c.subtitle,
          c.text,
          c.question,
          c.statement,
          Array.isArray(c.options) ? c.options.join(" ") : "",
          Array.isArray(c.bulletPoints) ? c.bulletPoints.join(" ") : "",
          Array.isArray(c.items) ? c.items.join(" ") : "",
          Array.isArray(c.points) ? (c.points as any[]).map((p: any) => p?.title || p?.description || "").join(" ") : "",
        ]
          .filter(Boolean)
          .join(" ");
      })
      .join(" ");
    const contentDetectedLanguage = hebrewRegex.test(contentText) ? "hebrew" : "english";
    if (contentDetectedLanguage !== detectedLanguage) {
      console.log(`🌍 Overriding language from content: ${detectedLanguage} → ${contentDetectedLanguage}`);
    }
    const effectiveDetectedLanguage = contentDetectedLanguage;

    let imageMap = new Map<number, string>();
    let pendingSlideImages: { index: number; prompt: string; type: string }[] = [];

    if (!skipImages) {
      const slidesNeedingImages = rawSlides
        .map((slide: any, index: number) => ({ slide, index }))
        .filter(
          ({ slide }: { slide: any }) =>
            ["title", "split_content", "poll", "wordcloud"].includes(slide.type) && slide.imagePrompt,
        )
        .slice(0, Math.min(maxImages ?? 6, rawSlides.length));

      if (asyncImages) {
        pendingSlideImages = slidesNeedingImages
          .map(({ slide, index }: { slide: any; index: number }) => ({
            index,
            prompt: String(slide.imagePrompt || ""),
            type: String(slide.type || "title"),
          }))
          .filter((x) => x.prompt.length > 0);
        console.log(`🖼️ Deferring ${pendingSlideImages.length} slide images to client`);
      } else {
        console.log(`🖼️ Generating ${slidesNeedingImages.length} images inline...`);
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
    }

    // *** KEY CHANGE: Pass full theme object instead of just theme.id ***
    const mappedSlides = rawSlides.map((slide: any, index: number) =>
      mapSlideToFrontendFormat(slide, index, selectedTheme, effectiveDetectedLanguage, imageMap.get(index), description),
    );

    const creditsToCharge = mappedSlides.length;
    const creditResult = await consumeCredits(
      user.id,
      creditsToCharge,
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

    console.log(`🚀 Mapped ${mappedSlides.length} slides. Credits consumed: ${creditsToCharge}`);

    const responsePayload: Record<string, unknown> = {
      slides: mappedSlides,
      theme: {
        id: selectedTheme.id,
        themeName: selectedTheme.name,
        colors: selectedTheme.colors,
        font: selectedTheme.font,
        mood: selectedTheme.mood,
      },
      slideCount: mappedSlides.length,
      detectedLanguage: effectiveDetectedLanguage,
      creditsConsumed: creditsToCharge,
    };
    if (plan !== undefined) responsePayload.plan = plan;
    if (interpretation !== undefined) responsePayload.interpretation = interpretation;
    if (pendingSlideImages.length > 0) responsePayload.pendingSlideImages = pendingSlideImages;

    return new Response(
      JSON.stringify(responsePayload),
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
