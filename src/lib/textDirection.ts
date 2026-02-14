import type { Slide } from "@/types/slides";

const RTL_CHAR_REGEX = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/; // Hebrew + Arabic blocks

function extractAllStrings(value: unknown, out: string[]) {
  if (typeof value === "string") {
    out.push(value);
    return;
  }
  if (!value) return;
  if (Array.isArray(value)) {
    value.forEach((v) => extractAllStrings(v, out));
    return;
  }
  if (typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) {
      extractAllStrings(v, out);
    }
  }
}

export function inferDirectionFromSlide(slide: Slide): "rtl" | "ltr" {
  const strings: string[] = [];
  extractAllStrings(slide.content, strings);
  const text = strings.join(" \n");
  return RTL_CHAR_REGEX.test(text) ? "rtl" : "ltr";
}
