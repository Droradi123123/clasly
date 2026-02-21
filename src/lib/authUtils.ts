/**
 * Returns hosts allowed for OAuth redirect URLs.
 * Supports both default Supabase domain and custom domain via VITE_SUPABASE_URL.
 */
export function getOAuthAllowedHosts(): string[] {
  const raw = import.meta.env?.VITE_SUPABASE_URL;
  const url = (typeof raw === "string" ? raw : "").replace(/\/$/, "").trim();
  let supabaseHost = "gctdhjgxrshrltbntjqj.supabase.co";
  if (url) {
    try {
      supabaseHost = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
    } catch {
      // fallback to default
    }
  }
  return ["accounts.google.com", supabaseHost];
}
