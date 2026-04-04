import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireGeminiApiKey } from "../_shared/gemini-key.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

const INITIAL_FREE_CREDITS = 15;

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

async function parallelWithLimit<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < tasks.length) {
      const i = nextIndex++;
      try {
        const value = await tasks[i]();
        results[i] = { status: "fulfilled", value };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/** Max parallel Gemini image generations per full-deck request (balance speed vs API limits). */
const INLINE_IMAGE_CONCURRENCY = 4;

interface UserContext {
  planName: string;
  isPro: boolean;
  maxSlides: number;
  creditsBalance: number;
  aiSettings: {
    who_am_i?: string;
    what_i_lecture?: string;
    teaching_style?: string;
    additional_context?: string;
  } | null;
}

async function getUserContextBatch(userId: string): Promise<UserContext> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceKey) {
    return { planName: "Free", isPro: false, maxSlides: 5, creditsBalance: 0, aiSettings: null };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const [subResult, creditsResult, aiSettingsResult] = await Promise.all([
    supabase.from("user_subscriptions").select("plan_id").eq("user_id", userId).maybeSingle(),
    supabase.from("user_credits").select("ai_tokens_balance").eq("user_id", userId).maybeSingle(),
    supabase.from("user_ai_settings").select("who_am_i, what_i_lecture, teaching_style, additional_context").eq("user_id", userId).maybeSingle(),
  ]);

  const creditsBalance = creditsResult.data?.ai_tokens_balance ?? 0;
  const aiSettings = aiSettingsResult.data ?? null;

  const planId = subResult.data?.plan_id;
  if (!planId) {
    return { planName: "Free", isPro: false, maxSlides: 5, creditsBalance, aiSettings };
  }

  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("name, max_slides")
    .eq("id", planId)
    .single();

  const planName = plan?.name || "Free";
  const isPro = planName === "Pro" || planName === "Standard";
  const maxSlides = typeof plan?.max_slides === "number" ? plan.max_slides : 5;

  return { planName, isPro, maxSlides, creditsBalance, aiSettings };
}

async function getUserPlan(userId: string): Promise<{ planName: string; isPro: boolean }> {
  const ctx = await getUserContextBatch(userId);
  return { planName: ctx.planName, isPro: ctx.isPro };
}

async function getUserMaxSlides(userId: string): Promise<number> {
  const ctx = await getUserContextBatch(userId);
  return ctx.maxSlides;
}

async function getUserAiSettings(userId: string): Promise<{
  who_am_i?: string;
  what_i_lecture?: string;
  teaching_style?: string;
  additional_context?: string;
} | null> {
  const ctx = await getUserContextBatch(userId);
  return ctx.aiSettings;
}

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
    .maybeSingle();
  if (fetchError) {
    return { allowed: false, error: "Could not fetch credits" };
  }
  const balance = credits?.ai_tokens_balance ?? 0;
  if (balance < amount) {
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

const GRADIENT_DEFINITIONS: Record<string, { colors: string[]; angle: number }> = {
  "purple-blue": { colors: ["#7c3aed", "#2563eb"], angle: 135 },
  "blue-cyan": { colors: ["#1d4ed8", "#06b6d4"], angle: 145 },
  "purple-pink": { colors: ["#9333ea", "#ec4899"], angle: 120 },
  "dark-blue": { colors: ["#1e1b4b", "#312e81"], angle: 160 },
  "cyan-teal": { colors: ["#06b6d4", "#14b8a6"], angle: 135 },
  "pink-orange": { colors: ["#ec4899", "#f97316"], angle: 135 },
  "peach-rose": { colors: ["#fb923c", "#f472b6"], angle: 140 },
  "soft-pink": { colors: ["#f9a8d4", "#c084fc"], angle: 130 },
  "lavender-pink": { colors: ["#a78bfa", "#f472b6"], angle: 150 },
  "coral-warm": { colors: ["#fb7185", "#fdba74"], angle: 135 },
  "blue-gray": { colors: ["#3b82f6", "#64748b"], angle: 145 },
  "steel-blue": { colors: ["#475569", "#1e40af"], angle: 135 },
  "navy-slate": { colors: ["#1e3a5f", "#334155"], angle: 160 },
  "teal-blue": { colors: ["#0d9488", "#2563eb"], angle: 140 },
  "cool-gray": { colors: ["#4b5563", "#6b7280"], angle: 150 },
  "dark-red": { colors: ["#991b1b", "#1c1917"], angle: 135 },
  "charcoal-black": { colors: ["#292524", "#0c0a09"], angle: 160 },
  "red-orange": { colors: ["#dc2626", "#ea580c"], angle: 130 },
  "dark-gold": { colors: ["#78350f", "#292524"], angle: 145 },
  "mono-dark": { colors: ["#27272a", "#18181b"], angle: 150 },
  "orange-gold": { colors: ["#ea580c", "#ca8a04"], angle: 135 },
  "sunset-warm": { colors: ["#dc2626", "#f59e0b"], angle: 140 },
  "amber-rose": { colors: ["#d97706", "#e11d48"], angle: 130 },
  terracotta: { colors: ["#9a3412", "#b45309"], angle: 150 },
  "warm-peach": { colors: ["#f97316", "#fbbf24"], angle: 135 },
  "ocean-teal": { colors: ["#0891b2", "#0d9488"], angle: 135 },
  "aqua-green": { colors: ["#06b6d4", "#10b981"], angle: 140 },
  "sky-blue": { colors: ["#0ea5e9", "#38bdf8"], angle: 150 },
  "sea-foam": { colors: ["#14b8a6", "#34d399"], angle: 130 },
  "blue-green": { colors: ["#2563eb", "#059669"], angle: 145 },
};

const SLIDE_TYPE_GRADIENT_MOOD: Record<string, number> = {
  title: 0,
  split_content: 1,
  content: 2,
  quiz: 3,
  timeline: 1,
  scale: 4,
  yesno: 3,
  poll: 2,
  wordcloud: 4,
  bullet_points: 1,
  bar_chart: 2,
  ranking: 3,
  guess_number: 3,
  sentiment_meter: 4,
};

function selectGradientForSlide(slideType: string, slideIndex: number, theme: GeneratedTheme): string {
  const palette = theme.gradientPalette;
  const moodIndex = SLIDE_TYPE_GRADIENT_MOOD[slideType] ?? slideIndex;
  const effectiveIndex = (moodIndex + slideIndex) % palette.length;
  return palette[effectiveIndex];
}

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

function enhanceImagePrompt(originalPrompt: string, slideType: string): string {
  const noTextRequirement = `ABSOLUTE REQUIREMENT - TEXT-FREE IMAGE ONLY:
- DO NOT include ANY text, words, letters, numbers, labels, titles, captions, watermarks, logos, or typography of ANY kind
- This is a pure visual/photographic image with ZERO textual elements`;

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

const imageCache = new Map<string, string>();

function getImageCacheKey(prompt: string): string {
  return `${prompt.substring(0, 100).replace(/\s+/g, "_")}_${prompt.length}`;
}

function cleanAndParseJSON(rawContent: string): any {
  let text = (rawContent || "").trim();
  if (!text) return null;

  const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    text = jsonBlockMatch[1].trim();
  }

  const arrayStart = text.indexOf("[");
  const objectStart = text.indexOf("{");
  const firstJson = arrayStart >= 0 && (objectStart < 0 || arrayStart <= objectStart)
    ? arrayStart
    : objectStart;
  if (firstJson > 0 && firstJson < 300) {
    text = text.slice(firstJson);
  }

  text = text
    .trim()
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/,(\s*[}\]])/g, "$1")
    .replace(/([\{\,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, (_, prefix, key) => `${prefix}"${key}":`);

  const openBraces = (text.match(/{/g) || []).length;
  const closeBraces = (text.match(/}/g) || []).length;
  const openBrackets = (text.match(/\[/g) || []).length;
  const closeBrackets = (text.match(/]/g) || []).length;
  if (openBraces > closeBraces) text += "}".repeat(openBraces - closeBraces);
  if (openBrackets > closeBrackets) text += "]".repeat(openBrackets - closeBrackets);

  try {
    return JSON.parse(text);
  } catch {
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try { return JSON.parse(arrayMatch[0]); } catch {}
    }
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try { return JSON.parse(objectMatch[0]); } catch {}
    }
    console.error("[generate-slides] JSON parse failed. Preview:", text.substring(0, 400));
    return null;
  }
}

function parseModelJson(rawContent: string): any {
  const t = (rawContent || "").trim();
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    return cleanAndParseJSON(rawContent);
  }
}

const GEMINI_PLAN_RESPONSE_SCHEMA: Record<string, unknown> = {
  type: "OBJECT",
  properties: {
    interpretation: { type: "STRING" },
    plan: { type: "STRING" },
    teachableSubject: { type: "STRING", nullable: true },
    slideTypes: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
  },
  required: ["interpretation", "plan", "slideTypes"],
};

const GEMINI_SINGLE_SLIDE_SCHEMA: Record<string, unknown> = {
  type: "OBJECT",
  properties: {
    type: { type: "STRING" },
    content: { type: "OBJECT" },
    imagePrompt: { type: "STRING", nullable: true },
  },
  required: ["type", "content"],
};

const AI_OPTIMAL_SLIDES_MAX = 10;

function slideCountBandInstruction(maxSlidesAllowed: number): string {
  const planCap = Math.max(1, maxSlidesAllowed);
  const hi = Math.min(AI_OPTIMAL_SLIDES_MAX, planCap);
  const lo = Math.min(5, hi);
  if (hi <= 3) {
    return `Choose the optimal number of slides between 3 and ${hi} based on topic depth (at most ${hi}). Every slide must have rich, topic-specific content.`;
  }
  if (lo >= hi) {
    return `Use ${hi} slide(s). Each must be substantive with real examples, full quiz/poll options, and concrete titles.`;
  }
  return `Choose the optimal number of slides between ${lo} and ${hi} based on topic depth (never more than ${hi}). Every slide must have substantive, specific content.`;
}

function findSlidesArray(obj: any, depth = 0): any[] | null {
  if (depth > 3) return null;
  if (Array.isArray(obj) && obj.length > 0) return obj;
  if (obj && typeof obj === "object") {
    for (const key of ["slides", "data", "content", "result", "presentation", "output"]) {
      const found = findSlidesArray(obj[key], depth + 1);
      if (found) return found;
    }
    if (obj.type && obj.content && typeof obj.content === "object") return [obj];
  }
  return null;
}

function normalizeToSlidesArray(parsed: any): any[] | null {
  const found = findSlidesArray(parsed);
  if (found) return found;
  return null;
}

interface RawSlide {
  type: string;
  content: Record<string, any>;
  imagePrompt?: string;
}

function stripUserInstructionMetaTail(s: string): string {
  let t = String(s || "").replace(/\s+/g, " ").trim();
  if (!t) return t;
  const cutMarkers = [
    /\s*תשלח\s+גם\s+תוכן\s+וגם\s+שאלות/i,
    /\s*תשלח\s+גם\s+תוכן\b/i,
    /\s*תשלח\s+גם\s+שאלות\b/i,
    /\s*מה\s+אפשר\s+להרוויח\b/i,
    /\s*\.שלחי\s+נושא/i,
  ];
  for (const re of cutMarkers) {
    const m = t.match(re);
    if (m && m.index !== undefined && m.index >= 10) {
      t = t.slice(0, m.index).trim();
      break;
    }
  }
  return t;
}

function truncateSubjectForSlideCopy(subject: string, maxChars = 80): string {
  const s = String(subject || "").replace(/\s+/g, " ").trim();
  if (!s) return s;
  if (s.length <= maxChars) return s;
  const slice = s.slice(0, maxChars);
  const lastSpace = slice.lastIndexOf(" ");
  if (lastSpace > 20) return slice.slice(0, lastSpace).trim();
  return slice.trim();
}

