import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, CheckCircle, BarChart3, MessageSquare, Cloud, HelpCircle, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";

const LOADING_STEPS = [
  { text: "Analyzing your topic...", icon: Sparkles },
  { text: "Designing slide structure...", icon: BarChart3 },
  { text: "Creating quiz questions...", icon: HelpCircle },
  { text: "Adding interactive polls...", icon: MessageSquare },
  { text: "Generating word clouds...", icon: Cloud },
  { text: "Polishing the content...", icon: Scale },
];

interface GeneratedSlide {
  type: string;
  title: string;
  icon: React.ReactNode;
}

const MOCK_SLIDES: GeneratedSlide[] = [
  { type: "Title", title: "Introduction to AI Startups", icon: <Sparkles className="w-4 h-4" /> },
  { type: "Quiz", title: "Test Your Knowledge", icon: <HelpCircle className="w-4 h-4" /> },
  { type: "Poll", title: "What interests you most?", icon: <MessageSquare className="w-4 h-4" /> },
  { type: "Word Cloud", title: "Share your thoughts", icon: <Cloud className="w-4 h-4" /> },
  { type: "Content", title: "Key Takeaways", icon: <BarChart3 className="w-4 h-4" /> },
];

interface AIGenerationPreviewProps {
  prompt: string;
  isGenerating: boolean;
  onComplete: () => void;
  onReset: () => void;
}

export default function AIGenerationPreview({ 
  prompt, 
  isGenerating, 
  onComplete, 
  onReset 
}: AIGenerationPreviewProps) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showSlides, setShowSlides] = useState(false);
  const [visibleSlides, setVisibleSlides] = useState(0);

  useEffect(() => {
    if (!isGenerating) {
      setCurrentStep(0);
      setProgress(0);
      setShowSlides(false);
      setVisibleSlides(0);
      return;
    }

    // Progress animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setShowSlides(true);
          return 100;
        }
        return prev + 2;
      });
    }, 60);

    // Step animation
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= LOADING_STEPS.length - 1) {
          clearInterval(stepInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 500);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
    };
  }, [isGenerating]);

  // Slide reveal animation
  useEffect(() => {
    if (!showSlides) return;

    const slideInterval = setInterval(() => {
      setVisibleSlides((prev) => {
        if (prev >= MOCK_SLIDES.length) {
          clearInterval(slideInterval);
          setTimeout(onComplete, 500);
          return prev;
        }
        return prev + 1;
      });
    }, 200);

    return () => clearInterval(slideInterval);
  }, [showSlides, onComplete]);

  if (!isGenerating && !showSlides) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -40 }}
      className="py-20 px-4"
    >
      <div className="container mx-auto max-w-4xl">
        <div className="bg-card rounded-3xl shadow-xl border border-border/50 p-8 md:p-12">
          {/* Topic */}
          <div className="text-center mb-8">
            <p className="text-sm text-muted-foreground mb-2">Creating presentation for:</p>
            <p className="text-lg font-medium text-foreground">"{prompt}"</p>
          </div>

          <AnimatePresence mode="wait">
            {!showSlides ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-8"
              >
                {/* Current step */}
                <div className="flex items-center justify-center gap-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className="w-6 h-6 text-primary" />
                  </motion.div>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentStep}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center gap-2"
                    >
                      {LOADING_STEPS[currentStep] && (() => {
                        const StepIcon = LOADING_STEPS[currentStep].icon;
                        return (
                          <>
                            <StepIcon className="w-5 h-5 text-primary" />
                            <span className="text-foreground font-medium">
                              {LOADING_STEPS[currentStep].text}
                            </span>
                          </>
                        );
                      })()}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>

                {/* Mini slide previews appearing */}
                <div className="flex justify-center gap-2">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0.2, scale: 0.8 }}
                      animate={{ 
                        opacity: progress > (i + 1) * 18 ? 1 : 0.2,
                        scale: progress > (i + 1) * 18 ? 1 : 0.8
                      }}
                      className="w-12 h-8 rounded bg-muted border border-border"
                    />
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="complete"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                {/* Success header */}
                <div className="flex items-center justify-center gap-3 mb-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                  >
                    <CheckCircle className="w-8 h-8 text-success" />
                  </motion.div>
                  <span className="text-xl font-semibold text-foreground">
                    Created in seconds!
                  </span>
                </div>

                {/* Generated slides */}
                <div className="space-y-3">
                  {MOCK_SLIDES.map((slide, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ 
                        opacity: index < visibleSlides ? 1 : 0,
                        x: index < visibleSlides ? 0 : -20
                      }}
                      transition={{ duration: 0.3 }}
                      className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border/50"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        {slide.icon}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">{slide.type}</p>
                        <p className="font-medium text-foreground">{slide.title}</p>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-success" />
                    </motion.div>
                  ))}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 pt-4">
                  <div className="text-center p-4 rounded-xl bg-muted/30">
                    <div className="text-2xl font-bold text-foreground">5</div>
                    <div className="text-sm text-muted-foreground">Slides</div>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-muted/30">
                    <div className="text-2xl font-bold text-foreground">3</div>
                    <div className="text-sm text-muted-foreground">Interactive</div>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-muted/30">
                    <div className="text-2xl font-bold text-foreground">2.3s</div>
                    <div className="text-sm text-muted-foreground">Generated</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-center pt-4">
                  <Button variant="outline" onClick={onReset}>
                    Start Over
                  </Button>
                  <Button 
                    variant="hero"
                    onClick={() => {
                      localStorage.setItem("clasly_ai_prompt", prompt);
                      navigate("/dashboard");
                    }}
                  >
                    <Sparkles className="w-4 h-4" />
                    Continue Editing
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.section>
  );
}
