import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  FileImage,
  FileText,
  Presentation,
  Loader2,
  Check,
  X,
  Lock,
  Crown,
} from "lucide-react";
import { Slide, createNewSlide } from "@/types/slides";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { pdfFileToPngDataUrls } from "@/lib/pdfToImages";
import { svgToPng, resizeImage } from "@/lib/imageUtils";
import { useSubscriptionContext } from "@/contexts/SubscriptionContext";

interface ImportedSlide {
  pageNumber: number;
  imageUrl: string;
  title?: string;
  aspectRatio?: number;
}

interface ImportPresentationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSlidesImported: (slides: Slide[]) => void;
  existingSlideCount: number;
  onUpgradeRequired?: () => void;
}

export function ImportPresentationDialog({
  open,
  onOpenChange,
  onSlidesImported,
  existingSlideCount,
  onUpgradeRequired,
}: ImportPresentationDialogProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [importedSlides, setImportedSlides] = useState<ImportedSlide[]>([]);
  const [selectedSlides, setSelectedSlides] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { canUse, isPro } = useSubscriptionContext();
  const canImport = canUse('import') || isPro;

  const resetState = () => {
    setImportedSlides([]);
    setSelectedSlides(new Set());
    setProgress(0);
    setProgressMessage("");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (!canImport) {
      onUpgradeRequired?.();
      return;
    }
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await processFiles(files);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canImport) {
      onUpgradeRequired?.();
      return;
    }
    
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFiles(Array.from(files));
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    if (!canImport) {
      onUpgradeRequired?.();
      return;
    }
    fileInputRef.current?.click();
  };

  const processFiles = async (files: File[]) => {
    setIsProcessing(true);
    setProgress(5);
    
    const allSlides: ImportedSlide[] = [];
    const totalFiles = files.length;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgressMessage(`Processing ${file.name}...`);
      
      const slides = await processFile(file, (fileProgress) => {
        const baseProgress = (i / totalFiles) * 90;
        const fileContribution = (fileProgress / 100) * (90 / totalFiles);
        setProgress(5 + baseProgress + fileContribution);
      });
      
      allSlides.push(...slides);
    }
    
    if (allSlides.length > 0) {
      setImportedSlides(allSlides);
      setSelectedSlides(new Set(allSlides.map((_, i) => i)));
    }
    
    setProgress(100);
    setProgressMessage("");
    setIsProcessing(false);
  };

  const processFile = async (
    file: File,
    onProgress: (progress: number) => void
  ): Promise<ImportedSlide[]> => {
    const fileName = file.name.toLowerCase();
    const isPdf = file.type === 'application/pdf' || fileName.endsWith('.pdf');
    const isPptx = fileName.endsWith('.pptx') || fileName.endsWith('.ppt') || 
                   file.type.includes('presentation') || file.type.includes('powerpoint');
    const isImage = file.type.startsWith('image/');

    if (file.size > 20 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 20MB.');
      return [];
    }

    try {
      if (isImage) {
        onProgress(30);
        const rawImageUrl = await readFileAsDataURL(file);
        onProgress(60);
        const optimizedUrl = await resizeImage(rawImageUrl, 2560, 1440, 0.92);
        onProgress(100);
        return [{
          pageNumber: 1,
          imageUrl: optimizedUrl,
          title: file.name.replace(/\.[^/.]+$/, ''),
        }];
      }

      if (isPptx) {
        setProgressMessage('Converting PowerPoint slides...');
        onProgress(20);

        const formData = new FormData();
        formData.append('file', file);

        const { data: { session } } = await supabase.auth.getSession();
        const { EDGE_FUNCTION_URLS, getFunctionsHeadersForFormData } = await import('@/lib/supabaseFunctions');
        const headers = getFunctionsHeadersForFormData(session?.access_token ?? null);

        const response = await fetch(
          EDGE_FUNCTION_URLS['convert-to-images'],
          {
            method: 'POST',
            body: formData,
            headers,
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          let msg = typeof errorData?.error === 'string' ? errorData.error : response.statusText || 'Failed to convert PowerPoint';
          if (response.status === 404) {
            msg = 'PPTX conversion service not available. Deploy the convert-to-images Edge Function (see docs or run: npm run deploy:functions).';
          } else if (response.status === 401 || response.status === 403) {
            msg = 'Please sign in and try again.';
          }
          throw new Error(msg);
        }

        const result = await response.json();
        onProgress(90);

        if (result.images && Array.isArray(result.images) && result.images.length > 0) {
          toast.success(`Converting ${result.images.length} slides...`);
          // High resolution: 2560x1440, quality 0.92 for slide fidelity
          const targetW = 2560;
          const targetH = 1440;
          const quality = 0.92;
          const optimizedImages = await Promise.all(
            result.images.map(async (img: { pageNumber: number; imageData: string }, idx: number) => {
              try {
                const optimizedUrl = img.imageData?.startsWith?.('data:image/svg')
                  ? await svgToPng(img.imageData, targetW, targetH, quality)
                  : await resizeImage(img.imageData || '', targetW, targetH, quality);
                return {
                  pageNumber: img.pageNumber ?? idx + 1,
                  imageUrl: optimizedUrl,
                  title: `Slide ${img.pageNumber ?? idx + 1}`,
                };
              } catch (e) {
                console.error(`Error optimizing slide ${idx + 1}:`, e);
                return {
                  pageNumber: img.pageNumber ?? idx + 1,
                  imageUrl: img.imageData || '',
                  title: `Slide ${img.pageNumber ?? idx + 1}`,
                };
              }
            })
          );
          toast.success(`Imported ${optimizedImages.length} slides`);
          return optimizedImages;
        }
        toast.error(result?.error || 'No slides found in PowerPoint file');
        return [];
      }

      if (isPdf) {
        setProgressMessage('Rendering PDF pages to images...');
        onProgress(20);

        const pages = await pdfFileToPngDataUrls(file);
        onProgress(90);

        toast.success(`Converted ${pages.length} pages to images`);
        return pages.map((p) => ({
          pageNumber: p.pageNumber,
          imageUrl: p.imageDataUrl,
          title: `Slide ${p.pageNumber}`,
          aspectRatio: p.aspectRatio,
        }));
      }

      toast.error('Unsupported format. Please upload PDF or images.');
      return [];
    } catch (error) {
      console.error('Error processing file:', error);
      let message = error instanceof Error ? error.message : 'Failed to process file.';
      if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
        message = 'Network error. Check connection and try again. For PPTX, ensure convert-to-images Edge Function is deployed.';
      }
      toast.error(message);
      return [];
    }
  };

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const toggleSlideSelection = (index: number) => {
    const newSelected = new Set(selectedSlides);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedSlides(newSelected);
  };

  const handleImport = () => {
    const slidesToImport = importedSlides
      .filter((_, index) => selectedSlides.has(index))
      .map((importedSlide, index) => {
        const slideOrder = existingSlideCount + index;
        const slide = createNewSlide('image', slideOrder);
        slide.content = {
          title: importedSlide.title || `Slide ${importedSlide.pageNumber}`,
          imageUrl: importedSlide.imageUrl,
        };
        return slide;
      });

    onSlidesImported(slidesToImport);
    onOpenChange(false);
    resetState();
    toast.success(`Imported ${slidesToImport.length} slide${slidesToImport.length > 1 ? 's' : ''}`);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetState();
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Import Presentation
            {!canImport && (
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-600 text-xs font-medium">
                <Crown className="w-3 h-3" />
                Pro
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            {canImport 
              ? "Upload a PDF or images - each slide becomes a pixel-perfect image"
              : "Upgrade to Pro to import PowerPoint and PDF presentations"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            {!canImport ? (
              <motion.div
                key="locked"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center py-8"
              >
                <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-yellow-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Pro Feature</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  Import presentations from PowerPoint, PDF, and images with a Pro subscription.
                </p>
                <Button onClick={() => {
                  onOpenChange(false);
                  onUpgradeRequired?.();
                }}>
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to Pro
                </Button>
              </motion.div>
            ) : importedSlides.length === 0 ? (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={handleUploadClick}
                  className={`
                    relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
                    transition-all duration-200
                    ${isDragging 
                      ? 'border-primary bg-primary/10 scale-[1.02]' 
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }
                    ${isProcessing ? 'pointer-events-none opacity-60' : ''}
                  `}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.pptx,.ppt,.png,.jpg,.jpeg,.gif,.webp"
                    onChange={handleFileSelect}
                    className="hidden"
                    multiple
                  />

                  {isProcessing ? (
                    <div className="space-y-4">
                      <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
                      <p className="text-muted-foreground">{progressMessage || 'Processing...'}</p>
                      <Progress value={progress} className="w-48 mx-auto" />
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                          <FileText className="w-6 h-6 text-red-500" />
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                          <Presentation className="w-6 h-6 text-orange-500" />
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                          <FileImage className="w-6 h-6 text-blue-500" />
                        </div>
                      </div>
                      <p className="font-medium text-foreground mb-1">
                        {isDragging ? 'Drop your file here' : 'Drag & drop or click to upload'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Supports PDF, PPTX, PNG, JPG (max 20MB)
                      </p>
                    </>
                  )}
                </div>

                <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-start gap-3">
                    <FileImage className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">
                        Slides are imported as high-quality images
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Each slide from your presentation will be converted to an image, preserving 
                        the exact design, colors, fonts, and layout. Perfect for mixing existing 
                        presentations with interactive slides.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-3 gap-3 max-h-[400px] overflow-y-auto p-1">
                  {importedSlides.map((slide, index) => (
                    <motion.button
                      key={`slide-${slide.pageNumber}-${index}`}
                      onClick={() => toggleSlideSelection(index)}
                      className={`
                        relative aspect-video rounded-lg border-2 overflow-hidden
                        transition-all duration-200
                        ${selectedSlides.has(index) 
                          ? 'border-primary ring-2 ring-primary/30' 
                          : 'border-border hover:border-muted-foreground'
                        }
                      `}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <img
                        src={slide.imageUrl}
                        alt={slide.title || `Slide ${slide.pageNumber}`}
                        className="w-full h-full object-contain bg-white"
                      />

                      <div className={`
                        absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center
                        transition-all
                        ${selectedSlides.has(index) 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-background/80 text-muted-foreground border'
                        }
                      `}>
                        {selectedSlides.has(index) ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <span className="text-[10px]">{index + 1}</span>
                        )}
                      </div>

                      <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px]">
                        {slide.pageNumber}
                      </div>
                    </motion.button>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    {selectedSlides.size} of {importedSlides.length} slides selected
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={resetState}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                    <Button
                      variant="hero"
                      onClick={handleImport}
                      disabled={selectedSlides.size === 0}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Import {selectedSlides.size} Slide{selectedSlides.size !== 1 ? 's' : ''}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
