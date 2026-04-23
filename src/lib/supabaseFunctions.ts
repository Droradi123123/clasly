import { FunctionsHttpError } from "@supabase/supabase-js";

/**
 * Get a user-friendly error message from an Edge Function invoke error.
 * For 4xx/5xx responses, reads the response body (e.g. { error: "..." }) so you see the real reason.
 */
export async function getEdgeFunctionErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again."
): Promise<string> {
  if (error instanceof FunctionsHttpError && error.context) {
    const res = error.context as Response;
    try {
      const body = await res.json().catch(() => null);
      const bodyError = body && typeof body.error === "string" ? body.error : null;
      const bodyMessage = body && typeof body.message === "string" ? body.message : null;
      // Invalid JWT = session from wrong project or expired/corrupt – user must sign out and sign in again
      if (res.status === 401 || (bodyError && /invalid jwt|invalid or expired|unauthorized/i.test(bodyError))) {
        return "Session invalid or expired. Please sign out and sign in again, then try again.";
      }
      if (bodyError) return bodyError;
      if (bodyMessage) return bodyMessage;
      if (res.status === 402) return "AI credits exhausted. Please add credits to continue.";
      if (res.status === 429) return "Too many requests. Please wait a moment and try again.";
      if (res.status === 502 || res.status === 503 || res.status === 504)
        return "The AI service is temporarily busy and couldn't process your request. Please wait 20-30 seconds and try again.";
      return `Error ${res.status}: ${body ? JSON.stringify(body).slice(0, 100) : res.statusText}`;
    } catch {
      if (res.status === 401) return "Session invalid or expired. Please sign out and sign in again, then try again.";
      return `Error ${res.status}`;
    }
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

/** Wraps a Promise with a timeout. Rejects after timeoutMs with a clear message. */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message = "Request timed out. Please try again."
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(message)), timeoutMs)
    ),
  ]);
}

/** Returns HTTP status from Edge Function error (e.g. 402 for out of credits). */
export function getEdgeFunctionStatus(error: unknown): number | null {
  if (error instanceof FunctionsHttpError && error.context) {
    const res = error.context as Response;
    return res.status ?? null;
  }
  return null;
}

export const TRANSIENT_AI_ERROR_RE =
  /(temporarily busy|try again|timeout|timed out|overloaded|bad gateway|gateway timeout|service unavailable)/i;

export function isRetryableEdgeError(error: unknown): boolean {
  const status = getEdgeFunctionStatus(error);
  if (status && [408, 425, 429, 500, 502, 503, 504].includes(status)) return true;
  const msg = error instanceof Error ? error.message : "";
  return TRANSIENT_AI_ERROR_RE.test(msg);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function getFriendlyAiTransientMessage(action = "process your request"): string {
  return `Sorry, I couldn't ${action}. The AI service is temporarily busy and couldn't process your request. Please wait 20-30 seconds and try again.`;
}

/** Invoke helper with retries for transient Edge Function failures (503/502/429/timeouts). */
export async function invokeEdgeFunctionWithRetry<TData = unknown>(
  invoke: () => Promise<{ data: TData | null; error: unknown | null }>,
  options?: {
    timeoutMs?: number;
    maxAttempts?: number;
    actionLabel?: string;
  }
): Promise<{ data: TData | null; error: unknown | null }> {
  const timeoutMs = options?.timeoutMs ?? 110_000;
  const maxAttempts = options?.maxAttempts ?? 3;
  const actionLabel = options?.actionLabel ?? "process your request";

  let last: { data: TData | null; error: unknown | null } | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await withTimeout(invoke(), timeoutMs, getFriendlyAiTransientMessage(actionLabel));
      last = res;
      if (!res.error) return res;
      if (!isRetryableEdgeError(res.error) || attempt === maxAttempts) return res;
    } catch (err) {
      last = { data: null, error: err };
      if (!TRANSIENT_AI_ERROR_RE.test(err instanceof Error ? err.message : "") || attempt === maxAttempts) {
        throw err;
      }
    }
    // Exponential backoff with cap + jitter
    const base = Math.min(1200 * 2 ** (attempt - 1), 6000);
    const jitter = Math.floor(Math.random() * 400);
    await sleep(base + jitter);
  }
  return last ?? { data: null, error: new Error(getFriendlyAiTransientMessage(actionLabel)) };
}

/**
 * Central config for Supabase Edge Functions.
 * Uses the same base URL as the Supabase client (from .env).
 */

const baseUrl =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL
    ? (import.meta.env.VITE_SUPABASE_URL as string).replace(/\/$/, "")
    : "";

const anonKey =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY
    ? (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string)
    : "";

export const SUPABASE_FUNCTIONS_BASE =
  baseUrl && anonKey
    ? `${baseUrl}/functions/v1`
    : "https://gctdhjgxrshrltbntjqj.supabase.co/functions/v1";

export const SUPABASE_ANON_KEY = anonKey;

export const EDGE_FUNCTION_URLS = {
  "chat-builder": `${SUPABASE_FUNCTIONS_BASE}/chat-builder`,
  "convert-to-images": `${SUPABASE_FUNCTIONS_BASE}/convert-to-images`,
  "generate-image": `${SUPABASE_FUNCTIONS_BASE}/generate-image`,
  "generate-slides": `${SUPABASE_FUNCTIONS_BASE}/generate-slides`,
  "parse-presentation": `${SUPABASE_FUNCTIONS_BASE}/parse-presentation`,
} as const;

/** Headers required for Edge Function calls (Authorization must be set by caller with Bearer token). */
export function getFunctionsHeaders(accessToken: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return headers;
}

/** For FormData requests (e.g. file upload), don't set Content-Type; do set apikey and optional Authorization. */
export function getFunctionsHeadersForFormData(accessToken: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return headers;
}
