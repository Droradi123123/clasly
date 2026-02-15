import * as pdfjsLib from "pdfjs-dist";

// Ensure the worker is correctly resolved by Vite.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export type PdfToImagesResult = {
  pageNumber: number;
  imageDataUrl: string;
  aspectRatio: number;
}[];

export async function pdfFileToPngDataUrls(file: File): Promise<PdfToImagesResult> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const result: PdfToImagesResult = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);

    // Get the original viewport to preserve aspect ratio
    const originalViewport = page.getViewport({ scale: 1 });
    const aspectRatio = originalViewport.width / originalViewport.height;
    
    // High-resolution scale: max 2560px wide for sharp text and graphics
    const maxWidth = 2560;
    const scale = Math.min(maxWidth / originalViewport.width, 3);
    
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Failed to create canvas context");

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    // pdfjs typing in recent versions expects both canvas + canvasContext
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (page.render as any)({ canvas, canvasContext: context, viewport }).promise;
    
    // JPEG at 0.92 for high quality while keeping size reasonable
    result.push({
      pageNumber,
      imageDataUrl: canvas.toDataURL("image/jpeg", 0.92),
      aspectRatio,
    });
  }

  return result;
}