function extractCoreTopicPhraseFromInstruction(raw: string): string | null {
  const t = stripUserInstructionMetaTail(String(raw || "").trim());
  if (!t) return null;
  const normalized = t.replace(/\bאנ\s+ירוצה\b/gi, "אני רוצה");

  const hePatterns: RegExp[] = [
    /\b(?:אני\s+)?הולך\s+להעביר\s+(?:עוד\s+שבוע\s+)?(?:וובינר|וובינאר|webinar|הרצאה|מצגת|פרזנטציה)\s+על\s+(.+?)(?:\s*[-–—]\s*|\s+תכין\s+לי|\s+תייצר|\s+תבנה\s+לי|\s+תעשה\s+לי|\s+שתערב|\s+\.\s*תשלח|\s+תשלח\s+גם|\s+אני\s+רוצה|\s*$)/i,
    /\bעוד\s+שבוע\s+(?:וובינר|וובינאר|webinar|הרצאה|מצגת)\s+על\s+(.+?)(?:\s*[-–—]\s*|\s+תכין|\s+תייצר|\s+שתערב|\s+תשלח|\s+אני\s+רוצה|\s*$)/i,
    /\b(?:מעביר|מנהל|נותן|עושה|מכין|מציג)\s+(?:וובינר|וובינאר|webinar|הרצאה|מצגת|פרזנטציה)\s+על\s+(.+?)(?:\s*[-–—]\s*|\s+תכין\s+לי|\s+תייצר|\s+תבנה\s+לי|\s+תעשה\s+לי|\s+שתערב|\s*$)/i,
    /\b(?:וובינר|וובינאר|webinar)\s+על\s+(.+?)(?:\s*[-–—]\s*|\s+תכין\s+לי|\s+תייצר|\s+תבנה|\s+שתערב|\s*$)/i,
    /\b(?:הרצאה|מצגת|פרזנטציה|מצגות|הצגת)\s+(?:על|אודות|בנושא|לגבי)\s+(.+?)(?:\s*[-–—]\s*|\s+תכין|\s+תייצר|\s+שתערב|\s*$)/i,
    /\bבנושא\s+(.+?)(?:\s*[-–—]\s*|\s+תכין|\s+תייצר|\s+שתערב|\s*$)/i,
    /\b(?:אודות|לגבי)\s+(.+?)(?:\s*[-–—]\s*|\s+תכין|\s+תייצר|\s*$)/i,
  ];
  for (const p of hePatterns) {
    const m = normalized.match(p);
    if (m?.[1]) {
      const phrase = m[1].replace(/\s+/g, " ").trim();
      if (phrase.length >= 2 && phrase.length <= 120) return phrase;
    }
  }

  const enPatterns = [
    /\b(?:webinar|talk|lecture|presentation|deck)\s+(?:on|about|regarding)\s+(.+?)(?:\s*[-–—]\s*|\s+prepare|\s+help\s+me|\s+engage|$)/i,
  ];
  for (const p of enPatterns) {
    const m = normalized.match(p);
    if (m?.[1]) {
      const phrase = m[1].replace(/\s+/g, " ").trim();
      if (phrase.length >= 2 && phrase.length <= 120) return phrase;
    }
  }
  return null;
}

function extractPresentationSubject(raw: string): string {
  let t = stripUserInstructionMetaTail(
    String(raw || "")
      .trim()
      .replace(/^[\s"'""'']+|[\s"'""'']+$/g, ""),
  );
  if (!t) return "Presentation";
  t = t.replace(/\bאנ\s+ירוצה\b/gi, "אני רוצה");

  const coreTopic = extractCoreTopicPhraseFromInstruction(t);
  if (coreTopic) t = coreTopic;

  t = t.replace(/\bהצגת(\s+(על|אודות|בנושא|לגבי))\b/gi, "מצגת$1");

  const patterns: RegExp[] = [
    /^(תייצר|תכין|תבנה|תעשה|תיצור|תכינו|בנה\s+לי|בנו\s+לי|עשה\s+לי|עשו\s+לי|יצור\s+לי|יצרו\s+לי|תבנו\s+לי)\s+/gi,
    /^(הכן|הכינו)\s+(לי\s+)?(הרצאה|מצגת|פרזנטציה)\s+/gi,
    /^(אני\s+)?הולך\s+להעביר\s+(?:עוד\s+שבוע\s+)?(?:וובינר|וובינאר|webinar|הרצאה|מצגת|פרזנטציה)\s+על\s+/gi,
    /^עוד\s+שבוע\s+(?:וובינר|וובינאר|webinar|הרצאה|מצגת)\s+על\s+/gi,
    /^(אני\s+)?(מעביר|מנהל|נותן|עושה|מכין|מציג)\s+(וובינר|וובינאר|webinar|הרצאה|מצגת|פרזנטציה)\s+על\s+/gi,
    /^(create|build|make|generate)\s+(me\s+)?(a\s+)?(an\s+)?(interactive\s+)?(presentation|lecture|deck|slideshow|slides?)\s+(about|on|for|regarding)\s+/gi,
    /^(i\s+)?(want|need|would\s+like)\s+(you\s+)?(to\s+)?(create|build|make|generate)\s+(a\s+)?(presentation|lecture|deck)?\s*(about|on|for)?\s*/gi,
    /^(create|build|make|generate)\s+(me\s+)?(a\s+)?/gi,
    /\b(הרצאה|מצגת|מצגות|הצגת|פרזנטציה)\s+(על|אודות|בנושא|לגבי)\s+/gi,
    /\b(presentation|lecture|deck)\s+(about|on|for)\s+/gi,
  ];
  for (let pass = 0; pass < 3; pass++) {
    for (const p of patterns) {
      const next = t.replace(p, "").trim();
      if (next.length >= 2) t = next;
    }
  }
  t = t.replace(/\s+/g, " ").trim();

  if (t.length > 70 || /אני\s+מעביר|אני\s+הולך\s+להעביר|תכין\s+לי|שתערב|וובינר\s+על/i.test(t)) {
    const beforeDash = t.split(/\s*[-–—]\s*/)[0]?.trim() ?? "";
    if (beforeDash.length >= 3 && beforeDash.length < t.length) {
      const sub = extractCoreTopicPhraseFromInstruction(beforeDash) ?? beforeDash
        .replace(
          /^(אני\s+)?(מעביר|הולך\s+להעביר|מנהל|נותן|עושה|מכין)\s+(וובינר|וובינאר|webinar|הרצאה|מצגת)\s+על\s+/i,
          "",
        )
        .trim();
      if (sub.length >= 2 && sub.length <= 120) t = sub;
    }
  }

  if (t.length < 2) return truncateSubjectForSlideCopy(String(raw || "").trim().slice(0, 240), 100);
  return truncateSubjectForSlideCopy(t.slice(0, 320), 100);
}

function mergeTeachableSubjectFromPlan(base: string, teachable: string | undefined | null): string {
  const t = String(teachable || "").trim();
  if (!t) return base;
  const merged = extractPresentationSubject(t);
  if (merged.length >= 2 && merged !== "Presentation") return merged;
  return truncateSubjectForSlideCopy(t, 100);
}

function subjectLanguageIsHebrew(subject: string): boolean {
  return /[\u0590-\u05FF]/.test(subject);
}

function topicContractBlock(rawUserInput: string, subject: string): string {
  const isHe = subjectLanguageIsHebrew(subject);
  return `
## TOPIC EXTRACTION (CRITICAL — OVERRIDES MODEL DEFAULTS)
The user's message (verbatim): ${JSON.stringify(rawUserInput)}

**Teachable subject:** ${JSON.stringify(subject)}

MANDATORY:
1. **Never paste the user's message** into any slide field. The message is ONLY for understanding the topic.
2. **All slide copy must be NEW pedagogical content** about "${subject}".
3. **First slide title:** A professional headline — NOT the raw message or instruction verbs.
4. **Language:** ALL content in ${isHe ? "Hebrew (עברית שוטפת וטבעית)" : "English"} — never mix languages.
5. **Depth over breadth:** Each slide teaches ONE concrete idea with specifics (numbers, names, examples, definitions).
`;
}

function looksLikeUserInstructionEcho(text: string, raw: string): boolean {
  const a = String(text || "").trim();
  const b = String(raw || "").trim();
  if (!a || !b) return false;

  if (/^(תייצר|תכין|תבנה|create\s+a|make\s+a|generate\s+a|build\s+a)\s/i.test(a)) return true;
  if (/אני\s+מעביר|שתערב\s+את\s+הקהל|תייצר\s+לי|הכן\s+לי/i.test(a)) return true;
  if (/prepare\s+me\s+a|help\s+me\s+create|engage\s+(my\s+)?audience/i.test(a)) return true;

  if (a === b) return true;
  if (b.length >= 40 && a.length >= b.length * 0.8) {
    const prefix = b.slice(0, Math.min(60, b.length));
    if (prefix.length >= 30 && a.includes(prefix)) return true;
  }
  return false;
}

function sanitizeSlideStringField(
  text: string,
  rawUserInput: string,
  subject: string,
  slideType: string,
  fieldKey: string,
): string {
  const t = String(text || "");
  if (!t || !String(rawUserInput || "").trim()) return t;
  if (!looksLikeUserInstructionEcho(t, rawUserInput)) return t;

  const isHe = subjectLanguageIsHebrew(subject);
  const shortSub = truncateSubjectForSlideCopy(subject, 80);
  const k = fieldKey.toLowerCase();

  if (k === "title" && slideType === "title") {
    return isHe ? shortSub : shortSub.charAt(0).toUpperCase() + shortSub.slice(1);
  }
  if (k === "title") {
    return isHe ? `היבט מרכזי ב${shortSub}` : `A key dimension of ${shortSub}`;
  }
  if (k === "subtitle") {
    return isHe
      ? `מה חשוב לדעת, מה הסיכונים, ואיך ליישם בפועל`
      : `What matters, what to watch for, and how to apply it`;
  }
  if (k.includes("imageprompt")) {
    return `Cinematic abstract visual evoking the essence of ${shortSub}, soft gradients, professional, no text or letters`;
  }

  return t;
}

function mutateEchoSanitizeDeep(
  node: unknown,
  rawUserInput: string,
  subject: string,
  slideType: string,
): void {
  if (node === null || node === undefined) return;
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      const item = node[i];
      if (typeof item === "string") {
        const next = sanitizeSlideStringField(item, rawUserInput, subject, slideType, `item${i}`);
        if (next !== item) node[i] = next;
      } else {
        mutateEchoSanitizeDeep(item, rawUserInput, subject, slideType);
      }
    }
    return;
  }
  if (typeof node === "object") {
    for (const k of Object.keys(node as object)) {
      const v = (node as Record<string, unknown>)[k];
      if (typeof v === "string") {
        const next = sanitizeSlideStringField(v, rawUserInput, subject, slideType, k);
        if (next !== v) (node as Record<string, unknown>)[k] = next;
      } else {
        mutateEchoSanitizeDeep(v, rawUserInput, subject, slideType);
      }
    }
  }
}

function stripPromptEchoFromSlideDeep(slide: RawSlide, rawUserInput: string, subject: string): void {
  const r = String(rawUserInput || "").trim();
  if (!r) return;
  mutateEchoSanitizeDeep(slide.content, r, subject, String(slide.type || "content"));
  if (typeof slide.imagePrompt === "string" && slide.imagePrompt.trim()) {
    const next = sanitizeSlideStringField(slide.imagePrompt, r, subject, String(slide.type || "content"), "imagePrompt");
    if (next !== slide.imagePrompt) slide.imagePrompt = next;
  }
}

function sanitizeSlideDeckForPromptEcho(
  slides: RawSlide[],
  rawUserInput: string,
  subject: string,
): void {
  const r = String(rawUserInput || "").trim();
  if (!r || !slides?.length) return;
  for (const slide of slides) {
    stripPromptEchoFromSlideDeep(slide, r, subject);
  }
}

function fixEchoMetaInSlide(slide: RawSlide, rawUserInput: string, subject: string): void {
  const isHe = subjectLanguageIsHebrew(subject);
  const shortSub = truncateSubjectForSlideCopy(subject, 80);
  const c = slide.content;

  if (slide.type === "title") {
    const ti = String(c.title || "").trim();
    if (!ti || looksLikeUserInstructionEcho(ti, rawUserInput) || ti.length > 90) {
      c.title = isHe ? shortSub : shortSub.charAt(0).toUpperCase() + shortSub.slice(1);
    }
    const sub = String(c.subtitle || "").trim();
    if (!sub || sub.length < 12 || looksLikeUserInstructionEcho(sub, rawUserInput)) {
      c.subtitle = isHe
        ? `מה חשוב לדעת, מה הסיכונים, ואיך ליישם בפועל`
        : `What matters, what to watch for, and how to apply it`;
    }
  }
}

