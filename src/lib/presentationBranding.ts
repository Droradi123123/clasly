import type { Slide } from "@/types/slides";

/** First non-empty slide logo URL (Pro branding on slides). */
export function getPresentationLogoUrl(slides: Slide[] | null | undefined): string | undefined {
  if (!slides?.length) return undefined;
  for (const s of slides) {
    const url = s.design?.logoUrl?.trim();
    if (url) return url;
  }
  return undefined;
}

/** Darken a #RRGGBB hex for gradients (e.g. webinar accent header). */
export function darkenHex(hex: string, amount = 0.28): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex;
  const r = Math.max(0, Math.round(parseInt(h.slice(0, 2), 16) * (1 - amount)));
  const g = Math.max(0, Math.round(parseInt(h.slice(2, 4), 16) * (1 - amount)));
  const b = Math.max(0, Math.round(parseInt(h.slice(4, 6), 16) * (1 - amount)));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
