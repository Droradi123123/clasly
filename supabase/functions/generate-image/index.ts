import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireGeminiApiKey } from "../_shared/gemini-key.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Module-scoped singletons — reused across requests to avoid connection pool exhaustion
const _sbUrl = Deno.env.get("SUPABASE_URL") ?? "";
const _sbAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const _sbServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabaseAnon = _sbUrl && _sbAnonKey ? createClient(_sbUrl, _sbAnonKey) : null;
const supabaseAdmin = _sbUrl && _sbServiceKey ? createClient(_sbUrl, _sbServiceKey) : null;

interface GenerateImageRequest {
  prompt: string;
  style?: string;
}

// Helper to verify authentication
async function verifyAuth(req: Request): Promise<{ user: any; error: string | null }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { user: null, error: "Missing authorization header" };
  }

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { user: null, error: "Missing token" };

  if (!supabaseAnon) {
    return { user: null, error: "Server configuration error" };
  }

  const { data: { user }, error } = await supabaseAnon.auth.getUser(token);
  if (error || !user) {
    return { user: null, error: error?.message || "Invalid or expired authentication token" };
  }

  return { user, error: null };
}

const CREDITS_PER_IMAGE = 1;

async function checkCredits(userId: string, amount: number): Promise<{ allowed: boolean; error?: string }> {
  if (!supabaseAdmin) {
    return { allowed: false, error: "Server configuration error" };
  }
  const { data: credits, error: fetchError } = await supabaseAdmin
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

async function consumeCredits(userId: string, amount: number, description: string): Promise<boolean> {
  if (!supabaseAdmin) return false;
  const { data, error: rpcError } = await supabaseAdmin.rpc("atomic_consume_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_description: description,
  });
  if (rpcError) {
    console.error("atomic_consume_credits RPC error:", rpcError);
    return false;
  }
  const newBalance = typeof data === "number" ? data : Number(data);
  return !Number.isNaN(newBalance) && newBalance !== -1;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify authentication
  const { user, error: authError } = await verifyAuth(req);
  if (authError || !user) {
    console.error("Auth failed:", authError);
    return new Response(
      JSON.stringify({ error: authError || "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  console.log(`🔐 Authenticated user: ${user.id}`);

  try {
    const { prompt, style = "vibrant and modern" }: GenerateImageRequest = await req.json();

    // Input validation
    if (!prompt || typeof prompt !== "string") {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit prompt length to prevent abuse
    if (prompt.length > 1000) {
      return new Response(
        JSON.stringify({ error: "Prompt too long. Please keep your description under 1000 characters." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Credit check: 1 AI credit per image (deduct after success)
    const creditCheck = await checkCredits(user.id, CREDITS_PER_IMAGE);
    if (!creditCheck.allowed) {
      return new Response(
        JSON.stringify({ error: creditCheck.error || "Insufficient credits" }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY = requireGeminiApiKey();

    console.log("Generating image for prompt:", prompt.substring(0, 50));

    const enhancedPrompt = `Create a professional presentation slide background or illustration: ${prompt}. 
Style: ${style}. 
Requirements: Clean, high-quality, suitable for educational or professional presentations. 
The image should be visually striking and work well as a slide background or visual element.`;

    const model = "gemini-2.5-flash-image";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: enhancedPrompt }] }],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const partWithImage = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData) || null;
    const inlineData = partWithImage?.inlineData;

    if (!inlineData?.data) {
      throw new Error("No image returned from Gemini");
    }

    const mimeType = inlineData.mimeType || "image/png";

    // Upload to Supabase Storage instead of returning base64 (prevents DB bloat)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    let imageUrl: string;

    if (supabaseUrl && serviceKey) {
      const binaryString = atob(inlineData.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const ext = mimeType === "image/jpeg" ? "jpg" : mimeType === "image/webp" ? "webp" : "png";
      const filename = `generated/${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${ext}`;
      const uploadUrl = `${supabaseUrl}/storage/v1/object/slide-images/${filename}`;
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${serviceKey}`,
          "Content-Type": mimeType,
          "x-upsert": "true",
        },
        body: bytes,
      });

      if (uploadResponse.ok) {
        imageUrl = `${supabaseUrl}/storage/v1/object/public/slide-images/${filename}`;
        console.log("Image uploaded to Storage:", imageUrl.substring(0, 80));
      } else {
        console.error("Storage upload failed:", uploadResponse.status, await uploadResponse.text());
        throw new Error("Image storage upload failed");
      }
    } else {
      throw new Error("Server storage configuration error");
    }

    await consumeCredits(user.id, CREDITS_PER_IMAGE, "Generate image");
    console.log("Image generated successfully");

    return new Response(
      JSON.stringify({ 
        imageUrl,
        description: "Generated image"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("generate-image error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
