import { motion } from "framer-motion";
import { Zap, Plus, Trash2 } from "lucide-react";
import { SlideWrapper } from "./SlideWrapper";
import { Slide, BulletPointsSlideContent } from "@/types/slides";
import { ThemeId, getTheme } from "@/types/themes";
import { Button } from "@/components/ui/button";
import { inferDirectionFromSlide } from "@/lib/textDirection";

export interface BulletPointsSlideProps {
  slide: Slide;
  isEditing?: boolean;
  onUpdate?: (content: BulletPointsSlideContent) => void;
  themeId?: ThemeId;
}

const MAX_POINTS = 6;

export function BulletPointsSlide({
  slide,
  isEditing = false,
  onUpdate,
  themeId = 'neon-cyber',
}: BulletPointsSlideProps) {
  const content = slide.content as BulletPointsSlideContent;
  const theme = getTheme(themeId);
  const textColor = slide.design?.textColor || '#ffffff';
  const direction = slide.design?.direction ?? inferDirectionFromSlide(slide);
  const textAlign = slide.design?.textAlign || (direction === 'rtl' ? 'right' : 'left');

  const handleTitleChange = (title: string) => {
    onUpdate?.({ ...content, title });
  };

  const handlePointTitleChange = (index: number, title: string) => {
    const newPoints = [...content.points];
    newPoints[index] = { ...newPoints[index], title };
    onUpdate?.({ ...content, points: newPoints });
  };

  const handlePointDescChange = (index: number, description: string) => {
    const newPoints = [...content.points];
    newPoints[index] = { ...newPoints[index], description };
    onUpdate?.({ ...content, points: newPoints });
  };

  const addPoint = () => {
    if (content.points.length < MAX_POINTS) {
      onUpdate?.({ 
        ...content, 
        points: [...content.points, { title: 'New Point', description: 'Add description' }] 
      });
    }
  };

  const removePoint = (index: number) => {
    if (content.points.length > 1) {
      onUpdate?.({ ...content, points: content.points.filter((_, i) => i !== index) });
    }
  };

  return (
    <SlideWrapper slide={slide} themeId={themeId}>
      <div className="flex flex-col h-full p-4 md:p-6 overflow-hidden" dir={direction}>
        {/* Title - more compact */}
        {isEditing ? (
          <input
            value={content.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="text-xl md:text-3xl font-bold bg-transparent border-0 outline-none mb-4 placeholder:opacity-50"
            style={{ color: textColor, textAlign }}
            placeholder="Enter title..."
          />
        ) : (
          <h2 className="text-xl md:text-3xl font-bold mb-4" style={{ color: textColor, textAlign }}>
            {content.title}
          </h2>
        )}

        {/* Points list - RTL: icon (bullet) on the right */}
        <div className="flex-1 space-y-3 overflow-y-auto min-h-0">
          {content.points.map((point, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-start gap-4 group ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}
            >
              {/* Icon (bullet) - RTL places it on the right */}
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary/20">
                <Zap className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <div className="space-y-1">
                    <input
                      value={point.title}
                      onChange={(e) => handlePointTitleChange(index, e.target.value)}
                      className="text-lg md:text-xl font-semibold bg-transparent border-0 outline-none w-full"
                      style={{ color: textColor, textAlign }}
                      placeholder="Point title..."
                    />
                    <input
                      value={point.description}
                      onChange={(e) => handlePointDescChange(index, e.target.value)}
                      className="text-sm md:text-base bg-transparent border-0 outline-none w-full"
                      style={{ color: textColor, opacity: 0.7, textAlign }}
                      placeholder="Point description..."
                    />
                  </div>
                ) : (
                  <>
                    <h3 className="text-lg md:text-xl font-semibold" style={{ color: textColor, textAlign }}>
                      {point.title}
                    </h3>
                    <p className="text-sm md:text-base" style={{ color: textColor, opacity: 0.7, textAlign }}>
                      {point.description}
                    </p>
                  </>
                )}
              </div>

              {/* Delete button */}
              {isEditing && content.points.length > 1 && (
                <button
                  onClick={() => removePoint(index)}
                  className="opacity-0 group-hover:opacity-100 p-2 hover:bg-white/10 rounded transition-opacity flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              )}
            </motion.div>
          ))}
        </div>

        {/* Add point button - align with direction */}
        {isEditing && content.points.length < MAX_POINTS && (
          <div className="mt-4" style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={addPoint}
              className="w-fit text-white/60 hover:text-white hover:bg-white/10"
            >
              <Plus className={`w-4 h-4 ${direction === 'rtl' ? 'ml-1' : 'mr-1'}`} />
              Add Point ({content.points.length}/{MAX_POINTS})
            </Button>
          </div>
        )}
      </div>
    </SlideWrapper>
  );
}