function validateAndFixSlide(
  slide: RawSlide,
  index: number,
  subject: string,
  rawUserInput?: string,
): RawSlide {
  const fixedSlide = { ...slide, content: { ...slide.content } };
  const isHe = subjectLanguageIsHebrew(subject);
  const shortSub = truncateSubjectForSlideCopy(subject, 80);

  if (!fixedSlide.type) {
    fixedSlide.type = index === 0 ? "title" : "content";
  }

  /* Legacy / AI slip: map to wordcloud (product no longer exposes finish_sentence). */
  const rawType = String(fixedSlide.type);
  if (rawType === "finish_sentence" || rawType === "finishSentence") {
    const q =
      (fixedSlide.content?.sentenceStart && String(fixedSlide.content.sentenceStart).trim()) ||
      (fixedSlide.content?.question && String(fixedSlide.content.question).trim()) ||
      (isHe ? `הדבר הכי חשוב ב${shortSub} הוא...` : `The most important thing about ${shortSub} is...`);
    fixedSlide.type = "wordcloud";
    fixedSlide.content = { question: q };
  }

  switch (fixedSlide.type) {
    case "title":
      if (!fixedSlide.content.title) {
        fixedSlide.content.title = isHe ? shortSub : shortSub.charAt(0).toUpperCase() + shortSub.slice(1);
      }
      if (!fixedSlide.content.subtitle) {
        fixedSlide.content.subtitle = isHe
          ? `מה חשוב לדעת, מה הסיכונים, ואיך ליישם בפועל`
          : `What matters, what to watch for, and how to apply it`;
      }
      break;

    case "split_content":
      if (!fixedSlide.content.title) fixedSlide.content.title = isHe ? `רקע על ${shortSub}` : `Background on ${shortSub}`;
      if (!fixedSlide.content.text && !fixedSlide.content.bulletPoints) {
        fixedSlide.content.text = isHe
          ? `הגדרה בסיסית של ${shortSub}\nלמה זה חשוב כרגע\nהמספרים שכדאי להכיר`
          : `Core definition of ${shortSub}\nWhy it matters right now\nThe numbers you should know`;
      }
      break;

    case "content":
      if (!fixedSlide.content.title) fixedSlide.content.title = isHe ? `עומק: ${shortSub}` : `Deep dive: ${shortSub}`;
      if (!fixedSlide.content.text || !String(fixedSlide.content.text).trim()) {
        fixedSlide.content.text = isHe
          ? `${shortSub} הוא נושא רחב שדורש הבנה של כמה שכבות. בשקופית הזו נתמקד בהיבט אחד קונקרטי — עם דוגמה מהשטח ומסקנה פרקטית שתוכלו ליישם מיד.`
          : `${shortSub} is a broad topic that requires understanding several layers. In this slide we focus on one concrete aspect — with a real-world example and a practical takeaway you can apply immediately.`;
      }
      break;

    case "bullet_points": {
      if (!fixedSlide.content.title) fixedSlide.content.title = isHe ? `נקודות מפתח ב${shortSub}` : `Key points in ${shortSub}`;
      const pts = fixedSlide.content.points || fixedSlide.content.items || [];
      if (pts.length < 3 || pts.some((p: any) => !String((p?.title ?? p) || "").trim() || String((p?.title ?? p) || "").trim().length < 5)) {
        fixedSlide.content.points = isHe
          ? [
              { title: `ההגדרה הבסיסית של ${shortSub}`, description: `מה בדיוק הכוונה ולמה זה רלוונטי` },
              { title: `היתרון המרכזי`, description: `מה אפשר להרוויח מהבנה נכונה של הנושא` },
              { title: `הסיכון שחייבים להכיר`, description: `מה קורה כשלא מבינים את המורכבות` },
            ]
          : [
              { title: `What ${shortSub} actually means`, description: `A clear definition with real-world context` },
              { title: `The core benefit`, description: `What you gain from understanding this properly` },
              { title: `The risk to watch for`, description: `What happens when this is misunderstood` },
            ];
      } else {
        fixedSlide.content.points = pts.slice(0, 6).map((p: any, i: number) => {
          const t = p?.title ?? p;
          const d = p?.description ?? "";
          return {
            title: (typeof t === "string" && t.trim()) ? t.trim() : `Point ${i + 1}`,
            description: (typeof d === "string" && d.trim()) ? d.trim() : "",
          };
        });
      }
      break;
    }

    case "bar_chart": {
      if (!fixedSlide.content.title) fixedSlide.content.title = isHe ? `נתונים: ${shortSub}` : `Data: ${shortSub}`;
      const bars = fixedSlide.content.bars || fixedSlide.content.data || [];
      if (bars.length < 4 || bars.some((b: any) => !String(b?.label ?? b?.name ?? "").trim() || /^item\s*\d+$/i.test(String(b?.label ?? b?.name ?? "")))) {

        if (bars.length < 4) {
          fixedSlide.content.bars = isHe
            ? [
                { label: `קטגוריה א׳`, value: 35 },
                { label: `קטגוריה ב׳`, value: 55 },
                { label: `קטגוריה ג׳`, value: 75 },
                { label: `קטגוריה ד׳`, value: 45 },
              ]
            : [
                { label: `Category A`, value: 35 },
                { label: `Category B`, value: 55 },
                { label: `Category C`, value: 75 },
                { label: `Category D`, value: 45 },
              ];
        } else {
          fixedSlide.content.bars = bars.slice(0, 6).map((b: any, i: number) => ({
            label: (typeof (b?.label ?? b?.name) === "string" && String(b?.label ?? b?.name).trim())
              ? String(b?.label ?? b?.name).trim()
              : `Cat ${i + 1}`,
            value: typeof b?.value === "number" ? b.value : 50,
          }));
        }
      } else {
        fixedSlide.content.bars = bars.slice(0, 6).map((b: any) => ({
          label: String(b?.label ?? b?.name ?? "").trim(),
          value: typeof b?.value === "number" ? b.value : 50,
        }));
      }
      break;
    }

    case "wordcloud":
      if (!fixedSlide.content.question || !String(fixedSlide.content.question).trim()) {
        fixedSlide.content.question = isHe
          ? `כשאתם שומעים "${shortSub}" — איזו מילה אחת קופצת לכם לראש?`
          : `When you hear "${shortSub}" — what single word comes to mind first?`;
      }
      break;

    case "quiz": {
      if (!fixedSlide.content.question) {
        fixedSlide.content.question = isHe
          ? `מהי הטעות הנפוצה ביותר שאנשים עושים כשהם ניגשים ל${shortSub}?`
          : `What's the most common mistake people make when approaching ${shortSub}?`;
      }
      const opts = fixedSlide.content.options || [];
      if (opts.length < 2 || opts.some((o: any) => !String(o || "").trim() || String(o || "").trim().length < 5)) {
        fixedSlide.content.options = isHe
          ? [
              `לא מבינים את ההגדרות הבסיסיות`,
              `מזלזלים ברמת הסיכון`,
              `פועלים בלי תוכנית מסודרת`,
              `מסתמכים על מקור מידע יחיד`,
            ]
          : [
              `Misunderstanding the basic definitions`,
              `Underestimating the risk involved`,
              `Acting without a structured plan`,
              `Relying on a single information source`,
            ];
      } else {
        fixedSlide.content.options = opts.slice(0, 6).map((o: any) =>
          (typeof o === "string" && o.trim()) ? o.trim() : "—",
        );
      }
      if (typeof fixedSlide.content.correctAnswer !== "number") {
        fixedSlide.content.correctAnswer = 0;
      }
      fixedSlide.content.correctAnswer = Math.max(
        0,
        Math.min(fixedSlide.content.correctAnswer, fixedSlide.content.options.length - 1),
      );
      break;
    }

    case "timeline":
      if (!fixedSlide.content.title) fixedSlide.content.title = isHe ? `ציר הזמן של ${shortSub}` : `Timeline of ${shortSub}`;
      if (!fixedSlide.content.events || !Array.isArray(fixedSlide.content.events)) {
        fixedSlide.content.events = [];
      }
      while (fixedSlide.content.events.length < 4) {
        fixedSlide.content.events.push({
          year: `${2020 + fixedSlide.content.events.length}`,
          title: isHe ? `אירוע ${fixedSlide.content.events.length + 1}` : `Event ${fixedSlide.content.events.length + 1}`,
          description: isHe ? `תיאור קצר של מה שקרה ואיך זה השפיע` : `Brief description of what happened and its impact`,
        });
      }
      fixedSlide.content.events = fixedSlide.content.events.slice(0, 4);
      break;

    case "scale":
      if (!fixedSlide.content.question) {
        fixedSlide.content.question = isHe
          ? `עד כמה אתם מרגישים שאתם מבינים את ${shortSub} ברמה שמאפשרת לכם לקבל החלטות?`
          : `How well do you feel you understand ${shortSub} at a decision-making level?`;
      }
      if (!fixedSlide.content.minLabel) fixedSlide.content.minLabel = isHe ? "בכלל לא" : "Not at all";
      if (!fixedSlide.content.maxLabel) fixedSlide.content.maxLabel = isHe ? "ברמה גבוהה מאוד" : "Very high level";
      break;

    case "poll": {
      if (!fixedSlide.content.question) {
        fixedSlide.content.question = isHe
          ? `מה הדבר הראשון שאתם הייתם רוצים להבין לעומק ב${shortSub}?`
          : `What's the first thing you'd want to deeply understand about ${shortSub}?`;
      }
      const pollOpts = fixedSlide.content.options || [];
      if (pollOpts.length < 2 || pollOpts.some((o: any) => !String(o || "").trim() || String(o || "").trim().length < 5)) {
        fixedSlide.content.options = isHe
          ? [
              `הבסיס התיאורטי — הגדרות ומושגים`,
              `ההיבט הפרקטי — איך עושים את זה בפועל`,
              `הסיכונים — מה יכול להשתבש`,
              `המגמות — לאן הנושא הולך`,
            ]
          : [
              `The theory — definitions and core concepts`,
              `The practice — how to actually do it`,
              `The risks — what can go wrong`,
              `The trends — where this is heading`,
            ];
      } else {
        fixedSlide.content.options = pollOpts.slice(0, 6).map((o: any) =>
          (typeof o === "string" && o.trim()) ? o.trim() : "—",
        );
      }
      break;
    }

    case "poll_quiz": {
      if (!fixedSlide.content.question) {
        fixedSlide.content.question = isHe
          ? `איזו אמירה הכי מדויקת לגבי ${shortSub}?`
          : `Which statement is most accurate about ${shortSub}?`;
      }
      const pqOpts = fixedSlide.content.options || [];
      if (pqOpts.length < 2 || pqOpts.some((o: any) => !String(o || "").trim() || String(o || "").trim().length < 5)) {
        fixedSlide.content.options = isHe
          ? [
              `${shortSub} מתאים לכולם ללא יוצא מן הכלל`,
              `ההצלחה תלויה בתכנון מוקדם ובהבנת הסיכונים`,
              `אין צורך בידע מקדים כדי להתחיל`,
              `התוצאות מובטחות לטווח הקצר`,
            ]
          : [
              `${shortSub} works for everyone without exception`,
              `Success depends on planning and risk awareness`,
              `No prior knowledge is needed to get started`,
              `Short-term results are guaranteed`,
            ];
      } else {
        fixedSlide.content.options = pqOpts.slice(0, 6).map((o: any) =>
          (typeof o === "string" && o.trim()) ? o.trim() : "—",
        );
      }
      if (typeof fixedSlide.content.correctAnswer !== "number") {
        fixedSlide.content.correctAnswer = 1; // The "planning and risk" option is typically correct
      }
      fixedSlide.content.correctAnswer = Math.max(
        0,
        Math.min(fixedSlide.content.correctAnswer, fixedSlide.content.options.length - 1),
      );
      break;
    }

    case "yesno":
      if (!fixedSlide.content.question) {
        fixedSlide.content.question = isHe
          ? `האם לדעתכם אפשר להצליח ב${shortSub} בלי ניסיון קודם?`
          : `Do you think it's possible to succeed in ${shortSub} without prior experience?`;
      }
      if (typeof fixedSlide.content.correctIsYes !== "boolean") {
        fixedSlide.content.correctIsYes = true;
      }
      break;

    case "ranking": {
      const items = fixedSlide.content.items || [];
      if (items.length < 2 || items.some((i: any) => !String(i || "").trim() || /^item\s*\d+$/i.test(String(i || "")))) {
        fixedSlide.content.items = isHe
          ? [
              `הבנת הבסיס התיאורטי`,
              `ניסיון מעשי ראשון`,
              `ליווי של מומחה`,
              `מעקב אחרי מגמות שוק`,
            ]
          : [
              `Understanding the theoretical foundation`,
              `First practical experience`,
              `Guidance from an expert`,
              `Tracking market trends`,
            ];
      } else {
        fixedSlide.content.items = items.slice(0, 6).map((i: any) =>
          (typeof i === "string" && i.trim()) ? i.trim() : "—",
        );
      }
      if (!fixedSlide.content.question) {
        fixedSlide.content.question = isHe
          ? `דרגו לפי חשיבות — מה הכי קריטי להצלחה ב${shortSub}?`
          : `Rank by importance — what's most critical for success in ${shortSub}?`;
      }
      break;
    }

    case "guess_number":
      if (!fixedSlide.content.question) {
        fixedSlide.content.question = isHe
          ? `נחשו: מה האחוז של אנשים שמצליחים ב${shortSub} בניסיון הראשון?`
          : `Guess: what percentage of people succeed in ${shortSub} on their first try?`;
      }
      if (typeof fixedSlide.content.correctNumber !== "number") fixedSlide.content.correctNumber = 23;
      if (typeof fixedSlide.content.min !== "number") fixedSlide.content.min = 0;
      if (typeof fixedSlide.content.max !== "number") fixedSlide.content.max = 100;
      break;

    case "sentiment_meter":
      if (!fixedSlide.content.question || !String(fixedSlide.content.question).trim()) {
        fixedSlide.content.question = isHe
          ? `עד כמה אתם מרגישים בטוחים ביכולת שלכם לנווט ב${shortSub}?`
          : `How confident do you feel in your ability to navigate ${shortSub}?`;
      }
      if (!fixedSlide.content.leftLabel) fixedSlide.content.leftLabel = isHe ? "לא בטוח בכלל" : "Not confident at all";
      if (!fixedSlide.content.rightLabel) fixedSlide.content.rightLabel = isHe ? "בטוח לחלוטין" : "Completely confident";
      break;

    case "agree_spectrum":
      if (!fixedSlide.content.statement) {
        fixedSlide.content.statement = isHe
          ? `כדי להצליח ב${shortSub}, חובה להשקיע לפחות שנה בלימוד לפני שעושים צעד ראשון`
          : `To succeed in ${shortSub}, you must invest at least a year of study before taking your first step`;
      }
      if (!fixedSlide.content.leftLabel) fixedSlide.content.leftLabel = isHe ? "ממש לא מסכים/ה" : "Strongly disagree";
      if (!fixedSlide.content.rightLabel) fixedSlide.content.rightLabel = isHe ? "מסכים/ה לחלוטין" : "Strongly agree";
      break;
  }

  if (rawUserInput) {
    fixEchoMetaInSlide(fixedSlide, rawUserInput, subject);
    stripPromptEchoFromSlideDeep(fixedSlide as RawSlide, rawUserInput, subject);
  }

  return fixedSlide;
}

