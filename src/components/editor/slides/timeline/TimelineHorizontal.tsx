import { motion } from "framer-motion";
import { AutoResizeTextarea } from "@/components/ui/AutoResizeTextarea";
import type { TimelineSlideContent } from "@/types/slides";

interface TimelineHorizontalProps {
  content: TimelineSlideContent;
  isEditing: boolean;
  textColor: string;
  onUpdate?: (content: TimelineSlideContent) => void;
  maxEvents: number;
  onAddEvent: () => void;
  onRemoveEvent: (index: number) => void;
  onChange: (
    index: number,
    field: "year" | "title" | "description",
    value: string
  ) => void;
}

export function TimelineHorizontal({
  content,
  isEditing,
  textColor,
  maxEvents,
  onAddEvent,
  onRemoveEvent,
  onChange,
}: TimelineHorizontalProps) {
  const { events } = content;

  return (
    <div className="flex-1 relative flex items-center justify-center min-h-0">
      {/* Horizontal line */}
      <div className="absolute left-4 right-4 md:left-8 md:right-8 h-1 top-1/2 -translate-y-1/2 rounded-full bg-primary" />

      {/* Events */}
      <div className="relative w-full px-4 md:px-8 overflow-x-auto">
        <div className="min-w-[720px] flex items-center justify-between gap-4">
          {events.map((event, index) => {
            const isTop = index % 2 === 0;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: isTop ? -20 : 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.12 }}
                className={`flex flex-col items-center relative group flex-shrink-0 ${
                  isTop ? "flex-col" : "flex-col-reverse"
                }`}
                style={{ width: 220 }}
              >
                {/* Content */}
                <div className={`${isTop ? "mb-3" : "mt-3"} text-center w-full px-1`}>
                  {isEditing ? (
                    <>
                      <AutoResizeTextarea
                        value={event.title}
                        onChange={(e) => onChange(index, "title", e.target.value)}
                        className="text-xs md:text-sm font-bold bg-transparent border-0 outline-none w-full text-center resize-none leading-snug"
                        style={{ color: textColor }}
                        placeholder="Event title..."
                        minRows={1}
                      />
                      <AutoResizeTextarea
                        value={event.description}
                        onChange={(e) => onChange(index, "description", e.target.value)}
                        className="text-[10px] md:text-xs bg-transparent border-0 outline-none w-full text-center resize-none leading-snug"
                        style={{ color: textColor, opacity: 0.75 }}
                        placeholder="Description..."
                        minRows={2}
                      />
                    </>
                  ) : (
                    <>
                      <h4
                        className="text-[11px] md:text-sm font-bold break-words"
                        style={{ color: textColor }}
                      >
                        {event.title}
                      </h4>
                      {event.description && (
                        <p
                          className="text-[9px] md:text-xs break-words mt-1 opacity-80"
                          style={{ color: textColor }}
                        >
                          {event.description}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Connector line */}
                <div
                  className="w-0.5 h-6"
                  style={{ backgroundColor: textColor, opacity: 0.25 }}
                />

                {/* Dot */}
                <div className="w-3 h-3 md:w-4 md:h-4 rounded-full border-2 md:border-4 z-10 bg-primary border-background flex-shrink-0" />

                <div className={`${isTop ? "mt-2" : "mb-2"} w-full flex justify-center`}>
                  {isEditing ? (
                    <AutoResizeTextarea
                      value={event.year}
                      onChange={(e) => onChange(index, "year", e.target.value)}
                      className="text-xs md:text-sm font-bold bg-transparent border-0 outline-none w-20 text-center text-primary resize-none leading-none"
                      placeholder="Year"
                      minRows={1}
                    />
                  ) : (
                    <span className="text-xs md:text-sm font-bold text-primary whitespace-nowrap">
                      {event.year}
                    </span>
                  )}
                </div>

                {/* Delete button */}
                {isEditing && events.length > 2 && (
                  <button
                    onClick={() => onRemoveEvent(index)}
                    className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 p-1 hover:bg-muted/40 rounded transition-opacity"
                    type="button"
                  >
                    <span className="text-destructive text-xs font-bold">×</span>
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Add event button */}
      {isEditing && events.length < maxEvents && (
        <div className="absolute bottom-0 left-0 right-0 text-center pb-2">
          <button
            type="button"
            onClick={onAddEvent}
            className="text-xs text-muted-foreground hover:text-foreground transition"
          >
            + Add Event ({events.length}/{maxEvents})
          </button>
        </div>
      )}
    </div>
  );
}
