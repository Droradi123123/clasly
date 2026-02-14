import { motion } from "framer-motion";
import type { TimelineSlideContent } from "@/types/slides";

interface TimelineVerticalProps {
  content: TimelineSlideContent;
  isEditing: boolean;
  textColor: string;
  onUpdate?: (content: TimelineSlideContent) => void;
  onChange: (
    index: number,
    field: "year" | "title" | "description",
    value: string
  ) => void;
  onRemoveEvent: (index: number) => void;
}

export function TimelineVertical({
  content,
  isEditing,
  textColor,
  onChange,
  onRemoveEvent,
}: TimelineVerticalProps) {
  const { events } = content;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto pr-1">
      <div className="relative pl-6 md:pl-8">
        {/* Axis */}
        <div className="absolute left-2.5 md:left-3 top-0 bottom-0 w-0.5 bg-primary/60 rounded" />

        <div className="space-y-4 md:space-y-5">
          {events.map((event, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className="relative"
            >
              {/* Dot */}
              <div className="absolute -left-[18px] md:-left-[22px] top-3 w-3 h-3 md:w-4 md:h-4 rounded-full bg-primary border-4 border-background" />

              <div className="rounded-xl border border-border/40 bg-card/30 backdrop-blur-sm p-3 md:p-4">
                <div className="flex items-start justify-between gap-3">
                  {isEditing ? (
                    <input
                      value={event.year}
                      onChange={(e) => onChange(index, "year", e.target.value)}
                      className="text-sm md:text-base font-bold bg-transparent border-0 outline-none text-primary w-24"
                      placeholder="Year"
                      maxLength={12}
                    />
                  ) : (
                    <div className="text-sm md:text-base font-bold text-primary whitespace-nowrap">
                      {event.year}
                    </div>
                  )}

                  {isEditing && events.length > 2 && (
                    <button
                      type="button"
                      onClick={() => onRemoveEvent(index)}
                      className="text-xs text-muted-foreground hover:text-destructive transition"
                      title="Remove event"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="mt-2">
                  {isEditing ? (
                    <>
                      <input
                        value={event.title}
                        onChange={(e) => onChange(index, "title", e.target.value)}
                        className="w-full text-sm md:text-base font-bold bg-transparent border-0 outline-none"
                        style={{ color: textColor }}
                        placeholder="Event title..."
                        maxLength={120}
                      />
                      <textarea
                        value={event.description}
                        onChange={(e) =>
                          onChange(index, "description", e.target.value)
                        }
                        className="w-full mt-1 text-xs md:text-sm bg-transparent border-0 outline-none resize-none"
                        style={{ color: textColor, opacity: 0.75 }}
                        placeholder="Description..."
                        rows={3}
                        maxLength={500}
                      />
                    </>
                  ) : (
                    <>
                      <div
                        className="text-sm md:text-base font-bold break-words"
                        style={{ color: textColor }}
                      >
                        {event.title}
                      </div>
                      {event.description && (
                        <div
                          className="mt-1 text-xs md:text-sm break-words"
                          style={{ color: textColor, opacity: 0.75 }}
                        >
                          {event.description}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
