/** Single source of truth for contact/support email shown to users */
export const CONTACT_EMAIL = "claslyapp@gmail.com";

/** Set to true temporarily to log broadcast/DB sync for debugging out-of-order issues */
export const DEBUG_REALTIME_SYNC = import.meta.env.VITE_DEBUG_REALTIME_SYNC === "true";

/**
 * Base URL for QR codes and share links so students open a reachable app URL.
 * - Set VITE_PUBLIC_APP_URL=https://www.clasly.app on Vercel if needed.
 * - In production, localhost / *.vercel.app presenters default to www.clasly.app so phone scanners work.
 */
export function getPublicAppOrigin(): string {
  if (typeof window === "undefined") return "";
  const envUrl = import.meta.env.VITE_PUBLIC_APP_URL?.trim();
  if (envUrl && /^https?:\/\//i.test(envUrl)) {
    return envUrl.replace(/\/$/, "");
  }
  const host = window.location.hostname;
  if (
    import.meta.env.PROD &&
    (host === "localhost" || host === "127.0.0.1" || host.endsWith(".vercel.app"))
  ) {
    return "https://www.clasly.app";
  }
  return window.location.origin;
}
