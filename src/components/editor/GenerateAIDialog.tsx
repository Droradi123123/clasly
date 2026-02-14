import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, AlertCircle, X, ImageIcon, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Slide, SlideContent } from "@/types/slides";
import { supabase } from "@/integrations/supabase/client";
import { getEdgeFunctionErrorMessage } from "@/lib/supabaseFunctions";

interface GenerateAIDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slide: Slide;
  onContentGenerated: (content: SlideContent) => void;
}

const STYLES = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual & Friendly" },
  { value: "academic", label: "Academic" },
  { value: "creative", label: "Creative & Fun" },
];

const DIFFICULTY_LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "medium", label: "Medium" },
  { value: "advanced", label: "Advanced" },
];

const IMAGE_STYLES = [
  { value: "modern and vibrant", label: "Modern & Vibrant" },
  { value: "minimalist and clean", label: "Minimalist" },
  { value: "illustration style", label: "Illustration" },
  { value: "photorealistic", label: "Photorealistic" },
  { value: "abstract and artistic", label: "Abstract" },
];

const LOADING_MESSAGES = [
  "Crafting your content...",
  "Adding some magic...",
  "Almost there...",
];

const IMAGE_LOADING_MESSAGES = [
  "Generating your image...",
  "Creating visual magic...",
  "Painting with AI...",
];

// Slide types that support images
const SLIDES_WITH_IMAGE_SUPPORT = [
  'title', 'split_content', 'content', 'image', 
  'poll', 'wordcloud', 'quiz', 'scale', 'yesno', 
  'ranking', 'guess_number', 'sentiment_meter'
];

