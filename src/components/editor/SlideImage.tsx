import { useState, useEffect, useRef } from "react";
import { Image } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SlideImageProps {
  src: string;
  alt?: string;
  className?: string;
}

/** Normalize image URL for display (trim, resolve relative) */
function normalizeImageSrc(src: string): string {
  const s = (src || "").trim();
  if (!s) return "";
  if (s.startsWith("data:") || s.startsWith("blob:")) return s;
  try {
    const u = new URL(s, window.location.origin);
    return u.href;
  } catch {
    return s;
  }
}

const SUPABASE_STORAGE_PUBLIC_PREFIX = "/storage/v1/object/public/slide-images/";

/** If url is Supabase public object URL, return the storage path; else null */
function getSupabaseStoragePath(url: string): string | null {
  try {
    const idx = url.indexOf(SUPABASE_STORAGE_PUBLIC_PREFIX);
    if (idx === -1) return null;
    const path = url.slice(idx + SUPABASE_STORAGE_PUBLIC_PREFIX.length).split("?")[0];
    return path || null;
  } catch {
    return null;
  }
}

/**
 * Renders slide images with error fallback.
 * Resets error when src changes. On load error, tries signed URL for Supabase storage.
 */
export function SlideImage({ src, alt = "Slide image", className = "" }: SlideImageProps) {
  const [hasError, setHasError] = useState(false);
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const signedRequestedRef = useRef(false);
  const normalizedSrc = normalizeImageSrc(src);

  useEffect(() => {
    setHasError(false);
    setResolvedSrc(null);
    signedRequestedRef.current = false;
  }, [normalizedSrc]);

  const displaySrc = resolvedSrc ?? normalizedSrc;

  const handleError = () => {
    const path = getSupabaseStoragePath(normalizedSrc);
    if (path && !signedRequestedRef.current) {
      signedRequestedRef.current = true;
      supabase.storage
        .from("slide-images")
        .createSignedUrl(path, 60 * 60 * 24 * 365)
        .then(({ data }) => {
          if (data?.signedUrl) setResolvedSrc(data.signedUrl);
          else setHasError(true);
        })
        .catch(() => setHasError(true));
    } else {
      setHasError(true);
    }
  };

  if (hasError || !displaySrc) {
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
      src={displaySrc}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={handleError}
    />
  );
}
