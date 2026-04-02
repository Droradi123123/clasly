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