export default function GenerateAIDialog({
  open,
  onOpenChange,
  slide,
  onContentGenerated,
}: GenerateAIDialogProps) {
  const [activeTab, setActiveTab] = useState<"content" | "image">("content");
  const [prompt, setPrompt] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [style, setStyle] = useState("professional");
  const [imageStyle, setImageStyle] = useState("modern and vibrant");
  const [difficulty, setDifficulty] = useState("medium");
  const [includeImage, setIncludeImage] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  const getSlideTypeLabel = () => {
    const labels: Record<string, string> = {
      quiz: "Quiz Question",
      poll: "Poll Question",
      yesno: "Yes/No Question",
      wordcloud: "Word Cloud Prompt",
      scale: "Scale Question",
      guess_number: "Guess the Number",
      ranking: "Ranking Question",
      sentiment_meter: "Sentiment Meter",
      title: "Title Slide",
      content: "Content Slide",
      image: "Image Slide",
      split_content: "Split Content Slide",
      timeline: "Timeline Slide",
      bullet_points: "Bullet Points Slide",
      bar_chart: "Bar Chart Slide",
    };
    return labels[slide.type] || "Slide Content";
  };

  // Check if this slide type can have a dedicated image tab
  const canGenerateStandaloneImage = slide.type === "image" || slide.type === "title" || slide.type === "content";
  
  // Check if this slide type supports an embedded/background image
  const supportsImage = SLIDES_WITH_IMAGE_SUPPORT.includes(slide.type);

  const handleGenerateContent = async () => {
    if (!prompt.trim()) {
      toast.error("Please describe what content you want");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setLoadingMessageIndex(0);

    const messageInterval = setInterval(() => {
      setLoadingMessageIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 1200);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      if (sessionError || !session) {
        throw new Error("Please sign in to generate content");
      }

      const { data, error: fnError } = await supabase.functions.invoke("generate-slides", {
        body: {
          singleSlide: {
            type: slide.type,
            prompt,
            style,
            includeImage: supportsImage && includeImage,
          },
        },
      });

      clearInterval(messageInterval);

      if (fnError) {
        const msg = await getEdgeFunctionErrorMessage(fnError, "Failed to generate content.");
        throw new Error(msg);
      }
      const resData = data as { error?: string; slides?: any[] };
      if (resData?.error) throw new Error(resData.error);
      if (!resData?.slides?.length || !resData.slides[0]) {
        throw new Error("Invalid response from AI");
      }

      const generatedSlide = resData.slides[0];
      const generatedContent = generatedSlide.content;
      const generatedDesign = generatedSlide.design;

      // Merge the generated content with any existing content
      const mergedContent = {
        ...slide.content,
        ...generatedContent,
      };

      // If image was generated and included in design, we need to pass that separately
      // The caller (Editor) should handle updating the design if needed
      if (generatedDesign?.overlayImageUrl) {
        // For slides with background images, include the overlay info
        (mergedContent as any)._generatedDesign = {
          overlayImageUrl: generatedDesign.overlayImageUrl,
          overlayImagePosition: generatedDesign.overlayImagePosition || 'background',
        };
      }

      // For split_content, the imageUrl is in the content
      if (generatedContent.imageUrl && slide.type === 'split_content') {
        mergedContent.imageUrl = generatedContent.imageUrl;
      }

      toast.success("Content generated successfully!");
      onContentGenerated(mergedContent);
      onOpenChange(false);
      setPrompt("");
      
    } catch (err) {
      clearInterval(messageInterval);
      const errorMessage = err instanceof Error ? err.message : "Failed to generate content";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) {
      toast.error("Please describe the image you want");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setLoadingMessageIndex(0);

    const messageInterval = setInterval(() => {
      setLoadingMessageIndex(prev => (prev + 1) % IMAGE_LOADING_MESSAGES.length);
    }, 1500);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      if (sessionError || !session) {
        throw new Error("Please sign in to generate images");
      }

      const { data, error: fnError } = await supabase.functions.invoke("generate-image", {
        body: { prompt: imagePrompt, style: imageStyle },
      });

      clearInterval(messageInterval);

      if (fnError) {
        const msg = await getEdgeFunctionErrorMessage(fnError, "Failed to generate image.");
        throw new Error(msg);
      }
      const resData = data as { error?: string; imageUrl?: string };
      if (resData?.error) throw new Error(resData.error);
      if (!resData?.imageUrl) throw new Error("No image returned from AI");

      const updatedContent = {
        ...slide.content,
        imageUrl: resData.imageUrl,
      };

      toast.success("Image generated successfully!");
      onContentGenerated(updatedContent as SlideContent);
      onOpenChange(false);
      setImagePrompt("");
      
    } catch (err) {
      clearInterval(messageInterval);
      const errorMessage = err instanceof Error ? err.message : "Failed to generate image";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Generate for {getSlideTypeLabel()}
          </DialogTitle>
          <DialogDescription>
            Let AI create amazing content for your slide
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {isGenerating ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 text-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="inline-block mb-4"
              >
                {activeTab === "image" ? (
                  <ImageIcon className="w-10 h-10 text-primary" />
                ) : (
                  <Sparkles className="w-10 h-10 text-primary" />
                )}
              </motion.div>
              <AnimatePresence mode="wait">
                <motion.p
                  key={loadingMessageIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-foreground font-medium"
                >
                  {activeTab === "image" 
                    ? IMAGE_LOADING_MESSAGES[loadingMessageIndex]
                    : includeImage 
                      ? "Generating content & image..."
                      : LOADING_MESSAGES[loadingMessageIndex]}
                </motion.p>
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                  <button onClick={() => setError(null)} className="ml-auto">
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}

              {canGenerateStandaloneImage ? (
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "content" | "image")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="content" className="gap-2">
                      <Type className="w-4 h-4" />
                      Content
                    </TabsTrigger>
                    <TabsTrigger value="image" className="gap-2">
                      <ImageIcon className="w-4 h-4" />
                      Image
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="content" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="prompt">Describe the content</Label>
                      <Textarea
                        id="prompt"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder={`e.g., "Benefits of renewable energy" or "Quiz about world capitals"`}
                        className="min-h-[80px] resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Style</Label>
                        <Select value={style} onValueChange={setStyle}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STYLES.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Difficulty</Label>
                        <Select value={difficulty} onValueChange={setDifficulty}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DIFFICULTY_LEVELS.map((level) => (
                              <SelectItem key={level.value} value={level.value}>
                                {level.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {supportsImage && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-muted-foreground" />
                          <Label htmlFor="include-image" className="text-sm cursor-pointer">
                            Generate with image
                          </Label>
                        </div>
                        <Switch 
                          id="include-image" 
                          checked={includeImage} 
                          onCheckedChange={setIncludeImage} 
                        />
                      </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                      <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                      </Button>
                      <Button
                        variant="hero"
                        onClick={handleGenerateContent}
                        disabled={!prompt.trim()}
                      >
                        <Sparkles className="w-4 h-4" />
                        Generate Content
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="image" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="imagePrompt">Describe your image</Label>
                      <Textarea
                        id="imagePrompt"
                        value={imagePrompt}
                        onChange={(e) => setImagePrompt(e.target.value)}
                        placeholder={`e.g., "A futuristic city skyline at sunset" or "Abstract geometric patterns in blue and gold"`}
                        className="min-h-[80px] resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Image Style</Label>
                      <Select value={imageStyle} onValueChange={setImageStyle}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {IMAGE_STYLES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                      </Button>
                      <Button
                        variant="hero"
                        onClick={handleGenerateImage}
                        disabled={!imagePrompt.trim()}
                      >
                        <ImageIcon className="w-4 h-4" />
                        Generate Image
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              ) : (
                /* Non-image slides - show content form with optional image toggle */
                <>
                  <div className="space-y-2">
                    <Label htmlFor="prompt">What should this {getSlideTypeLabel()} be about?</Label>
                    <Textarea
                      id="prompt"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={`e.g., "Benefits of renewable energy" or "Basic math concepts for students"`}
                      className="min-h-[80px] resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Style</Label>
                      <Select value={style} onValueChange={setStyle}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STYLES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Difficulty</Label>
                      <Select value={difficulty} onValueChange={setDifficulty}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DIFFICULTY_LEVELS.map((level) => (
                            <SelectItem key={level.value} value={level.value}>
                              {level.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {supportsImage && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-muted-foreground" />
                        <Label htmlFor="include-image-2" className="text-sm cursor-pointer">
                          Generate with background image
                        </Label>
                      </div>
                      <Switch 
                        id="include-image-2" 
                        checked={includeImage} 
                        onCheckedChange={setIncludeImage} 
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="hero"
                      onClick={handleGenerateContent}
                      disabled={!prompt.trim()}
                    >
                      <Sparkles className="w-4 h-4" />
                      Generate Content
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
