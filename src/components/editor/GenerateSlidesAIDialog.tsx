import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, AlertCircle, X, Palette, Image, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { toast } from "sonner";
import { Slide, createNewSlide } from "@/types/slides";
import { GeneratedTheme } from "@/types/generatedTheme";
import { supabase } from "@/integrations/supabase/client";
import { getEdgeFunctionErrorMessage } from "@/lib/supabaseFunctions";
import { useSubscriptionContext } from "@/contexts/SubscriptionContext";

interface GenerateSlidesAIDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSlidesGenerated: (slides: Slide[], theme?: GeneratedTheme) => void;
  initialPrompt?: string;
}

const TARGET_AUDIENCES = [
  { value: "middle_school", label: "Middle School Students" },
  { value: "high_school", label: "High School Students" },
  { value: "university", label: "University Students" },
  { value: "professionals", label: "Professionals" },
  { value: "general", label: "General Audience" },
];

const DIFFICULTY_LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const LOADING_STAGES = [
  { text: "Analyzing your topic...", icon: Wand2 },
  { text: "Designing custom theme...", icon: Palette },
  { text: "Creating slide structure...", icon: Sparkles },
  { text: "Writing engaging content...", icon: Sparkles },
  { text: "Adding interactive elements...", icon: Sparkles },
  { text: "Preparing image prompts...", icon: Image },
  { text: "Polishing the presentation...", icon: Sparkles },
  { text: "Almost ready...", icon: Sparkles },
];

