/**
 * Image utility functions for loading, resizing, and optimizing images
 * Used for imported presentations to maintain quality while reducing file size
 */

// Check if URL is external (not data URL or blob)
export function isExternalUrl(url: string): boolean {
  if (url.startsWith("data:") || url.startsWith("blob:")) return false;
  try {
    return new URL(url).origin !== window.location.origin;
  } catch {
    return false;
  }
}

/**
 * Load an image onto a canvas, respecting CORS and original dimensions
 */
export function loadImageToCanvas(
  imageUrl: string
): Promise<{ canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (isExternalUrl(imageUrl)) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => {
      const canvas = document.createElement("canvas");
      // Use naturalWidth/Height to preserve original dimensions
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve({ canvas, ctx, width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${imageUrl}`));
    img.src = imageUrl;
  });
}

/**
 * Resize an image while maintaining aspect ratio and controlling quality
 * Returns a compressed JPEG blob for smaller file sizes
 */
export async function resizeImage(
  imageDataUrl: string,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.85
): Promise<string> {
  const { canvas } = await loadImageToCanvas(imageDataUrl);
  
  let { width, height } = canvas;
  
  // Calculate new dimensions maintaining aspect ratio
  const aspectRatio = width / height;
  
  if (width > maxWidth) {
    width = maxWidth;
    height = Math.round(width / aspectRatio);
  }
  if (height > maxHeight) {
    height = maxHeight;
    width = Math.round(height * aspectRatio);
  }
  
  // Create resized canvas
  const resizedCanvas = document.createElement("canvas");
  resizedCanvas.width = width;
  resizedCanvas.height = height;
  
  const ctx = resizedCanvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(canvas, 0, 0, width, height);
  
  // Return as JPEG data URL for better compression
  return resizedCanvas.toDataURL("image/jpeg", quality);
}

/**
 * Convert an SVG data URL to a rasterized PNG for better performance
 * SVGs with embedded images are very heavy - converting to PNG is much lighter
 */
export async function svgToPng(
  svgDataUrl: string,
  targetWidth: number = 1920,
  targetHeight: number = 1080,
  quality: number = 0.9
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      // Background uses white by default for presentation imports
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // Draw with "contain" math to avoid any distortion
      const iw = img.naturalWidth || targetWidth;
      const ih = img.naturalHeight || targetHeight;
      const scale = Math.min(targetWidth / iw, targetHeight / ih);
      const dw = Math.round(iw * scale);
      const dh = Math.round(ih * scale);
      const dx = Math.round((targetWidth - dw) / 2);
      const dy = Math.round((targetHeight - dh) / 2);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, dx, dy, dw, dh);

      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("Failed to load SVG for conversion"));
    img.src = svgDataUrl;
  });
}

/**
 * Get the natural aspect ratio of an image from its data URL
 */
export function getImageAspectRatio(imageDataUrl: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve(img.naturalWidth / img.naturalHeight);
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = imageDataUrl;
  });
}
