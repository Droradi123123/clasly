import type { TimelineSlideContent } from "@/types/slides";

export function normalizeTimelineContent(
  raw: Partial<TimelineSlideContent> & {
    events?: Array<Partial<TimelineSlideContent["events"][number]> & { title?: string }>;
  }
): TimelineSlideContent {
  const normalizedEvents = (
    Array.isArray(raw.events)
      ? raw.events.map((e) => ({
          year: e.year ?? "",
          title: (e as any)?.title ?? "",
          description: e.description ?? "",
        }))
      : []
  ) as TimelineSlideContent["events"];

  const events: TimelineSlideContent["events"] =
    normalizedEvents.length >= 2
      ? normalizedEvents
      : [
          { year: "", title: "", description: "" },
          { year: "", title: "", description: "" },
        ];

  return {
    title: raw.title ?? "",
    events,
  };
}
