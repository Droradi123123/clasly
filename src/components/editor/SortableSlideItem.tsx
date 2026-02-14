import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { Slide } from "@/types/slides";
import { isQuizSlide, isInteractiveSlide } from "@/types/slides";

interface SortableSlideItemProps {
  slide: Slide;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}

export function SortableSlideItem({
  slide,
  index,
  isSelected,
  onClick,
}: SortableSlideItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slide.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const isQuiz = isQuizSlide(slide.type);
  const isInteractive = isInteractiveSlide(slide.type);

  const slideTitle =
    (slide.content as any).title ||
    (slide.content as any).question ||
    (slide.content as any).statement ||
    "Untitled";

  // Only show an image preview for imported "image" slides.
  const showImageThumb =
    slide.type === "image" && typeof (slide.content as any).imageUrl === "string";

  const slideTypeLabel = String(slide.type).replace(/_/g, " ");

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative w-full p-2 rounded-lg border text-left transition-all
        ${isDragging ? "opacity-50 shadow-lg scale-105" : ""}
        ${
          isSelected
            ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30"
            : "border-border/40 bg-card/50 hover:border-primary/30 hover:bg-card/80"
        }
      `}
    >
      <button onClick={onClick} className="w-full text-left" type="button">
        <div className="flex items-center gap-1.5">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-0.5 -ml-1 hover:bg-muted rounded"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-3 h-3 text-muted-foreground/50" />
          </div>

          <span className="text-[10px] font-bold text-muted-foreground min-w-[14px]">
            {index + 1}
          </span>

          {/* Badges */}
          {isQuiz && (
            <span className="ml-auto px-1 py-0.5 text-[8px] font-bold rounded bg-accent/20 text-accent-foreground">
              QUIZ
            </span>
          )}
          {isInteractive && (
            <span className="ml-auto px-1 py-0.5 text-[8px] font-bold rounded bg-primary/20 text-primary">
              LIVE
            </span>
          )}
        </div>

        {/* Slide preview thumbnail (only for imported image slides) */}
        {showImageThumb ? (
          <div className="mt-1.5 w-full aspect-video rounded overflow-hidden bg-muted">
            <img
              src={(slide.content as any).imageUrl}
              alt={slideTitle}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="mt-1">
            <p
              className="text-[11px] font-medium text-foreground truncate"
              title={slideTitle}
            >
              {slideTitle}
            </p>
            <span className="text-[9px] text-muted-foreground capitalize">
              {slideTypeLabel}
            </span>
          </div>
        )}

        {/* For imported image slides, still show type */}
        {showImageThumb && (
          <span className="mt-1 block text-[9px] text-muted-foreground capitalize">
            {slideTypeLabel}
          </span>
        )}
      </button>
    </div>
  );
}
