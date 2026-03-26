/**
 * Design defaults for visual stability (WYSIWYG).
 * NEVER infer direction/textAlign from content - use explicit stored values or fixed defaults.
 * Normalizes themeId/designStyleId so Editor and Present render identically (AI-generated slides).
 */
import type { Slide, SlideDesign, TextAlign } from "@/types/slides";
import {
  DEFAULT_ACTIVITY_DURATION_SEC,
  DEFAULT_POINTS_CORRECT,
  DEFAULT_POINTS_PARTICIPATION,
  isParticipativeSlide,
} from "@/types/slides";
import type { DesignStyleId } from "@/types/designStyles";
import type { ThemeId } from "@/types/themes";

const DEFAULT_TEXT_ALIGN: TextAlign = "center";
const DEFAULT_DIRECTION: "ltr" | "rtl" = "ltr";

/** Valid DesignStyleIds - AI may return "elegant","bold","cinematic" which we map to dynamic */
const VALID_DESIGN_STYLES: DesignStyleId[] = ["minimal", "dynamic", "compact"];

/** Valid ThemeIds for normalization */
const VALID_THEME_IDS: ThemeId[] = ["neon-cyber", "soft-pop", "academic-pro", "swiss-minimal", "sunset-warmth", "ocean-breeze"];

function normalizeDesignStyleId(id: string | undefined): DesignStyleId | undefined {
  if (!id) return undefined;
  if (VALID_DESIGN_STYLES.includes(id as DesignStyleId)) return id as DesignStyleId;
  return "dynamic";
}

function normalizeThemeId(id: string | undefined): ThemeId | undefined {
  if (!id) return undefined;
  if (VALID_THEME_IDS.includes(id as ThemeId)) return id as ThemeId;
  return undefined;
}

/**
 * Ensures every slide has explicit design.textAlign, design.direction,
 * and normalized themeId/designStyleId (WYSIWYG: Editor === Present for AI slides).
 */
export function ensureDesignDefaults(slide: Slide): Slide {
  const design = slide.design || {};
  const direction = getEffectiveDirection(slide);
  const textAlign = getEffectiveTextAlign(slide, direction);
  const normalizedDesignStyleId = normalizeDesignStyleId(design.designStyleId as string);
  const normalizedThemeId = normalizeThemeId(design.themeId as string);

  const hasChanges =
    design.textAlign !== textAlign ||
    design.direction !== direction ||
    (normalizedDesignStyleId && design.designStyleId !== normalizedDesignStyleId) ||
    (normalizedThemeId && design.themeId !== normalizedThemeId);

  if (!hasChanges) return slide;

  return {
    ...slide,
    design: {
      ...design,
      textAlign,
      direction,
      ...(normalizedDesignStyleId && { designStyleId: normalizedDesignStyleId }),
      ...(normalizedThemeId && { themeId: normalizedThemeId }),
    },
  };
}

function ensureActivitySettings(slide: Slide): Slide {
  if (!isParticipativeSlide(slide.type)) return slide;
  const a = slide.activitySettings || {};
  const next = {
    duration:
      a.duration === 0
        ? 0
        : typeof a.duration === "number" && a.duration > 0
          ? a.duration
          : DEFAULT_ACTIVITY_DURATION_SEC,
    showResults: a.showResults ?? true,
    interactionStyle: a.interactionStyle ?? ("bar_chart" as const),
    pointsForCorrect:
      typeof a.pointsForCorrect === "number" && a.pointsForCorrect >= 0
        ? a.pointsForCorrect
        : DEFAULT_POINTS_CORRECT,
    pointsForParticipation:
      typeof a.pointsForParticipation === "number" && a.pointsForParticipation >= 0
        ? a.pointsForParticipation
        : DEFAULT_POINTS_PARTICIPATION,
  };
  const same =
    slide.activitySettings &&
    slide.activitySettings.duration === next.duration &&
    slide.activitySettings.showResults === next.showResults &&
    slide.activitySettings.interactionStyle === next.interactionStyle &&
    slide.activitySettings.pointsForCorrect === next.pointsForCorrect &&
    slide.activitySettings.pointsForParticipation === next.pointsForParticipation;
  if (same) return slide;
  return { ...slide, activitySettings: next };
}

/**
 * Normalize an array of slides - ensures all have stable design values.
 */
export function ensureSlidesDesignDefaults(slides: Slide[]): Slide[] {
  return slides.map((s) => ensureDesignDefaults(ensureActivitySettings(s)));
}

/**
 * Get stable textAlign - never infer from content.
 */
export function getStableTextAlign(design?: SlideDesign | null): TextAlign {
  return (design?.textAlign as TextAlign) ?? DEFAULT_TEXT_ALIGN;
}

/**
 * Get stable direction - never infer from content.
 */
export function getStableDirection(design?: SlideDesign | null): "ltr" | "rtl" {
  return (design?.direction as "ltr" | "rtl") ?? DEFAULT_DIRECTION;
}

/** Hebrew Unicode range (letters, marks). Returns true if text is primarily Hebrew. */
function isHebrewText(text: string): boolean {
  if (!text || !text.trim()) return false;
  const hebrew = (text.match(/[\u0590-\u05FF]/g) || []).length;
  const latin = (text.match(/[a-zA-Z]/g) || []).length;
  return hebrew > latin;
}

/**
 * Detect if slide content is primarily Hebrew (for RTL display).
 * Used when design.direction is not explicitly set.
 */
export function isSlideContentHebrew(slide: { content?: Record<string, unknown> }): boolean {
  const c = slide.content as Record<string, unknown> | undefined;
  if (!c) return false;
  const texts: string[] = [];
  if (typeof c.title === "string") texts.push(c.title);
  if (typeof c.subtitle === "string") texts.push(c.subtitle);
  if (typeof c.text === "string") texts.push(c.text);
  if (typeof c.question === "string") texts.push(c.question);
  if (Array.isArray(c.options)) c.options.forEach((o) => texts.push(String(o)));
  if (Array.isArray(c.items)) c.items.forEach((i) => texts.push(String(i)));
  if (Array.isArray(c.bulletPoints)) c.bulletPoints.forEach((p) => texts.push(String(p)));
  if (Array.isArray(c.points)) (c.points as { title?: string; description?: string }[]).forEach((p) => {
    if (p?.title) texts.push(p.title);
    if (p?.description) texts.push(p.description);
  });
  const combined = texts.join(" ");
  return isHebrewText(combined);
}

/** Single source of truth for direction: design.direction ?? Hebrew inference. */
export function getEffectiveDirection(slide: { design?: SlideDesign | null; content?: Record<string, unknown> }): "ltr" | "rtl" {
  const direction = (slide.design?.direction as "ltr" | "rtl" | undefined);
  if (direction != null) return direction;
  return isSlideContentHebrew(slide) ? "rtl" : "ltr";
}

/** Single source of truth for textAlign: design.textAlign ?? RTL default right. */
export function getEffectiveTextAlign(
  slide: { design?: SlideDesign | null; content?: Record<string, unknown> },
  direction?: "ltr" | "rtl"
): TextAlign {
  const align = (slide.design?.textAlign as TextAlign | undefined);
  if (align != null) return align;
  const dir = direction ?? getEffectiveDirection(slide);
  return dir === "rtl" ? "right" : "center";
}