export default function GenerateSlidesAIDialog({
  open,
  onOpenChange,
  onSlidesGenerated,
  initialPrompt = "",
}: GenerateSlidesAIDialogProps) {
  const [description, setDescription] = useState(initialPrompt);
  const [contentType, setContentType] = useState<"interactive" | "with_content">("interactive");
  const [targetAudience, setTargetAudience] = useState("general");
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStageIndex, setLoadingStageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [generatedThemeName, setGeneratedThemeName] = useState<string | null>(null);
  
  // Get subscription info for slide limits
  const { isFree, maxSlides } = useSubscriptionContext();
  const planSlideLimit = isFree ? (maxSlides ?? 5) : 8;

  // Update description when initialPrompt changes
  useEffect(() => {
    if (initialPrompt) {
      setDescription(initialPrompt);
    }
  }, [initialPrompt]);

  // Cycle through loading stages
  useEffect(() => {
    if (isGenerating) {
      const interval = setInterval(() => {
        setLoadingStageIndex((prev) => (prev + 1) % LOADING_STAGES.length);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isGenerating]);

  // Parse expected slide count from description, respecting plan limits
  const getExpectedSlideCount = () => {
    const patterns = [/(\d+)\s*slides?/i, /create\s*(\d+)/i, /make\s*(\d+)/i, /generate\s*(\d+)/i];
    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match) {
        const count = parseInt(match[1], 10);
        if (count >= 3 && count <= 20) {
          // Respect plan limit
          return Math.min(count, planSlideLimit);
        }
      }
    }
    return planSlideLimit; // default to plan limit
  };

  const handleGenerate = async () => {
    if (!description.trim()) {
      toast.error("Please describe your presentation topic");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setLoadingStageIndex(0);
    setGeneratedThemeName(null);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      if (sessionError || !session) {
        throw new Error("Please sign in to generate presentations");
      }

      const { data, error: fnError } = await supabase.functions.invoke("generate-slides", {
        body: {
          description,
          contentType,
          targetAudience,
          difficulty,
          slideCount: expectedCount,
        },
      });

      if (fnError) {
        const msg = await getEdgeFunctionErrorMessage(fnError, "Failed to generate slides.");
        throw new Error(msg);
      }
      const resData = data as { error?: string; slides?: unknown[]; theme?: unknown };
      if (resData?.error) throw new Error(resData.error);
      if (!resData?.slides?.length) throw new Error("No slides returned");

      const generatedTheme: GeneratedTheme | undefined = resData.theme as GeneratedTheme | undefined;
      if (generatedTheme) {
        setGeneratedThemeName(generatedTheme.themeName);
      }

      const slides: Slide[] = (resData.slides as any[]).map((aiSlide: any, index: number) => {
        const baseSlide = createNewSlide(aiSlide.type, index);
        
        // Apply generated theme styling if available
        const design = { ...baseSlide.design };
        if (generatedTheme) {
          design.backgroundColor = generatedTheme.gradient;
          design.textColor = `hsl(${generatedTheme.colors.textPrimary})`;
        }
        
        return {
          ...baseSlide,
          content: {
            ...aiSlide.content,
            imagePrompt: aiSlide.imagePrompt, // Store image prompt for later generation
          },
          design,
        };
      });

      toast.success(
        generatedTheme 
          ? `Created "${generatedTheme.themeName}" presentation with ${slides.length} slides!`
          : `Generated ${slides.length} slides successfully!`
      );
      
      onSlidesGenerated(slides, generatedTheme);
      onOpenChange(false);
      
      // Clear localStorage prompt after successful generation
      localStorage.removeItem("clasly_ai_prompt");
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate slides";
      setError(errorMessage);
      const isSessionError = /sign out|session invalid|invalid jwt/i.test(errorMessage);
      if (isSessionError) {
        toast.error("נא להתנתק ולהתחבר מחדש", {
          action: {
            label: "התנתק והתחבר",
            onClick: () => supabase.auth.signOut(),
          },
        });
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const expectedCount = getExpectedSlideCount();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-5 h-5 text-primary" />
            Generate Presentation with AI
          </DialogTitle>
          <DialogDescription>
            Describe your topic and let AI create a complete, engaging presentation for you.
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
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="inline-block mb-6"
              >
                {(() => {
                  const CurrentIcon = LOADING_STAGES[loadingStageIndex].icon;
                  return <CurrentIcon className="w-12 h-12 text-primary" />;
                })()}
              </motion.div>
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={loadingStageIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-2"
                >
                  <p className="text-lg font-medium text-foreground">
                    {LOADING_STAGES[loadingStageIndex].text}
                  </p>
                  {generatedThemeName && (
                    <p className="text-sm text-primary flex items-center justify-center gap-2">
                      <Palette className="w-4 h-4" />
                      Theme: {generatedThemeName}
                    </p>
                  )}
                </motion.div>
              </AnimatePresence>
              
              <p className="text-sm text-muted-foreground mt-4">
                Creating your {expectedCount} slides...
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6 py-4"
            >
              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive"
                >
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                  <button onClick={() => setError(null)} className="ml-auto">
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Describe Your Presentation</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is your presentation about? Include main topics, key points, learning objectives, or any specific requirements..."
                  className="min-h-[120px] resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  The more detail you provide, the better the results will be.
                </p>
              </div>

              {/* AI Theme Info */}
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <Palette className="w-4 h-4 text-primary" />
                <span className="text-sm text-foreground">
                  AI will create a custom visual theme based on your topic
                </span>
              </div>

              {/* Content Type */}
              <div className="space-y-3">
                <Label>Content Type</Label>
                <RadioGroup
                  value={contentType}
                  onValueChange={(value) => setContentType(value as "interactive" | "with_content")}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                  <Label
                    htmlFor="interactive"
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      contentType === "interactive"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <RadioGroupItem value="interactive" id="interactive" className="mt-1" />
                    <div>
                      <div className="font-medium">Interactive Only</div>
                      <div className="text-sm text-muted-foreground">
                        Quizzes, polls, word clouds & more
                      </div>
                    </div>
                  </Label>
                  <Label
                    htmlFor="with_content"
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      contentType === "with_content"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <RadioGroupItem value="with_content" id="with_content" className="mt-1" />
                    <div>
                      <div className="font-medium">Content + Interactive</div>
                      <div className="text-sm text-muted-foreground">
                        Educational content with interactions
                      </div>
                    </div>
                  </Label>
                </RadioGroup>
                <p className="text-xs text-muted-foreground">
                  💡 Tip: {isFree 
                    ? `Free plan allows up to ${planSlideLimit} slides. Upgrade for more!` 
                    : `Specify slide count in your prompt (e.g., "create 5 slides about..."). Default is ${planSlideLimit} slides.`}
                </p>
              </div>

              {/* Target Audience & Difficulty */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Target Audience</Label>
                  <Select value={targetAudience} onValueChange={setTargetAudience}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TARGET_AUDIENCES.map((audience) => (
                        <SelectItem key={audience.value} value={audience.value}>
                          {audience.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Difficulty Level</Label>
                  <Select value={difficulty} onValueChange={(v) => setDifficulty(v as any)}>
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

              {/* Generate Button */}
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  variant="hero"
                  onClick={handleGenerate}
                  disabled={!description.trim()}
                  className="px-8"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate {expectedCount} Slides
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