function optionLooksGeneric(s: string): boolean {
  const t = String(s || "").trim();
  if (t.length < 8) return true;
  if (/^(option\s*[0-9a-d]?|choice\s*\d+)$/i.test(t)) return true;
  if (/^item\s*\d+$/i.test(t)) return true;
  if (/^[abcd]$/i.test(t)) return true;
  if (/^point\s*\d+$/i.test(t)) return true;
  return false;
}

function quizPollOptionsAreDeficient(slide: RawSlide): boolean {
  const ty = String(slide.type || "");
  if (ty !== "quiz" && ty !== "poll" && ty !== "poll_quiz") return false;
  const opts = slide.content?.options;
  if (!Array.isArray(opts) || opts.length < 4) return true;
  return opts.every((o: unknown) => optionLooksGeneric(String(o)));
}

function wordCountRough(s: string): number {
  return String(s || "").trim().split(/\s+/).filter(Boolean).length;
}

function slideContentIsThin(slide: any, subject: string, rawUserInput?: string): boolean {
  const c = slide?.content || {};
  const t = String(slide?.type || "");

  if (t === "title") {
    const title = String(c.title || "").trim();
    const sub = String(c.subtitle || "").trim();
    if (!sub || sub.length < 12) return true;
    if (title.length < 5 || title.length > 90) return true;
  }
  if (t === "content") {
    const text = String(c.text || "");
    if (!text.trim() || text.length < 80 || wordCountRough(text) < 15) return true;
  }
  if (t === "split_content") {
    const text = String(c.text || "").trim();
    const bps = Array.isArray(c.bulletPoints) ? c.bulletPoints : [];
    if (text) {
      const lines = text.split(/\n/).map((l: string) => l.trim()).filter(Boolean);
      if (text.length < 60 || lines.length < 3) return true;
    } else if (bps.length) {
      if (bps.length < 3 || bps.some((b: unknown) => String(b).trim().length < 15)) return true;
    } else return true;
  }
  if (t === "quiz" || t === "poll" || t === "poll_quiz") {
    const q = String(c.question || "").trim();
    const opts = Array.isArray(c.options) ? c.options : [];
    if (q.length < 25) return true;
    if (opts.length < 4) return true;
    if (opts.some((o: unknown) => optionLooksGeneric(String(o)))) return true;
  }
  if (t === "wordcloud" || t === "scale" || t === "yesno" || t === "sentiment_meter") {
    const q = String(c.question || "").trim();
    if (q.length < 20) return true;
  }
  if (t === "agree_spectrum") {
    const st = String(c.statement || "").trim();
    if (st.length < 25) return true;
  }
  if (t === "bullet_points") {
    const pts = Array.isArray(c.points) ? c.points : [];
    if (pts.length < 3) return true;
    if (pts.some((p: any) => String(p?.title ?? p ?? "").trim().length < 5)) return true;
  }
  if (t === "timeline") {
    const ev = Array.isArray(c.events) ? c.events : [];
    if (ev.length < 4) return true;
    if (ev.some((e: any) => String(e?.description || "").trim().length < 15)) return true;
  }
  if (t === "ranking") {
    const items = Array.isArray(c.items) ? c.items : [];
    if (items.length < 4) return true;
    if (items.some((it: unknown) => /^item\s*\d+$/i.test(String(it || "").trim()))) return true;
  }

  if (["title", "split_content", "poll", "wordcloud"].includes(t)) {
    const ip = String(slide?.imagePrompt || "").trim();
    if (ip.length < 30) return true;
  }
  return false;
}

async function repairSlideWithAI(
  apiKey: string,
  slide: RawSlide,
  index: number,
  subject: string,
  mode: "education" | "webinar",
  rawUserInput?: string,
): Promise<RawSlide> {
  const isHe = subjectLanguageIsHebrew(subject);

  const sys = `Expert presentation rewriter. Topic: ${JSON.stringify(subject)}. Lang: ${isHe ? "Hebrew" : "English"}. Mode: ${mode}.
Rewrite the slide with SPECIFICITY: real numbers, named concepts, concrete examples. Keep same "type".
Rules: quiz/poll 4 options ≥15 chars each; content ≥100 chars with a fact; imagePrompt ≥50 chars cinematic no text.
${getTypeSchemaForTypes([slide.type])}
Output ONE JSON: {"type":"...","content":{...},"imagePrompt":"..."}`;

  const payload = { type: slide.type, content: slide.content, imagePrompt: slide.imagePrompt };
  const raw = await callAI(apiKey, sys, `Rewrite slide ${index + 1}:\n${JSON.stringify(payload)}`, {
    responseSchema: GEMINI_SINGLE_SLIDE_SCHEMA,
    maxOutputTokens: 2048,
    temperature: 0.45,
  });
  let parsed = parseModelJson(raw);
  if (Array.isArray(parsed) && parsed.length > 0) parsed = parsed[0];
  if (!parsed || typeof parsed !== "object" || !parsed.type) {
    throw new Error("repairSlideWithAI: invalid parse");
  }
  const out = parsed as RawSlide;
  if (rawUserInput) stripPromptEchoFromSlideDeep(out, rawUserInput, subject);
  return out;
}

async function batchRepairThinSlides(
  apiKey: string,
  slides: RawSlide[],
  subject: string,
  mode: "education" | "webinar",
  rawUserInput?: string,
): Promise<RawSlide[]> {
  const out: RawSlide[] = slides.map((s) => ({ ...s, content: { ...(s.content || {}) } }));

  const thinIndices: number[] = [];
  for (let i = 0; i < out.length; i++) {
    if (slideContentIsThin(out[i], subject, rawUserInput)) {
      thinIndices.push(i);
    }
  }
  if (thinIndices.length === 0) return out;

  const isHe = subjectLanguageIsHebrew(subject);
  const thinTypes = thinIndices.map((i) => out[i].type);

  if (thinIndices.length === 1) {
    try {
      const idx = thinIndices[0];
      const repaired = await repairSlideWithAI(apiKey, out[idx], idx, subject, mode, rawUserInput);
      out[idx] = validateAndFixSlide(repaired, idx, subject, rawUserInput);
    } catch (e) {
      console.warn("[generate-slides] Single repair failed:", e);
    }
    return out;
  }

  const slidesPayload = thinIndices.map((i) => ({
    slideIndex: i + 1,
    type: out[i].type,
    content: out[i].content,
    imagePrompt: out[i].imagePrompt,
  }));

  const sys = `Expert rewriter. Topic: ${JSON.stringify(subject)}. Lang: ${isHe ? "Hebrew" : "English"}. Mode: ${mode}.
Rewrite each slide with SPECIFICITY: real numbers, named concepts, examples. Keep each "type" unchanged.
${getTypeSchemaForTypes(thinTypes)}
${CONTENT_QUALITY_FRAMEWORK}
Return a JSON ARRAY of ${thinIndices.length} slides (same order as input). Each: {"type":"...","content":{...},"imagePrompt":"..."}`;

  try {
    const raw = await callAI(apiKey, sys, `Rewrite these ${thinIndices.length} weak slides:\n${JSON.stringify(slidesPayload)}`, {
      maxOutputTokens: 8192,
      temperature: 0.45,
    });
    const parsed = parseModelJson(raw);
    const arr = normalizeToSlidesArray(parsed) ?? (Array.isArray(parsed) ? parsed : null);
    if (arr && arr.length > 0) {
      for (let j = 0; j < Math.min(arr.length, thinIndices.length); j++) {
        const idx = thinIndices[j];
        if (arr[j] && typeof arr[j] === "object" && arr[j].type) {
          out[idx] = validateAndFixSlide(arr[j], idx, subject, rawUserInput);
          console.log(`[generate-slides] Batch-repaired slide ${idx + 1}`);
        }
      }
    }
  } catch (e) {
    console.warn("[generate-slides] Batch repair failed, falling back to parallel per-slide:", e);

    const repairTasks = thinIndices.slice(0, 6).map((i) => async () => {
      const repaired = await repairSlideWithAI(apiKey, out[i], i, subject, mode, rawUserInput);
      return { index: i, repaired };
    });
    const results = await parallelWithLimit(repairTasks, 3);
    for (const result of results) {
      if (result.status === "fulfilled") {
        out[result.value.index] = validateAndFixSlide(result.value.repaired, result.value.index, subject, rawUserInput);
      }
    }
  }

  const stillThin: number[] = [];
  for (let i = 0; i < out.length; i++) {
    if (slideContentIsThin(out[i], subject, rawUserInput)) stillThin.push(i);
  }
  if (stillThin.length > 0 && stillThin.length <= 3) {
    const tasks = stillThin.map((i) => async () => {
      const repaired = await repairSlideWithAI(apiKey, out[i], i, subject, mode, rawUserInput);
      return { index: i, repaired };
    });
    const results = await parallelWithLimit(tasks, 3);
    for (const r of results) {
      if (r.status === "fulfilled") {
        out[r.value.index] = validateAndFixSlide(r.value.repaired, r.value.index, subject, rawUserInput);
      }
    }
  }
  return out;
}

async function enrichThinSlides(
  apiKey: string,
  slides: RawSlide[],
  subject: string,
  mode: "education" | "webinar",
  rawUserInput?: string,
): Promise<RawSlide[]> {
  return batchRepairThinSlides(apiKey, slides, subject, mode, rawUserInput);
}

async function ensureQuizPollOptionsFilled(
  apiKey: string,
  slide: RawSlide,
  index: number,
  subject: string,
  mode: "education" | "webinar",
  rawUser?: string,
): Promise<RawSlide> {
  if (!quizPollOptionsAreDeficient(slide)) return slide;
  try {
    const repaired = await repairSlideWithAI(apiKey, slide, index, subject, mode, rawUser);
    let out = validateAndFixSlide(repaired, index, subject, rawUser);
    if (!quizPollOptionsAreDeficient(out)) return out;

    return out;
  } catch (e) {
    console.warn(`[generate-slides] ensureQuizPollOptionsFilled failed idx ${index}:`, e);
    return validateAndFixSlide(slide, index, subject, rawUser);
  }
}

const INTERACTIVE_QUESTION_DEDUPE_TYPES = new Set([
  "quiz", "poll", "poll_quiz", "yesno", "wordcloud", "scale",
  "ranking", "guess_number", "sentiment_meter", "agree_spectrum",
]);

function normalizeInteractiveQuestionFingerprint(slide: RawSlide): string {
  const c = slide?.content || {};
  const t = String(slide?.type || "");
  if (t === "agree_spectrum") {
    return String(c.statement || "").trim().toLowerCase().replace(/\s+/g, " ").slice(0, 200);
  }
  return String(c.question || "").trim().toLowerCase().replace(/\s+/g, " ").slice(0, 200);
}

async function dedupeInteractiveQuestions(
  apiKey: string,
  slides: RawSlide[],
  subject: string,
  mode: "education" | "webinar",
  rawUser: string,
): Promise<RawSlide[]> {
  const seen = new Set<string>();
  const out = slides.map((s) => ({ ...s, content: { ...(s.content || {}) } }));

  const dupeIndices: number[] = [];
  for (let i = 0; i < out.length; i++) {
    const typ = String(out[i]?.type || "");
    if (!INTERACTIVE_QUESTION_DEDUPE_TYPES.has(typ)) continue;
    const fp = normalizeInteractiveQuestionFingerprint(out[i]);
    if (fp.length < 12) continue;
    if (!seen.has(fp)) {
      seen.add(fp);
      continue;
    }
    dupeIndices.push(i);
  }

  if (dupeIndices.length === 0) return out;

  const repairTasks = dupeIndices.map((i) => async () => {
    const repaired = await repairSlideWithAI(apiKey, out[i], i, subject, mode, rawUser);
    return { index: i, repaired };
  });

  const results = await parallelWithLimit(repairTasks, 3);
  for (const result of results) {
    if (result.status === "fulfilled") {
      const { index, repaired } = result.value;
      out[index] = validateAndFixSlide(repaired, index, subject, rawUser);
    } else {
      console.warn(`[generate-slides] dedupe repair failed:`, result.reason);
    }
  }

  return out;
}

