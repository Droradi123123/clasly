import { motion } from "framer-motion";
import { Image, Plus, Trash2 } from "lucide-react";
import { SlideWrapper } from "./SlideWrapper";
import type { Slide, SplitContentSlideContent } from "@/types/slides";
import type { ThemeId } from "@/types/themes";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "@/components/editor/ImageUploader";
import { AutoResizeTextarea } from "@/components/ui/AutoResizeTextarea";
import { inferDirectionFromSlide } from "@/lib/textDirection";

export interface SplitContentSlideProps {
  slide: Slide;
  isEditing?: boolean;
  onUpdate?: (content: SplitContentSlideContent) => void;
  themeId?: ThemeId;
}

const MAX_POINTS = 5;

export function SplitContentSlide({
  slide,
  isEditing = false,
  onUpdate,
  themeId = "neon-cyber",
}: SplitContentSlideProps) {
  const content = slide.content as SplitContentSlideContent;
  const textColor = slide.design?.textColor || "#ffffff";
  const imagePosition = content.imagePosition || "right";
  const direction = slide.design?.direction || inferDirectionFromSlide(slide);
  const textAlign = (slide.design?.textAlign || "center") as any;

  // Safe access to bulletPoints - handle legacy 'text' field or empty data
  const bulletPoints = content.bulletPoints || (content.text ? [content.text] : [""]);

  const handleTitleChange = (title: string) => {
    onUpdate?.({ ...content, title });
  };

  const handlePointChange = (index: number, value: string) => {
    const newPoints = [...bulletPoints];
    newPoints[index] = value;
    onUpdate?.({ ...content, bulletPoints: newPoints });
  };

  const addPoint = () => {
    if (bulletPoints.length < MAX_POINTS) {
      onUpdate?.({ ...content, bulletPoints: [...bulletPoints, "New point"] });
    }
  };

  const removePoint = (index: number) => {
    if (bulletPoints.length > 1) {
      const newPoints = bulletPoints.filter((_, i) => i !== index);
      onUpdate?.({ ...content, bulletPoints: newPoints });
    }
  };

  const handleImageUrlChange = (imageUrl: string) => {
    onUpdate?.({ ...content, imageUrl });
  };

  const textSection = (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center p-4 md:p-6" dir={direction}>
      {isEditing ? (
        <AutoResizeTextarea
          value={content.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="text-xl md:text-3xl font-bold bg-transparent border-0 outline-none mb-4 placeholder:opacity-50"
          style={{ color: textColor, textAlign }}
          placeholder="Enter title..."
          minRows={1}
        />
      ) : (
        <h2
          className="text-xl md:text-3xl font-bold mb-4 break-words"
          style={{ color: textColor, textAlign }}
        >
          {content.title}
        </h2>
      )}

      <ul className="space-y-3 min-h-0">
        {bulletPoints.map((point, index) => (
          <motion.li
            key={index}
            initial={{ opacity: 0, x: direction === "rtl" ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex items-start gap-3 group ${
              direction === "rtl" ? "flex-row-reverse" : "flex-row"
            }`}
          >
            <span className="w-2 h-2 rounded-full mt-2.5 flex-shrink-0 bg-primary" />

            {isEditing ? (
              <div className="flex-1 flex items-start gap-2 min-w-0">
                <AutoResizeTextarea
                  value={point}
                  onChange={(e) => handlePointChange(index, e.target.value)}
                  className="flex-1 text-base md:text-lg bg-transparent border-0 outline-none placeholder:opacity-50"
                  style={{ color: textColor, opacity: 0.9, textAlign }}
                  placeholder="Enter point..."
                  minRows={1}
                />
                {bulletPoints.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePoint(index)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-opacity"
                    aria-label="Remove point"
                    title="Remove point"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                )}
              </div>
            ) : (
              <span
                className="text-base md:text-lg break-words"
                style={{ color: textColor, opacity: 0.9, textAlign }}
              >
                {point}
              </span>
            )}
          </motion.li>
        ))}
      </ul>

      {isEditing && bulletPoints.length < MAX_POINTS && (
        <Button
          variant="ghost"
          size="sm"
          onClick={addPoint}
          className="mt-4 w-fit text-white/60 hover:text-white hover:bg-white/10"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Point
        </Button>
      )}
    </div>
  );

  const imageSection = (
    <div className="relative flex-1 min-w-0 min-h-0 h-full overflow-hidden">
      {content.imageUrl ? (
        <img
          src={content.imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : isEditing ? (
        <div className="absolute inset-0 flex items-center justify-center p-4 bg-black/15">
          <ImageUploader
            value={content.imageUrl}
            onChange={handleImageUrlChange}
            placeholder="Add slide image..."
            className="w-full max-w-xs"
          />
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 bg-black/10">
          <Image className="w-16 h-16 mb-4 opacity-50" />
          <p className="text-sm opacity-60">No image added</p>
        </div>
      )}
    </div>
  );

  return (
    <SlideWrapper slide={slide} themeId={themeId}>
      <div className="flex h-full min-h-0 flex-col">
        <div
          className={`flex min-h-0 flex-1 flex-row ${
            imagePosition === "left" ? "flex-row-reverse" : "flex-row"
          }`}
        >
          {textSection}
          {imageSection}
        </div>
      </div>
    </SlideWrapper>
  );
}
