import { motion } from "framer-motion";
import { Image, Plus, Trash2, ArrowLeftRight } from "lucide-react";
import { SlideWrapper } from "./SlideWrapper";
import type { Slide, SplitContentSlideContent, ImagePosition } from "@/types/slides";
import type { ThemeId } from "@/types/themes";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "@/components/editor/ImageUploader";
import { SlideImage } from "@/components/editor/SlideImage";
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

  const toggleImagePosition = () => {
    const newPosition: ImagePosition = imagePosition === "left" ? "right" : "left";
    onUpdate?.({ ...content, imagePosition: newPosition });
  };

  const textSection = (
    <div className="flex-1 flex flex-col justify-center p-4 md:p-6 min-h-0" dir={direction}>
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

      <ul className="space-y-3 min-h-0 list-none ps-0 pe-0" style={{ listStyle: 'none' }}>
        {bulletPoints.map((point, index) => (
          <motion.li
            key={index}
            initial={{ opacity: 0, x: direction === "rtl" ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-start gap-3 group"
          >
            <span className="w-2 h-2 rounded-full mt-2.5 flex-shrink-0 bg-primary" aria-hidden />

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
        <div className="mt-4" style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={addPoint}
            className="w-fit text-white/60 hover:text-white hover:bg-white/10"
          >
            <Plus className={`w-4 h-4 ${direction === 'rtl' ? 'ml-1' : 'mr-1'}`} />
            Add Point
          </Button>
        </div>
      )}
    </div>
  );

  const imageSection = (
    <div className="flex-1 flex items-center justify-center p-4 bg-gradient-to-br from-primary/20 to-primary/40 rounded-2xl m-4">
      {content.imageUrl ? (
        <div className="relative w-full h-full flex items-center justify-center">
          <SlideImage
            src={content.imageUrl}
            alt="Slide image"
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
          />
          {isEditing && (
            <button
              type="button"
              onClick={() => handleImageUrlChange("")}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
              aria-label="Remove image"
              title="Remove image"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : isEditing ? (
        <ImageUploader
          value={content.imageUrl}
          onChange={handleImageUrlChange}
          placeholder="Add slide image..."
          className="w-full max-w-xs"
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-white/50">
          <Image className="w-16 h-16 mb-4 opacity-50" />
          <p className="text-sm opacity-60">No image added</p>
        </div>
      )}
    </div>
  );

  return (
    <SlideWrapper slide={slide} themeId={themeId}>
      <div className="flex flex-col h-full min-h-0">
        {/* Toggle button for image position */}
        {isEditing && (
          <div className="absolute top-4 right-4 z-10">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleImagePosition}
              className="text-white/60 hover:text-white hover:bg-white/10"
              title={`Image on ${imagePosition === "left" ? "right" : "left"}`}
            >
              <ArrowLeftRight className="w-4 h-4 mr-1" />
              Swap
            </Button>
          </div>
        )}

        <div
          className={`flex-1 flex min-h-0 ${
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
