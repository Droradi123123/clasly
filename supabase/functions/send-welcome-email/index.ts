import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Use RESEND_FROM env for production (e.g. "Clasly <hello@clasly.app>")
// Default uses Resend test sender – only sends to your signup email until domain verified
const DEFAULT_FROM = "Clasly <onboarding@resend.dev>";
const CTA_URL = "https://www.clasly.app/editor/new";

function buildWelcomeHtml(name: string | null): string {
  const greeting = name ? `Hi ${name},` : "Hi,";
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Welcome to Clasly</title></head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 520px; margin: 0 auto; padding: 24px;">
  <p>${greeting}</p>
  <p>Welcome to <strong>Clasly</strong>!</p>
  <p>Create interactive presentations with AI and engage your audience in real time. Build slides, get AI suggestions, and deliver memorable presentations.</p>
  <p><a href="${CTA_URL}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Create your first presentation</a></p>
  <p style="color: #64748b; font-size: 14px;">— The Clasly Team</p>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const record = body?.record ?? body;
    const email = record?.email;
    const fullName =
      record?.full_name ?? record?.raw_user_meta_data?.full_name ?? null;

    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid email in payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const from = Deno.env.get("RESEND_FROM") ?? DEFAULT_FROM;
    const html = buildWelcomeHtml(fullName);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: "Welcome to Clasly!",
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Resend API error:", res.status, data);
      return new Response(
        JSON.stringify({ error: data?.message ?? "Resend API error" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, id: data?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-welcome-email error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