function ensureOpeningTitleSlideEchoFix(slides: RawSlide[], rawUserInput: string, subject: string): void {
  if (!slides?.length || !String(rawUserInput || "").trim()) return;
  const first = slides[0];
  if (String(first?.type) !== "title") return;
  fixEchoMetaInSlide(first, rawUserInput, subject);
}

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

  const gradientPreset = selectGradientForSlide(rawSlide.type, index, theme);
  const designStyle = selectDesignStyle(rawSlide.type, index);

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

  /** Quiz-category slides: timed; breakdown hidden on presenter until timer ends (matches frontend). */
  const quizActivitySettings = {
    duration: 30,
    showResults: true,
    interactionStyle: "bar_chart",
    pointsForCorrect: 1000,
    pointsForParticipation: 500,
  };

  /** Interactive engagement: no timer; presenter sees responses live (education + webinar). */
  const interactiveActivitySettings = {
    duration: 0,
    showResults: true,
    interactionStyle: "bar_chart",
    pointsForCorrect: 0,
    pointsForParticipation: 0,
  };

  const baseActivitySettings = {
    duration: 20,
    showResults: true,
    interactionStyle: "bar_chart",
    pointsForCorrect: 1000,
    pointsForParticipation: 500,
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
    /** Legacy AI output; never offered in prompts — maps to wordcloud */
    finishSentence: "wordcloud",
    finish_sentence: "wordcloud",
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
      const rawPts = (rawSlide.content.points || rawSlide.content.items || []).slice(0, 6);
      mappedContent = {
        title: rawSlide.content.title || "Key Points",
        points: rawPts.map((p: any) => {
          const t = typeof p === "string" ? p : (p?.title ?? p);
          const d = typeof p === "object" && p?.description != null ? p.description : "";
          return {
            title: (typeof t === "string" && t.trim()) ? t.trim() : "—",
            description: (typeof d === "string" && d.trim()) ? d.trim() : "",
          };
        }),
      };
      break;
    }

    case "bar_chart": {
      const rawBars = (rawSlide.content.bars || rawSlide.content.data || []).slice(0, 6);
      mappedContent = {
        title: rawSlide.content.title || "Data",
        subtitle: rawSlide.content.subtitle || "",
        bars: rawBars.map((b: any) => ({
          label: String(b?.label ?? b?.name ?? "").trim() || "—",
          value: typeof b?.value === "number" ? b.value : 50,
        })),
      };
      break;
    }

    case "quiz": {
      const quizOpts = (rawSlide.content.options || []).slice(0, 6);
      mappedContent = {
        question: rawSlide.content.question || "Question?",
        options: quizOpts.length >= 2 ? quizOpts : ["A", "B", "C", "D"],
        correctAnswer: typeof rawSlide.content.correctAnswer === "number" ? rawSlide.content.correctAnswer : 0,
      };
      break;
    }

    case "poll": {
      const pollOpts = (rawSlide.content.options || []).slice(0, 6);
      mappedContent = {
        question: rawSlide.content.question || "What do you think?",
        options: pollOpts.length >= 2 ? pollOpts : ["Option 1", "Option 2", "Option 3", "Option 4"],
      };
      if (imageUrl) {
        baseDesign.overlayImageUrl = imageUrl;
        baseDesign.overlayImagePosition = "background";
      }
      break;
    }

    case "wordcloud": {
      const wcQ = rawSlide.content.question;
      const wcFromSentence = rawSlide.content.sentenceStart;
      mappedContent = {
        question: (typeof wcQ === "string" && wcQ.trim())
          ? wcQ.trim()
          : (typeof wcFromSentence === "string" && wcFromSentence.trim())
            ? String(wcFromSentence).trim()
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
      const rankItems = (rawSlide.content.items || []).slice(0, 6);
      mappedContent = {
        question: rawSlide.content.question || "Rank these items:",
        items: rankItems.length >= 2 ? rankItems : ["Item 1", "Item 2", "Item 3", "Item 4"],
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
      const pqOpts = (rawSlide.content.options || []).slice(0, 6);
      mappedContent = {
        question: rawSlide.content.question || "What do you think?",
        options: pqOpts.length >= 2 ? pqOpts : ["Option 1", "Option 2", "Option 3", "Option 4"],
        correctAnswer: typeof rawSlide.content.correctAnswer === "number"
          ? Math.min(rawSlide.content.correctAnswer, (pqOpts.length || 4) - 1)
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

  const interactiveTypes = new Set([
    "poll",
    "wordcloud",
    "scale",
    "sentiment_meter",
    "agree_spectrum",
  ]);
  const quizTypes = new Set([
    "quiz",
    "poll_quiz",
    "yesno",
    "ranking",
    "guess_number",
  ]);
  const activitySettingsForSlide = interactiveTypes.has(normalizedType)
    ? interactiveActivitySettings
    : quizTypes.has(normalizedType)
    ? quizActivitySettings
    : baseActivitySettings;

  return {
    id: generateSlideId(),
    type: normalizedType === "content" ? "content" : normalizedType,
    content: mappedContent,
    design: baseDesign,
    layout: "centered",
    activitySettings: activitySettingsForSlide,
    order: index,
  };
}

const TYPE_SCHEMA_MAP: Record<string, string> = {
  title: `title: title (compelling headline), subtitle (learning outcomes). imagePrompt required.`,
  split_content: `split_content: title, text (3-4 lines separated by \\n, each a complete thought). imagePrompt required.`,
  content: `content: title, text (≥100 chars paragraph with real substance).`,
  timeline: `timeline: title, events (4 items: {year, title, description≥25chars}).`,
  bullet_points: `bullet_points: title, points (3-5 items: {title, description}).`,
  bar_chart: `bar_chart: title, bars (4-6 items: {label, value} — real category labels).`,
  quiz: `quiz: question (≥40 chars), options (4 strings ≥15 chars each, plausible distractors), correctAnswer (0-3).`,
  poll: `poll: question (≥40 chars), options (4 strings ≥15 chars, distinct perspectives).`,
  wordcloud: `wordcloud: question (open-ended, personal reflection).`,
  scale: `scale: question (self-assessment), minLabel, maxLabel.`,
  yesno: `yesno: question (debatable), correctIsYes (boolean).`,
  ranking: `ranking: question, items (4 strings, real factors for this topic).`,
  guess_number: `guess_number: question (surprising stat), correctNumber, min, max.`,
  sentiment_meter: `sentiment_meter: question (emotional check-in), leftLabel, rightLabel.`,
  agree_spectrum: `agree_spectrum: statement (bold debatable claim), leftLabel, rightLabel.`,
  poll_quiz: `poll_quiz: question, options (4 strings ≥15 chars), correctAnswer (0-3).`,
};

function getTypeSchemaForTypes(types: string[]): string {
  const unique = [...new Set(types)];
  const lines = unique
    .map((t) => TYPE_SCHEMA_MAP[t])
    .filter(Boolean);
  if (lines.length === 0) return Object.values(TYPE_SCHEMA_MAP).join("\n");
  return `## REQUIRED FIELDS PER TYPE\n` + lines.join("\n");
}

const SLIDE_TYPE_SCHEMA = `## REQUIRED FIELDS PER TYPE\n` + Object.values(TYPE_SCHEMA_MAP).join("\n");

const CONTENT_QUALITY_FRAMEWORK = `
## QUALITY RULES (MANDATORY)
1. SPECIFICITY: Every slide needs ≥1 of: a real number/stat, a named entity, a concrete example, a precise definition, or a counterintuitive fact.
2. OPTIONS TEACH: Quiz distractors = common misconceptions. Poll options = distinct real perspectives. Each ≥15 chars.
3. QUESTIONS PROVOKE: Not "what do you think?" but "what's the #1 reason people fail at X?" — specific, personal, emotional.
4. EXPERT VOICE: Use "you", lead with the interesting fact, short sentences for impact. No hedging.
5. FORBIDDEN: "Option A", "Point 1", "Important detail", "Introduction to X", generic filler.
6. ANTI-ECHO: Never paste the user's request into any slide field. All text must be NEW teaching content.
`;

function buildInstructionalDesignPrompt(description: string, audience: string, slideCount: number): string {
  const effectiveSlideCount = Math.min(Math.max(slideCount, 3), 10);
  const band = slideCountBandInstruction(effectiveSlideCount);

  return `
You are a world-class Instructional Designer who creates presentations that make audiences say "wow, I learned something real."
${CONTENT_QUALITY_FRAMEWORK}

## YOUR TASK
${band}
Create an interactive presentation about: "${description}"
Target Audience: ${audience}

## LANGUAGE DETECTION (CRITICAL)
- If the topic is in Hebrew → ALL content MUST be in Hebrew (natural, fluent, professional Hebrew)
- If the topic is in English → ALL content MUST be in English
- Never mix languages within a slide

## AVAILABLE SLIDE TYPES

### CONTENT SLIDES (teach something specific)
1. "title" → Opening: a title that creates CURIOSITY + subtitle that promises VALUE. MUST include imagePrompt.
2. "split_content" → Visual + 3-4 bullet lines. Each line = one complete insight. MUST include imagePrompt.
3. "content" → Deep text slide. Minimum 2-3 sentences with a real example or data point.
4. "timeline" → Exactly 4 events with real years and vivid 25+ char descriptions.
5. "bullet_points" → 3-5 points, each with a concept name (title) and WHY it matters (description).
6. "bar_chart" → 4-6 bars with real category labels and realistic values.

### INTERACTIVE SLIDES (engage the audience)
7. "quiz" → 4 plausible options. Correct answer teaches something. Distractors = common misconceptions.
8. "poll" → 4 distinct perspectives. No "right" answer — all valid viewpoints.
9. "wordcloud" → One powerful open question that invites personal reflection.
10. "scale" → A self-assessment that makes people think honestly about themselves.
11. "yesno" → A debatable question where smart people disagree.
12. "ranking" → 4 real factors/priorities to rank.
13. "guess_number" → A surprising statistic that teaches through surprise.
14. "sentiment_meter" → An emotional check-in relevant to the topic.
15. "agree_spectrum" → A BOLD claim about the topic that divides the audience.

## SLIDE ARC (build momentum)
Slide 1: "title" — hook with intrigue
Slide 2: "split_content" — surprise with a fact or stat
Slide 3: "quiz" or "poll" — test or engage immediately
Middle slides: alternate content + interactive
Last slide: "agree_spectrum" or "scale" — leave them thinking

${SLIDE_TYPE_SCHEMA}

## IMAGE RULES
- imagePrompt: describe a VISUAL scene. NO text, words, or letters in the image.
- Be cinematic: "A single spotlight illuminating a golden key on a dark velvet surface" NOT "picture of finance"

## OUTPUT FORMAT (CRITICAL)
Return a single JSON object (no markdown, no code blocks):
{
  "interpretation": "1-2 sentences: what the audience should walk away knowing",
  "plan": "Brief plan: the narrative arc across slides (2-4 sentences)",
  "slides": [
    {"type":"...","content":{...},"imagePrompt":"..." optional},
    ...one object per slide
  ]
}
`;
}

function buildProInstructionalDesignPrompt(
  description: string,
  audience: string,
  slideCount: number,
  userAiSettings: { who_am_i?: string; what_i_lecture?: string; teaching_style?: string; additional_context?: string } | null,
  difficulty = "intermediate",
): string {
  const effectiveSlideCount = Math.min(Math.max(slideCount, 3), AI_OPTIMAL_SLIDES_MAX);
  const band = slideCountBandInstruction(effectiveSlideCount);
  const difficultyNote =
    difficulty === "beginner"
      ? "Use simpler language. Explain jargon. More examples, fewer abstract concepts."
      : difficulty === "advanced"
        ? "Assume expertise. Use technical terms freely. Focus on nuance, edge cases, and advanced strategies."
        : "Balance accessibility with depth. Define key terms briefly, then go deep.";
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
You are a world-class Instructional Designer who creates presentations that make audiences say "wow, I learned something real."
${CONTENT_QUALITY_FRAMEWORK}

## USER REQUEST
"${description}"
Target Audience: ${audience}
Difficulty: ${difficulty}. ${difficultyNote}
${userContext ? `\n## INSTRUCTOR CONTEXT (personalize content to match their voice)\n${userContext}\n` : ""}

## YOUR TASK
1. DEEP REASONING: What does the user actually want to teach? What should the audience FEEL and KNOW after this presentation?
2. CHOOSE SLIDE TYPES DYNAMICALLY: Match the topic. Technical topics need more content slides. Soft topics need more interactive slides.
3. ${band}

Available types: title, split_content, content, timeline, bullet_points, bar_chart, quiz, poll, wordcloud, scale, yesno, ranking, guess_number, sentiment_meter, agree_spectrum

## LANGUAGE
- Hebrew topic → ALL content in Hebrew (שוטפת, מקצועית, נגישה)
- English topic → ALL content in English

## IMAGE RULES
- imagePrompt: NO TEXT in images. Describe visual scenes cinematically.
${SLIDE_TYPE_SCHEMA}

## OUTPUT FORMAT (CRITICAL)
Return a single JSON object:
{
  "interpretation": "What the audience should walk away knowing (1-2 sentences)",
  "plan": "The narrative arc (2-4 sentences)",
  "slides": [
    { "type": "title", "content": { "title": "...", "subtitle": "..." }, "imagePrompt": "..." },
    ...one per slide (within the band; cap at ${effectiveSlideCount})
  ]
}
Valid JSON only. Each slide MUST have "type" and "content". Add "imagePrompt" for title, split_content, poll, wordcloud.
`;
}

function buildInteractiveOnlyPrompt(
  description: string,
  slideCount: number,
  difficulty: string,
  userAiSettings: { who_am_i?: string; what_i_lecture?: string; teaching_style?: string; additional_context?: string } | null
): string {
  const effectiveSlideCount = Math.min(Math.max(slideCount, 3), AI_OPTIMAL_SLIDES_MAX);
  const band = slideCountBandInstruction(effectiveSlideCount);
  const difficultyNote =
    difficulty === "beginner"
      ? "Use simple, accessible questions. Explain context within the question."
      : difficulty === "advanced"
        ? "Use challenging questions that test deep understanding. Include edge cases."
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
You are a world-class quiz and engagement designer. Create an INTERACTIVE-ONLY presentation that keeps audiences engaged and teaches through interaction.
${CONTENT_QUALITY_FRAMEWORK}

## USER REQUEST
"${description}"
${userContext ? `\n## INSTRUCTOR CONTEXT\n${userContext}\n` : ""}
Difficulty: ${difficulty}. ${difficultyNote}

## STRUCTURE
${band}
- Slide 1: "title" — intriguing opening. Include imagePrompt.
- All other slides: ONLY interactive types, each one DIFFERENT from the last.

Available interactive types: poll, quiz, poll_quiz, yesno, wordcloud, scale, ranking, guess_number, sentiment_meter, agree_spectrum

## CRITICAL QUALITY RULES
- **VARIETY**: Never use the same type twice in a row. Alternate between competitive (quiz, guess_number) and reflective (scale, sentiment_meter, agree_spectrum).
- **EACH QUESTION MUST BE UNIQUE**: Different angle, different aspect of the topic. If slide 3 asks about risks, slide 5 should ask about strategy or definitions.
- **OPTIONS MUST BE SPECIFIC**: "Diversify across 5+ asset classes" NOT "A good approach"
- **QUESTIONS MUST BE PRECISE**: "What % of day traders lose money in their first year?" NOT "Is day trading good?"

## LANGUAGE
- Hebrew topic → ALL content in Hebrew
- English topic → ALL content in English

${SLIDE_TYPE_SCHEMA}

## OUTPUT FORMAT
{
  "interpretation": "1-2 sentences: what the audience should walk away understanding",
  "plan": "Brief plan (2-4 sentences)",
  "slides": [
    { "type": "title", "content": { "title": "...", "subtitle": "..." }, "imagePrompt": "..." },
    { "type": "quiz", "content": { "question": "...", "options": ["A","B","C","D"], "correctAnswer": 2 } },
    ...one per slide within the band (at most ${effectiveSlideCount})
  ]
}
Valid JSON only. Add "imagePrompt" for title, poll, wordcloud.
`;
}

function buildInteractiveOnlyPlanPrompt(
  description: string,
  slideCount: number,
  difficulty: string,
  userAiSettings: { who_am_i?: string; what_i_lecture?: string; teaching_style?: string; additional_context?: string } | null
): string {
  const effectiveSlideCount = Math.min(Math.max(slideCount, 3), AI_OPTIMAL_SLIDES_MAX);
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
You are a world-class Instructional Designer planning an INTERACTIVE-ONLY presentation.

Slide 1 MUST be "title". All other slides MUST be from:
poll, quiz, poll_quiz, yesno, wordcloud, scale, ranking, guess_number, sentiment_meter, agree_spectrum

${band}
Return slideTypes array within that band (at most ${effectiveSlideCount}).

## PLANNING RULES
- Maximize VARIETY: never repeat the same type consecutively
- Each slide explores a DIFFERENT aspect of the topic
- Build an arc: icebreaker → knowledge test → deep reflection → action-oriented close

## USER REQUEST
"${description}"
${userContext ? `\n## INSTRUCTOR CONTEXT\n${userContext}\n` : ""}
Difficulty: ${difficulty}

## OUTPUT (JSON only)
{
  "interpretation": "1-2 sentences: what you understood and the learning goals",
  "plan": "Brief plan: what each interactive slide will explore and why (2-4 sentences)",
  "teachableSubject": "short noun phrase for the topic (≤80 chars), never the full user message",
  "slideTypes": ["title", "poll", "quiz", ...]
}
`;
}

const INTERACTIVE_ONLY_SLIDE_TYPES = new Set([
  "poll", "quiz", "poll_quiz", "yesno", "wordcloud", "scale",
  "ranking", "guess_number", "sentiment_meter", "agree_spectrum",
]);

function enforceInteractiveOnlySlideTypes(slideTypes: string[], maxPlanCap: number): string[] {
  const maxAllowed = Math.min(Math.max(maxPlanCap, 3), AI_OPTIMAL_SLIDES_MAX);
  const out: string[] = [];
  out.push("title");
  const desired = slideTypes.filter((t) => typeof t === "string").map((t) => t.trim());
  for (const t of desired) {
    if (out.length >= maxAllowed) break;
    if (out.length === 1 && t === "title") continue;
    out.push(INTERACTIVE_ONLY_SLIDE_TYPES.has(t) ? t : "poll");
  }
  const naturalLen = out.length;
  const targetLen = Math.min(maxAllowed, Math.max(3, naturalLen));
  const fallbackSeq = ["poll", "quiz", "scale", "wordcloud", "yesno", "agree_spectrum", "ranking", "sentiment_meter", "poll_quiz"];
  let i = 0;
  while (out.length < targetLen) {
    out.push(fallbackSeq[i % fallbackSeq.length]);
    i++;
  }
  return out.slice(0, targetLen);
}

function enforceInteractiveOnlySlides(rawSlides: any[], slideCount: number, userTopic?: string): any[] {
  const desiredCount = Math.min(Math.max(slideCount, 3), AI_OPTIMAL_SLIDES_MAX);
  const hint = (userTopic || "this topic").trim().slice(0, 100);
  const result: any[] = [];
  for (let i = 0; i < rawSlides.length && result.length < desiredCount; i++) {
    const s = rawSlides[i] || {};
    const t = String(s.type || "").trim();
    if (result.length === 0) {
      result.push(t === "title" ? s : { type: "title", content: { title: s?.content?.title || "Title", subtitle: s?.content?.subtitle || "" }, imagePrompt: s?.imagePrompt });
      continue;
    }
    if (INTERACTIVE_ONLY_SLIDE_TYPES.has(t)) {
      result.push(s);
    } else {
      const topic = (s?.content?.title || s?.content?.question || "").toString().trim();
      result.push({
        type: "poll",
        content: {
          question: topic
            ? `In the context of "${hint}", which statement best reflects: ${topic}?`
            : `Which angle on "${hint}" should we explore next?`,
          options: [
            "Foundations: definitions and how it works",
            "Practical use cases and examples",
            "Risks, limits, and common mistakes",
            "What to learn or do next",
          ],
        },
        imagePrompt: `Abstract professional background suggesting the theme of ${hint}, no text, no letters`,
      });
    }
  }
  let padIdx = 0;
  const padQuestions = [
    `What part of "${hint}" do you want to go deeper on next?`,
    `After "${hint}", which takeaway matters most to you?`,
    `How confident do you feel applying ideas from "${hint}"?`,
  ];
  while (result.length < desiredCount) {
    const q = padQuestions[padIdx % padQuestions.length];
    padIdx++;
    result.push({
      type: "poll",
      content: {
        question: q,
        options: [
          "Core concepts and definitions",
          "Examples and real-world use",
          "Pitfalls and how to avoid them",
          "Next steps and resources",
        ],
      },
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
  const effectiveSlideCount = Math.min(Math.max(slideCount, 3), AI_OPTIMAL_SLIDES_MAX);
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
You are a world-class Instructional Designer. Analyze the request and create a strategic plan.

## USER REQUEST
"${description}"
Target Audience: ${audience}
${userContext ? `\n## INSTRUCTOR CONTEXT\n${userContext}\n` : ""}

## YOUR TASK
1. What should the audience KNOW and FEEL after this presentation?
2. What's the narrative arc? (Hook → Build knowledge → Challenge assumptions → Call to action)
3. ${band} Return one entry in slideTypes per slide (at most ${effectiveSlideCount}).
4. Choose slide types that serve the CONTENT, not the other way around.

Types: title, split_content, content, timeline, bullet_points, bar_chart, quiz, poll, wordcloud, scale, yesno, ranking, guess_number, sentiment_meter, agree_spectrum

## PLANNING PRINCIPLES
- Start with "title" always
- Follow content slides with interactive slides (teach → test → reflect)
- Never put 3+ content slides in a row (audience loses engagement)
- Never put 3+ interactive slides in a row (feels like a quiz show)
- End with something reflective (agree_spectrum, scale, or sentiment_meter)

## OUTPUT FORMAT (JSON only, no markdown)
{
  "interpretation": "What the audience should walk away with (1-2 sentences)",
  "plan": "The narrative arc: what each section covers and why (2-4 sentences)",
  "teachableSubject": "short noun phrase for the topic (≤80 chars), never the full user message",
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
  const slidesSpec = slideTypes.map((t, i) => `${i + 1}: ${t}`).join(", ");

  const relevantSchema = getTypeSchemaForTypes(slideTypes);
  return `Expert presentation creator. Generate ${slideTypes.length} slides.
${CONTENT_QUALITY_FRAMEWORK}
REQUEST: "${description}"
Do NOT paste this into any slide. All text = NEW teaching content.
INTERPRETATION: ${interpretation}
PLAN: ${plan}
SLIDES: ${slidesSpec}
${relevantSchema}
CHECKLIST: quiz/poll 4 options ≥15 chars? content has a fact/number? title subtitle promises value? imagePrompt for title/split_content/poll/wordcloud ≥50 chars, no text in image? Language matches request?
OUTPUT: JSON array of ${slideTypes.length} slides: [{"type":"...","content":{...},"imagePrompt":"..."},...]
`;
}

function buildSingleSlidePrompt(slideType: string, prompt: string, style: string, includeImage: boolean): string {
  const typeInstructions: Record<string, string> = {
    title: `"title": {title: compelling headline, subtitle: learning outcomes}`,
    split_content: `"split_content": {title, text: "Insight1\\nInsight2\\nInsight3" (3-4 lines, each a fact/example)}`,
    content: `"content": {title, text: ≥100 chars paragraph with a specific fact or example}`,
    timeline: `"timeline": {title, events: [{year, title, description≥25chars}, ...4 total]}`,
    bullet_points: `"bullet_points": {title, points: [{title: concept, description: why it matters}, ...3-5]}`,
    bar_chart: `"bar_chart": {title, bars: [{label: real category, value: number}, ...4-6]}`,
    quiz: `"quiz": {question≥40chars, options: [4 strings ≥15chars, 3 plausible distractors + 1 correct], correctAnswer: 0-3}`,
    poll: `"poll": {question≥40chars, options: [4 distinct perspectives ≥15chars]}`,
    wordcloud: `"wordcloud": {question: personal open-ended reflection}`,
    scale: `"scale": {question: self-assessment, minLabel, maxLabel}`,
    sentiment_meter: `"sentiment_meter": {question: emotional check-in, leftLabel, rightLabel}`,
    yesno: `"yesno": {question: debatable, correctIsYes: boolean}`,
    ranking: `"ranking": {question, items: [4 real factors ≥15chars]}`,
    guess_number: `"guess_number": {question: surprising stat, correctNumber, min, max}`,
    agree_spectrum: `"agree_spectrum": {statement: bold debatable claim, leftLabel, rightLabel}`,
  };

  const instruction = typeInstructions[slideType] || typeInstructions.content;

  return `Expert presentation content creator. Topic: "${prompt}". Style: ${style}.
Generate one ${slideType} slide: ${instruction}
Language: match topic (Hebrew→Hebrew, English→English). Don't paste topic verbatim.
Quality: include ≥1 specific fact/number/named entity. Quiz/poll: 4 options ≥15 chars, distinct.${includeImage ? ` imagePrompt: cinematic visual, NO text/letters.` : ""}
Output: JSON {"type":"${slideType}","content":{...}${includeImage ? `,"imagePrompt":"..."` : ""}}`;
}

function selectThemeForTopic(topic: string): GeneratedTheme {
  const t = topic.toLowerCase();
  if (/tech|ai|cyber|digital|future|robot/.test(t)) return CINEMATIC_THEMES.find((th) => th.id === "neon-cyber")!;
  if (/kids|game|fun|creative|art/.test(t)) return CINEMATIC_THEMES.find((th) => th.id === "soft-pop")!;
  if (/history|story|culture|heritage/.test(t)) return CINEMATIC_THEMES.find((th) => th.id === "sunset-warmth")!;
  if (/ocean|nature|environment|science|biology/.test(t)) return CINEMATIC_THEMES.find((th) => th.id === "ocean-breeze")!;
  if (/business|corporate|professional|marketing/.test(t)) return CINEMATIC_THEMES.find((th) => th.id === "academic-pro")!;
  return CINEMATIC_THEMES.find((th) => th.id === "swiss-minimal")!;
}

type CallAiOptions = {
  responseSchema?: Record<string, unknown>;
  maxOutputTokens?: number;
  temperature?: number;
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
    temperature: options?.temperature ?? 0.55,
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

function fixedLectureModeContext(mode: "education" | "webinar"): string {
  if (mode === "webinar") {
    return `\n## PRODUCT CONTEXT: LIVE WEBINAR\nThis deck is for a live webinar. Use persuasive, audience-focused copy. Build toward a clear call-to-action. Make every slide feel like a conversation with the audience.\n`;
  }
  return `\n## PRODUCT CONTEXT: TEACHING / TRAINING\nThis deck is for teaching or training. Optimize for learning outcomes: define terms, build understanding step by step, test knowledge, and end with actionable takeaways.\n`;
}

async function generateRawSlideForDeck(
  apiKey: string,
  params: {
    index: number;
    slideType: string;
    description: string;
    plan: string;
    interpretation: string;
    contentSubject: string;
    contentType: string;
    resolvedLectureMode: "education" | "webinar";
  },
): Promise<RawSlide> {
  const {
    index,
    slideType,
    description,
    plan,
    interpretation,
    contentSubject,
    contentType,
    resolvedLectureMode,
  } = params;
  const progressiveContentType = contentType || "with_content";
  const effectiveSlideType =
    progressiveContentType === "interactive" && slideType !== "title" && !INTERACTIVE_ONLY_SLIDE_TYPES.has(slideType)
      ? "poll"
      : slideType;

  const subjectBlock = topicContractBlock(description, contentSubject);
  const ctxPrompt = plan && interpretation
    ? `Presentation about: "${contentSubject}". Plan: ${plan}. This is slide ${index + 1}. Context: ${interpretation}`
    : `Topic: "${contentSubject}".`;
  const includeImage = ["title", "split_content", "poll", "wordcloud"].includes(effectiveSlideType);
  const sysPrompt =
    subjectBlock +
    "\n\n" +
    buildSingleSlidePrompt(effectiveSlideType, ctxPrompt, "professional", includeImage) +
    fixedLectureModeContext(resolvedLectureMode);
  const rawContent = await callAI(
    apiKey,
    sysPrompt,
    `Generate a ${effectiveSlideType} slide about "${contentSubject}". Make it SPECIFIC and ENGAGING.`,
    { responseSchema: GEMINI_SINGLE_SLIDE_SCHEMA },
  );
  let rawSlide = parseModelJson(rawContent);
  if (Array.isArray(rawSlide) && rawSlide.length > 0) rawSlide = rawSlide[0];
  if (!rawSlide || typeof rawSlide !== "object") {
    throw new Error("Failed to parse slide from AI response");
  }
  rawSlide = validateAndFixSlide(rawSlide, index, contentSubject, description);
  if (index === 0 && String(rawSlide.type) === "title") {
    fixEchoMetaInSlide(rawSlide as RawSlide, description, contentSubject);
  }
  if (slideContentIsThin(rawSlide, contentSubject, description)) {
    try {
      const repaired = await repairSlideWithAI(
        apiKey,
        rawSlide as RawSlide,
        index,
        contentSubject,
        resolvedLectureMode,
        description,
      );
      rawSlide = validateAndFixSlide(repaired, index, contentSubject, description);
      if (index === 0 && String(rawSlide.type) === "title") {
        fixEchoMetaInSlide(rawSlide as RawSlide, description, contentSubject);
      }
      console.log(`[generate-slides] Full-deck slide ${index + 1} enriched (was thin)`);
    } catch (e) {
      console.warn("[generate-slides] Full-deck enrich failed:", e);
    }
  }
  if (["quiz", "poll", "poll_quiz"].includes(effectiveSlideType)) {
    rawSlide = await ensureQuizPollOptionsFilled(
      apiKey,
      rawSlide as RawSlide,
      index,
      contentSubject,
      resolvedLectureMode,
      description,
    );
  }
  return rawSlide as RawSlide;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
      teachableSubject: providedTeachableSubject,
      slideTypes: providedSlideTypes,
      progressiveSlide,
      asyncImages = true,
      lectureMode: rawLectureMode,
    } = body;

    const resolvedLectureMode: "education" | "webinar" = rawLectureMode === "webinar" ? "webinar" : "education";

    const GEMINI_API_KEY = requireGeminiApiKey();

    const inputText = singleSlide?.prompt || description || "";
    const hebrewRegex = /[\u0590-\u05FF]/;
    const detectedLanguage = hebrewRegex.test(inputText) ? "hebrew" : "english";
    console.log(`🌍 Detected language: ${detectedLanguage}`);

    if (singleSlide) {
      const { type, prompt, style = "professional", includeImage = false } = singleSlide;

      console.log(`🎯 Generating single ${type} slide`);

      const balanceCheck = await checkCreditsBalance(user.id, 1);
      if (!balanceCheck.allowed) {
        return new Response(
          JSON.stringify({ error: balanceCheck.error || "Insufficient credits" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const slideSubject = extractPresentationSubject(prompt);
      const subjectBlock = topicContractBlock(prompt, slideSubject);
      const systemPrompt =
        subjectBlock +
        "\n\n" +
        buildSingleSlidePrompt(type, slideSubject, style, includeImage) +
        fixedLectureModeContext(resolvedLectureMode);
      const rawContent = await callAI(
        GEMINI_API_KEY,
        systemPrompt,
        `Generate a ${type} slide about "${slideSubject}". Make it SPECIFIC and ENGAGING.`,
        { responseSchema: GEMINI_SINGLE_SLIDE_SCHEMA },
      );

      let rawSlide = parseModelJson(rawContent);
      if (Array.isArray(rawSlide) && rawSlide.length > 0) rawSlide = rawSlide[0];
      if (!rawSlide || typeof rawSlide !== "object") {
        throw new Error("Failed to parse slide from AI response");
      }

      rawSlide = validateAndFixSlide(rawSlide, 0, slideSubject, prompt);
      if (["quiz", "poll", "poll_quiz"].includes(type)) {
        rawSlide = await ensureQuizPollOptionsFilled(
          GEMINI_API_KEY,
          rawSlide as RawSlide,
          0,
          slideSubject,
          resolvedLectureMode,
          prompt,
        );
      }

      let generatedImageUrl: string | null = null;
      const slidesNeedingImages = ["title", "split_content", "poll", "wordcloud"];

      if (!skipImages && (includeImage || slidesNeedingImages.includes(type))) {
        const imagePromptText = rawSlide.imagePrompt ||
          `Professional cinematic visual about ${slideSubject}, abstract, no text`;
        generatedImageUrl = await generateImage(GEMINI_API_KEY, imagePromptText, type);
      }

      const selectedTheme = selectThemeForTopic(slideSubject);
      const mappedSlide = mapSlideToFrontendFormat(
        rawSlide as RawSlide,
        0,
        selectedTheme,
        detectedLanguage,
        generatedImageUrl || undefined,
        slideSubject,
      );

      const creditResult = await consumeCredits(user.id, 1, `Single slide generation: ${type}`);
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
      const slideSubject = extractPresentationSubject(desc);
      const subjectBlock = topicContractBlock(desc, slideSubject);
      const ctxPrompt = plan && interpretation
        ? `Presentation about: "${slideSubject}". Plan: ${plan}. Slide ${(index || 0) + 1}. Context: ${interpretation}`
        : `Topic: "${slideSubject}".`;
      const includeImage = ["title", "split_content", "poll", "wordcloud"].includes(effectiveSlideType);
      const sysPrompt =
        subjectBlock +
        "\n\n" +
        buildSingleSlidePrompt(effectiveSlideType, ctxPrompt, "professional", includeImage) +
        fixedLectureModeContext(resolvedLectureMode);
      const rawContent = await callAI(
        GEMINI_API_KEY,
        sysPrompt,
        `Generate a ${effectiveSlideType} slide about "${slideSubject}". Make it SPECIFIC and ENGAGING.`,
        { responseSchema: GEMINI_SINGLE_SLIDE_SCHEMA },
      );
      let rawSlide = parseModelJson(rawContent);
      if (Array.isArray(rawSlide) && rawSlide.length > 0) rawSlide = rawSlide[0];
      if (!rawSlide || typeof rawSlide !== "object") {
        throw new Error("Failed to parse slide from AI response");
      }
      rawSlide = validateAndFixSlide(rawSlide, index || 0, slideSubject, desc);
      if ((index || 0) === 0 && String(rawSlide.type) === "title") {
        fixEchoMetaInSlide(rawSlide as RawSlide, desc, slideSubject);
      }
      if (slideContentIsThin(rawSlide, slideSubject, desc)) {
        try {
          const repaired = await repairSlideWithAI(
            GEMINI_API_KEY,
            rawSlide,
            index || 0,
            slideSubject,
            resolvedLectureMode,
            desc,
          );
          rawSlide = validateAndFixSlide(repaired, index || 0, slideSubject, desc);
          if ((index || 0) === 0 && String(rawSlide.type) === "title") {
            fixEchoMetaInSlide(rawSlide as RawSlide, desc, slideSubject);
          }
          console.log(`[generate-slides] Progressive slide ${(index || 0) + 1} enriched (was thin)`);
        } catch (e) {
          console.warn("[generate-slides] Progressive enrich failed:", e);
        }
      }
      if (["quiz", "poll", "poll_quiz"].includes(effectiveSlideType)) {
        rawSlide = await ensureQuizPollOptionsFilled(
          GEMINI_API_KEY,
          rawSlide as RawSlide,
          index || 0,
          slideSubject,
          resolvedLectureMode,
          desc,
        );
      }
      let generatedImageUrl: string | null = null;
      if (!skipImages && ["title", "split_content", "poll", "wordcloud"].includes(effectiveSlideType) && rawSlide.imagePrompt) {
        generatedImageUrl = await generateImage(GEMINI_API_KEY, rawSlide.imagePrompt, effectiveSlideType);
      }
      const selectedTheme = selectThemeForTopic(slideSubject);
      const progressiveDetectedLanguage = hebrewRegex.test(slideSubject + desc) ? "hebrew" : "english";
      const mappedSlide = mapSlideToFrontendFormat(
        rawSlide as RawSlide,
        index || 0,
        selectedTheme,
        progressiveDetectedLanguage,
        generatedImageUrl || undefined,
        slideSubject,
      );
      const creditResult = await consumeCredits(user.id, 1, `Progressive slide ${(index || 0) + 1}`);
      if (!creditResult.success) {
        return new Response(JSON.stringify({ error: creditResult.error || "Failed to deduct credits" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const progressivePayload: Record<string, unknown> = {
        slide: mappedSlide,
        theme: { id: selectedTheme.id, themeName: selectedTheme.name, colors: selectedTheme.colors, font: selectedTheme.font, mood: selectedTheme.mood },
      };
      if ((index || 0) === 0) {
        const mt = (mappedSlide as { content?: { title?: string } })?.content?.title;
        progressivePayload.lectureTitle =
          typeof mt === "string" && mt.trim() ? mt.trim().slice(0, 200) : slideSubject.slice(0, 200);
      }
      return new Response(JSON.stringify(progressivePayload), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!description) {
      throw new Error("Missing 'description' in request body");
    }

    console.log(`🎯 Generating full presentation: "${description}"`);
    let contentSubject = extractPresentationSubject(description);
    if (providedTeachableSubject && String(providedTeachableSubject).trim()) {
      contentSubject = mergeTeachableSubjectFromPlan(contentSubject, providedTeachableSubject);
    }
    const subjectBlock = topicContractBlock(description, contentSubject);
    console.log(`📌 Extracted subject for slides: "${contentSubject}"`);

    const userCtx = await getUserContextBatch(user.id);
    const maxSlidesAllowed = userCtx.maxSlides;
    const isPro = userCtx.isPro;
    const userAiSettings = isPro ? userCtx.aiSettings : null;

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
    const effectiveSlideCount = Math.min(slideCount, maxSlidesAllowed, AI_OPTIMAL_SLIDES_MAX);

    let resolvedInteractiveSlideTypes: string[] | null = null;
    let deckSlideCount = effectiveSlideCount;
    if (contentType === "interactive" && Array.isArray(providedSlideTypes) && providedSlideTypes.length > 0) {
      resolvedInteractiveSlideTypes = enforceInteractiveOnlySlideTypes(providedSlideTypes, effectiveSlideCount);
      deckSlideCount = resolvedInteractiveSlideTypes.length;
    }

    if (phase === "plan") {
      if (userCtx.creditsBalance < 1) {
        return new Response(
          JSON.stringify({ error: "Insufficient credits" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const productPlanCap = Math.min(maxSlidesAllowed, AI_OPTIMAL_SLIDES_MAX);
      const planSlideCount = Math.min(slideCount, productPlanCap);
      const systemPrompt =
        subjectBlock +
        "\n\n" +
        (contentType === "interactive"
          ? buildInteractiveOnlyPlanPrompt(description, planSlideCount, difficulty, userAiSettings)
          : buildProPlanOnlyPrompt(description, targetAudience, planSlideCount, userAiSettings)) +
        fixedLectureModeContext(resolvedLectureMode);
      const planRaw = await callAI(GEMINI_API_KEY, systemPrompt, `Analyze and plan a presentation about "${contentSubject}".`, {
        responseSchema: GEMINI_PLAN_RESPONSE_SCHEMA,
        maxOutputTokens: 8192,
      });
      const planParsed = parseModelJson(planRaw);
      if (!planParsed || typeof planParsed !== "object" || !Array.isArray(planParsed.slideTypes)) {
        throw new Error("Failed to parse plan from AI response.");
      }
      if (contentType === "interactive") {
        planParsed.slideTypes = enforceInteractiveOnlySlideTypes(planParsed.slideTypes || [], productPlanCap);
      }
      const cappedSlideTypes = (planParsed.slideTypes || []).slice(0, productPlanCap);
      const planCreditResult = await consumeCredits(user.id, 1, "Presentation plan");
      if (!planCreditResult.success) {
        return new Response(
          JSON.stringify({ error: planCreditResult.error || "Failed to deduct credits" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const planTeachable =
        typeof planParsed.teachableSubject === "string" && planParsed.teachableSubject.trim()
          ? planParsed.teachableSubject.trim()
          : undefined;
      return new Response(
        JSON.stringify({
          phase: "plan",
          interpretation: planParsed.interpretation || "",
          plan: planParsed.plan || "",
          ...(planTeachable ? { teachableSubject: planTeachable } : {}),
          slideCount: cappedSlideTypes.length,
          slideTypes: cappedSlideTypes,
          creditsConsumed: 1,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const useProBatchFromClient =
      isPro &&
      providedPlan &&
      providedInterpretation &&
      Array.isArray(providedSlideTypes) &&
      providedSlideTypes.length > 0;
    const creditsRequired = useProBatchFromClient ? deckSlideCount : deckSlideCount + 1;

    if (userCtx.creditsBalance < creditsRequired) {
      return new Response(
        JSON.stringify({ error: "Insufficient credits" }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const selectedTheme = selectThemeForTopic(contentSubject);
    console.log(`🎨 Selected theme: ${selectedTheme.name}. Pro mode: ${isPro}`);

    let rawContent = "";
    let plan: string | undefined;
    let interpretation: string | undefined;
    let planCreditsConsumed = 0;
    let rawSlides: any[] | null = null;

    if (useProBatchFromClient) {
      const slideTypes =
        contentType === "interactive"
          ? (resolvedInteractiveSlideTypes ??
            enforceInteractiveOnlySlideTypes(providedSlideTypes, effectiveSlideCount))
          : providedSlideTypes;
      const slidesFromPlanPrompt =
        subjectBlock +
        "\n\n" +
        buildProSlidesFromPlanPrompt(
          description,
          providedInterpretation,
          providedPlan,
          slideTypes,
        ) + fixedLectureModeContext(resolvedLectureMode);
      rawContent = await callAI(
        GEMINI_API_KEY,
        slidesFromPlanPrompt,
        `Generate all slides about "${contentSubject}". Each slide must be SPECIFIC, ENGAGING, and EDUCATIONAL.`
      );
      plan = providedPlan;
      interpretation = providedInterpretation;
      const batchParsed = parseModelJson(rawContent);
      rawContent = Array.isArray(batchParsed) ? JSON.stringify(batchParsed) : rawContent;
    } else {
      const productPlanCap = Math.min(maxSlidesAllowed, AI_OPTIMAL_SLIDES_MAX);
      const planSlideCount = Math.min(slideCount, productPlanCap);
      const planSystemPrompt =
        subjectBlock +
        "\n\n" +
        (contentType === "interactive"
          ? buildInteractiveOnlyPlanPrompt(description, planSlideCount, difficulty, userAiSettings)
          : buildProPlanOnlyPrompt(description, targetAudience, planSlideCount, userAiSettings)) +
        fixedLectureModeContext(resolvedLectureMode);
      const planRaw = await callAI(
        GEMINI_API_KEY,
        planSystemPrompt,
        `Analyze and plan a presentation about "${contentSubject}".`,
        {
          responseSchema: GEMINI_PLAN_RESPONSE_SCHEMA,
          maxOutputTokens: 8192,
        },
      );
      const planParsed = parseModelJson(planRaw);
      if (!planParsed || typeof planParsed !== "object" || !Array.isArray(planParsed.slideTypes)) {
        throw new Error("Failed to parse plan from AI response.");
      }
      if (contentType === "interactive") {
        planParsed.slideTypes = enforceInteractiveOnlySlideTypes(planParsed.slideTypes || [], productPlanCap);
      }
      const cappedSlideTypes = (planParsed.slideTypes || []).slice(0, deckSlideCount);
      if (cappedSlideTypes.length === 0) {
        throw new Error("Plan returned no slides.");
      }
      const planCreditResult = await consumeCredits(user.id, 1, "Presentation plan (internal)");
      if (!planCreditResult.success) {
        return new Response(
          JSON.stringify({ error: planCreditResult.error || "Failed to deduct credits" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      planCreditsConsumed = 1;
      plan = planParsed.plan || "";
      interpretation = planParsed.interpretation || "";
      if (
        typeof planParsed.teachableSubject === "string" &&
        String(planParsed.teachableSubject).trim()
      ) {
        contentSubject = mergeTeachableSubjectFromPlan(contentSubject, planParsed.teachableSubject);
      }

      const batchSlideTypes =
        contentType === "interactive"
          ? (resolvedInteractiveSlideTypes ??
            enforceInteractiveOnlySlideTypes(cappedSlideTypes, effectiveSlideCount))
          : cappedSlideTypes;

      const batchPrompt =
        subjectBlock +
        "\n\n" +
        buildProSlidesFromPlanPrompt(
          description,
          interpretation || "",
          plan || "",
          batchSlideTypes,
        ) + fixedLectureModeContext(resolvedLectureMode);

      rawContent = await callAI(
        GEMINI_API_KEY,
        batchPrompt,
        `Generate all ${batchSlideTypes.length} slides about "${contentSubject}". Each must be SPECIFIC and ENGAGING.`
      );
      const batchParsed = parseModelJson(rawContent);
      if (Array.isArray(batchParsed)) {
        rawSlides = batchParsed;
      } else {
        rawSlides = normalizeToSlidesArray(batchParsed);
      }
    }

    let parsedForLog: unknown = null;
    if (!rawSlides) {
      console.log(`📝 Raw AI response length: ${rawContent.length} chars`);
      parsedForLog = parseModelJson(rawContent);
      rawSlides = normalizeToSlidesArray(parsedForLog) ?? (Array.isArray(parsedForLog) ? parsedForLog : null);
    } else {
      console.log(`[generate-slides] Internal plan + per-slide pipeline: ${rawSlides.length} slides`);
    }

    if (!rawSlides || !rawSlides.length) {
      const what =
        parsedForLog == null
          ? "null"
          : Array.isArray(parsedForLog)
            ? `array(length=${parsedForLog.length})`
            : typeof parsedForLog;
      console.error("[generate-slides] Parse failed. Got:", what);
      console.error("[generate-slides] Raw preview (400 chars):", rawContent.substring(0, 400));
      throw new Error("Failed to parse slides from AI response. Please try again or use a shorter topic.");
    }

    rawSlides = rawSlides.map((slide: any, index: number) =>
      validateAndFixSlide(slide, index, contentSubject, description)
    );
    if (contentType === "interactive") {
      rawSlides = enforceInteractiveOnlySlides(rawSlides, deckSlideCount, contentSubject);

      const quizPollIndices: number[] = [];
      for (let i = 0; i < rawSlides.length; i++) {
        const st = String(rawSlides[i]?.type || "");
        if (st === "quiz" || st === "poll" || st === "poll_quiz") {
          quizPollIndices.push(i);
        }
      }
      if (quizPollIndices.length > 0) {
        const fixTasks = quizPollIndices.map((i) => async () => {
          const fixed = await ensureQuizPollOptionsFilled(
            GEMINI_API_KEY,
            rawSlides![i] as RawSlide,
            i,
            contentSubject,
            resolvedLectureMode,
            description,
          );
          return { index: i, fixed };
        });
        const fixResults = await parallelWithLimit(fixTasks, 3);
        for (const r of fixResults) {
          if (r.status === "fulfilled") {
            rawSlides![r.value.index] = r.value.fixed;
          }
        }
      }
    }
    rawSlides = rawSlides.slice(0, deckSlideCount);
    rawSlides = await enrichThinSlides(
      GEMINI_API_KEY,
      rawSlides,
      contentSubject,
      resolvedLectureMode,
      description,
    );
    if (contentType === "interactive") {
      rawSlides = await dedupeInteractiveQuestions(
        GEMINI_API_KEY,
        rawSlides as RawSlide[],
        contentSubject,
        resolvedLectureMode,
        description,
      );
    }

    ensureOpeningTitleSlideEchoFix(rawSlides as RawSlide[], description, contentSubject);
    sanitizeSlideDeckForPromptEcho(rawSlides as RawSlide[], description, contentSubject);

    console.log(`✅ Parsed and validated ${rawSlides.length} slides`);

    const contentText = rawSlides
      .map((s: any) => {
        const c = s.content || {};
        return [
          c.title, c.subtitle, c.text, c.question, c.statement,
          Array.isArray(c.options) ? c.options.join(" ") : "",
          Array.isArray(c.bulletPoints) ? c.bulletPoints.join(" ") : "",
          Array.isArray(c.items) ? c.items.join(" ") : "",
          Array.isArray(c.points) ? (c.points as any[]).map((p: any) => p?.title || p?.description || "").join(" ") : "",
        ].filter(Boolean).join(" ");
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
        console.log(`🖼️ Generating ${slidesNeedingImages.length} images inline (${INLINE_IMAGE_CONCURRENCY} concurrent)...`);
        const imageTasks = slidesNeedingImages.map(
          ({ slide, index }: { slide: any; index: number }) => () =>
            generateImage(GEMINI_API_KEY, slide.imagePrompt, slide.type).then((imageUrl) => ({
              index,
              imageUrl,
            })),
        );
        const imageSettled = await parallelWithLimit(imageTasks, INLINE_IMAGE_CONCURRENCY);
        for (const r of imageSettled) {
          if (r.status !== "fulfilled") continue;
          const { index, imageUrl } = r.value;
          if (imageUrl) imageMap.set(index, imageUrl);
        }
      }
    }

    const mappedSlides = rawSlides.map((slide: any, index: number) =>
      mapSlideToFrontendFormat(slide, index, selectedTheme, effectiveDetectedLanguage, imageMap.get(index), contentSubject),
    );

    const creditsToCharge = mappedSlides.length;
    const creditResult = await consumeCredits(
      user.id,
      creditsToCharge,
      `Presentation generation: ${mappedSlides.length} slides${planCreditsConsumed ? " (after internal plan)" : ""}`
    );
    if (!creditResult.success) {
      console.error("[generate-slides] Failed to consume after full presentation:", creditResult.error);
      return new Response(
        JSON.stringify({ error: creditResult.error || "Failed to deduct credits" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    await updateUsageStats(user.id, mappedSlides.length, true);

    const totalCreditsConsumed = planCreditsConsumed + creditsToCharge;
    console.log(`🚀 Mapped ${mappedSlides.length} slides. Credits consumed: ${totalCreditsConsumed}`);

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
      creditsConsumed: totalCreditsConsumed,
    };
    if (plan !== undefined) responsePayload.plan = plan;
    if (interpretation !== undefined) responsePayload.interpretation = interpretation;
    if (pendingSlideImages.length > 0) responsePayload.pendingSlideImages = pendingSlideImages;

    const firstTitle = (mappedSlides[0] as { content?: { title?: string } })?.content?.title;
    responsePayload.lectureTitle =
      typeof firstTitle === "string" && firstTitle.trim()
        ? firstTitle.trim().slice(0, 200)
        : String(contentSubject || "Presentation").slice(0, 200);

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

