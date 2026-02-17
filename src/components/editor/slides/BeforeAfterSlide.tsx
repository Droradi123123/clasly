import { motion } from "framer-motion";
import { ArrowRightLeft, Plus, Trash2 } from "lucide-react";
import { SlideWrapper } from "./SlideWrapper";
import { Slide, BeforeAfterSlideContent } from "@/types/slides";
import { ThemeId, getTheme } from "@/types/themes";
import { Button } from "@/components/ui/button";
import { inferDirectionFromSlide } from "@/lib/textDirection";

export interface BeforeAfterSlideProps {
  slide: Slide;
  isEditing?: boolean;
  onUpdate?: (content: BeforeAfterSlideContent) => void;
  themeId?: ThemeId;
}

const MAX_POINTS = 5;

export function BeforeAfterSlide({
  slide,
  isEditing = false,
  onUpdate,
  themeId = 'neon-cyber',
}: BeforeAfterSlideProps) {
  const content = slide.content as BeforeAfterSlideContent;
  const theme = getTheme(themeId);
  const textColor = slide.design?.textColor || '#ffffff';
  const direction = slide.design?.direction ?? inferDirectionFromSlide(slide);
  const textAlign = slide.design?.textAlign || (direction === 'rtl' ? 'right' : 'left');

  const handleBeforeTitleChange = (beforeTitle: string) => {
    onUpdate?.({ ...content, beforeTitle });
  };

  const handleAfterTitleChange = (afterTitle: string) => {
    onUpdate?.({ ...content, afterTitle });
  };

  const handleBeforePointChange = (index: number, value: string) => {
    const newPoints = [...content.beforePoints];
    newPoints[index] = value;
    onUpdate?.({ ...content, beforePoints: newPoints });
  };

  const handleAfterPointChange = (index: number, value: string) => {
    const newPoints = [...content.afterPoints];
    newPoints[index] = value;
    onUpdate?.({ ...content, afterPoints: newPoints });
  };

  const addBeforePoint = () => {
    if (content.beforePoints.length < MAX_POINTS) {
      onUpdate?.({ ...content, beforePoints: [...content.beforePoints, 'New point'] });
    }
  };

  const addAfterPoint = () => {
    if (content.afterPoints.length < MAX_POINTS) {
      onUpdate?.({ ...content, afterPoints: [...content.afterPoints, 'New point'] });
    }
  };

  const removeBeforePoint = (index: number) => {
    if (content.beforePoints.length > 1) {
      onUpdate?.({ ...content, beforePoints: content.beforePoints.filter((_, i) => i !== index) });
    }
  };

  const removeAfterPoint = (index: number) => {
    if (content.afterPoints.length > 1) {
      onUpdate?.({ ...content, afterPoints: content.afterPoints.filter((_, i) => i !== index) });
    }
  };

  const renderColumn = (
    title: string,
    points: string[],
    onTitleChange: (v: string) => void,
    onPointChange: (i: number, v: string) => void,
    onAddPoint: () => void,
    onRemovePoint: (i: number) => void,
    isAfter: boolean
  ) => (
    <div 
      className={`flex-1 p-6 md:p-10 ${isAfter ? 'bg-gradient-to-br from-primary/30 to-primary/50 rounded-r-2xl' : ''}`}
      dir={direction}
    >
      {isEditing ? (
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="text-2xl md:text-3xl font-bold bg-transparent border-0 outline-none mb-6 placeholder:opacity-50 w-full"
          style={{ color: textColor, textAlign }}
          placeholder={isAfter ? "After title..." : "Before title..."}
        />
      ) : (
        <h2 className="text-2xl md:text-3xl font-bold mb-6" style={{ color: textColor, textAlign }}>
          {title}
        </h2>
      )}

      <ul className="space-y-4 list-none ps-0 pe-0" style={{ listStyle: 'none' }}>
        {points.map((point, index) => (
          <motion.li
            key={index}
            initial={{ opacity: 0, x: isAfter ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-start gap-3 group"
          >
            <span 
              className="w-2 h-2 rounded-full mt-2.5 flex-shrink-0"
              style={{ backgroundColor: isAfter ? '#10B981' : textColor }}
              aria-hidden
            />
            {isEditing ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  value={point}
                  onChange={(e) => onPointChange(index, e.target.value)}
                  className="flex-1 text-base md:text-lg bg-transparent border-0 outline-none"
                  style={{ color: textColor, opacity: 0.9, textAlign }}
                  placeholder="Enter point..."
                />
                {points.length > 1 && (
                  <button
                    onClick={() => onRemovePoint(index)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-opacity"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                )}
              </div>
            ) : (
              <span className="text-base md:text-lg" style={{ color: textColor, opacity: 0.9, textAlign }}>
                {point}
              </span>
            )}
          </motion.li>
        ))}
      </ul>

      {isEditing && points.length < MAX_POINTS && (
        <div className="mt-4" style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddPoint}
            className="w-fit text-white/60 hover:text-white hover:bg-white/10"
          >
            <Plus className={`w-4 h-4 ${direction === 'rtl' ? 'ml-1' : 'mr-1'}`} />
            Add Point
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <SlideWrapper slide={slide} themeId={themeId}>
      <div className="flex h-full">
        {/* Before column */}
        {renderColumn(
          content.beforeTitle,
          content.beforePoints,
          handleBeforeTitleChange,
          handleBeforePointChange,
          addBeforePoint,
          removeBeforePoint,
          false
        )}

        {/* After column */}
        {renderColumn(
          content.afterTitle,
          content.afterPoints,
          handleAfterTitleChange,
          handleAfterPointChange,
          addAfterPoint,
          removeAfterPoint,
          true
        )}
      </div>
    </SlideWrapper>
  );
}
