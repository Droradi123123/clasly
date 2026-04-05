import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const INITIAL_FREE_CREDITS = 15;

const _sbUrl = Deno.env.get("SUPABASE_URL") ?? "";
const _sbAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const _sbServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabaseAnon = _sbUrl && _sbAnonKey ? createClient(_sbUrl, _sbAnonKey) : null;
const supabaseAdmin = _sbUrl && _sbServiceKey ? createClient(_sbUrl, _sbServiceKey) : null;

async function verifyAuth(req: Request): Promise<{ user: { id: string } | null; error: string | null }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return { user: null, error: "Missing authorization header" };
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { user: null, error: "Missing token" };

  if (!supabaseAnon) return { user: null, error: "Server configuration error" };

  const { data: { user }, error } = await supabaseAnon.auth.getUser(token);
  if (error || !user) return { user: null, error: error?.message || "Invalid token" };
  return { user: { id: user.id }, error: null };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user, error: authError } = await verifyAuth(req);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: authError || "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!supabaseAdmin) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: existing } = await supabaseAdmin
      .from("user_credits")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ ok: true, alreadyExists: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: insertError } = await supabaseAdmin.from("user_credits").insert({
      user_id: user.id,
      ai_tokens_balance: INITIAL_FREE_CREDITS,
    });

    if (insertError) {
      console.error("[ensure-user-credits] Failed:", insertError);
      return new Response(
        JSON.stringify({ error: "Could not create credits" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[ensure-user-credits] Created user_credits for ${user.id} with ${INITIAL_FREE_CREDITS} tokens`);
    return new Response(
      JSON.stringify({ ok: true, created: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[ensure-user-credits] Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
