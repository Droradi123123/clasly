/**
 * Gemini API key from Supabase Edge Function secrets.
 * Some older / migrated deployments only had LOVABLE_API_KEY set; we accept it
 * only as an alias if it contains a real Google AI key (same as GEMINI_API_KEY).
 * Clasly does not call Lovable's API.
 */
export function getGeminiApiKey(): string | null {
  const primary = Deno.env.get("GEMINI_API_KEY")?.trim();
  const legacyAlias = Deno.env.get("LOVABLE_API_KEY")?.trim();
  return primary || legacyAlias || null;
}

export function requireGeminiApiKey(): string {
  const key = getGeminiApiKey();
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY is not configured. In Supabase: Project Settings → Edge Functions → Secrets, add GEMINI_API_KEY (Google AI Studio / Gemini API key). Clasly does not use Lovable.",
    );
  }
  return key;
}
