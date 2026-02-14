import { Plus } from "lucide-react";
import { SlideWrapper } from "./SlideWrapper";
import type { Slide, TimelineSlideContent } from "@/types/slides";
import type { ThemeId } from "@/types/themes";
import { Button } from "@/components/ui/button";
import { normalizeTimelineContent } from "./timeline/normalizeTimelineContent";
import { TimelineHorizontal } from "./timeline/TimelineHorizontal";
import { AutoResizeTextarea } from "@/components/ui/AutoResizeTextarea";

export interface TimelineSlideProps {
  slide: Slide;
  isEditing?: boolean;
  onUpdate?: (content: TimelineSlideContent) => void;
  themeId?: ThemeId;
}

const MAX_EVENTS = 5;

export function TimelineSlide({
  slide,
  isEditing = false,
  onUpdate,
  themeId = "neon-cyber",
}: TimelineSlideProps) {
  const rawContent = (slide.content ?? {}) as Partial<TimelineSlideContent> & {
    events?: Array<
      Partial<TimelineSlideContent["events"][number]> & { title?: string }
    >;
  };

  const content = normalizeTimelineContent(rawContent);
  const textColor = slide.design?.textColor || "hsl(var(--foreground))";

  const handleTitleChange = (title: string) => {
    onUpdate?.({ ...content, title });
  };

  const handleEventChange = (
    index: number,
    field: "year" | "title" | "description",
    value: string
  ) => {
    const newEvents = [...content.events];
    newEvents[index] = { ...newEvents[index], [field]: value };
    onUpdate?.({ ...content, events: newEvents });
  };

  const addEvent = () => {
    if (content.events.length < MAX_EVENTS) {
      onUpdate?.({
        ...content,
        events: [
          ...content.events,
          { year: "2024", title: "New Event", description: "Event description" },
        ],
      });
    }
  };

  const removeEvent = (index: number) => {
    if (content.events.length > 2) {
      onUpdate?.({
        ...content,
        events: content.events.filter((_, i) => i !== index),
      });
    }
  };

  return (
    <SlideWrapper slide={slide} themeId={themeId}>
      <div className="flex flex-col h-full p-4 md:p-6 min-h-0">
        {/* Title */}
        {isEditing ? (
          <AutoResizeTextarea
            value={content.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="text-xl md:text-3xl font-bold bg-transparent border-0 outline-none mb-3 text-center placeholder:opacity-50"
            style={{ color: textColor }}
            placeholder="Timeline title..."
            minRows={1}
          />
        ) : (
          <h2
            className="text-xl md:text-3xl font-bold mb-3 text-center break-words"
            style={{ color: textColor }}
          >
            {content.title}
          </h2>
        )}

        {/* Timeline body - same in editor & present */}
        <TimelineHorizontal
          content={content}
          isEditing={isEditing}
          textColor={textColor}
          onUpdate={onUpdate}
          maxEvents={MAX_EVENTS}
          onAddEvent={addEvent}
          onRemoveEvent={removeEvent}
          onChange={handleEventChange}
        />

        {/* Add event button */}
        {isEditing && content.events.length < MAX_EVENTS && (
          <div className="text-center mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={addEvent}
              className="text-muted-foreground hover:text-foreground hover:bg-muted/40"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Event ({content.events.length}/{MAX_EVENTS})
            </Button>
          </div>
        )}
      </div>
    </SlideWrapper>
  );
}
