import { useState } from "react";
import { Image } from "lucide-react";

interface SlideImageProps {
  src: string;
  alt?: string;
  className?: string;
}

/**
 * Renders slide images with error fallback and CORS-friendly attributes.
 * Use this instead of raw <img> for slide images to handle load failures.
 */
export function SlideImage({ src, alt = "Slide image", className = "" }: SlideImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-muted/50 rounded-lg text-muted-foreground ${className}`}
      >
        <Image className="w-12 h-12 mb-2 opacity-50" />
        <span className="text-xs">Image unavailable</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
    />
  );
}
