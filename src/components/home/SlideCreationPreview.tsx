import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, CheckCircle, BarChart3, MessageSquare, Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const EXAMPLE_TOPICS = [
  "Introduction to Climate Change for Middle School Students",
  "Team Building Workshop for Corporate Training",
  "History of the Renaissance for High School",
  "Introduction to Machine Learning for Beginners",
];

const LOADING_TEXTS = [
  "Analyzing your topic...",
  "Crafting engaging questions...",
  "Writing quiz options...",
  "Creating interactive polls...",
  "Designing word cloud prompts...",
  "Adding discussion points...",
  "Polishing the content...",
];

interface SlideCreationPreviewProps {
  onComplete?: (topic: string) => void;
}

export default function SlideCreationPreview({ onComplete }: SlideCreationPreviewProps) {
  const [step, setStep] = useState<"input" | "loading" | "complete">("input");
  const [topic, setTopic] = useState("");
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (step === "loading") {
      const textInterval = setInterval(() => {
        setLoadingTextIndex((prev) => (prev + 1) % LOADING_TEXTS.length);
      }, 800);

      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            clearInterval(textInterval);
            setStep("complete");
            return 100;
          }
          return prev + 3;
        });
      }, 100);

      return () => {
        clearInterval(textInterval);
        clearInterval(progressInterval);
      };
    }
  }, [step]);

  const handleTryExample = () => {
    const randomExample = EXAMPLE_TOPICS[Math.floor(Math.random() * EXAMPLE_TOPICS.length)];
    setTopic(randomExample);
  };

  const handleGenerate = () => {
    if (topic.trim()) {
      setStep("loading");
      setProgress(0);
    }
  };

  const handleReset = () => {
    setStep("input");
    setTopic("");
    setProgress(0);
    setLoadingTextIndex(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      viewport={{ once: true }}
      className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-lg"
    >
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-3">
          <Sparkles className="w-4 h-4" />
          Try it yourself
        </div>
        <h3 className="text-xl md:text-2xl font-display font-bold text-foreground mb-2">
          See How It Works
        </h3>
        <p className="text-muted-foreground text-sm">
          Enter a topic and watch AI create your presentation
        </p>
      </div>

      <AnimatePresence mode="wait">
        {step === "input" && (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter your topic (e.g., 'Introduction to Renewable Energy')..."
                className="h-12 text-base"
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              />
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleTryExample}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✨ Try an Example
                </Button>
                <Button
                  variant="hero"
                  onClick={handleGenerate}
                  disabled={!topic.trim()}
                  className="px-6"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {step === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6 py-4"
          >
            <div className="flex items-center justify-center gap-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="w-6 h-6 text-primary" />
              </motion.div>
              <AnimatePresence mode="wait">
                <motion.span
                  key={loadingTextIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-foreground font-medium"
                >
                  {LOADING_TEXTS[loadingTextIndex]}
                </motion.span>
              </AnimatePresence>
            </div>

            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-primary/70"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>

            <p className="text-center text-sm text-muted-foreground">
              Creating presentation for: <span className="text-foreground font-medium">"{topic}"</span>
            </p>
          </motion.div>
        )}

        {step === "complete" && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6 py-4"
          >
            <div className="flex items-center justify-center gap-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
              >
                <CheckCircle className="w-8 h-8 text-green-500" />
              </motion.div>
              <span className="text-xl font-semibold text-foreground">Ready!</span>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-muted/50 rounded-xl p-4 text-center"
              >
                <BarChart3 className="w-6 h-6 mx-auto mb-2 text-indigo-500" />
                <div className="text-2xl font-bold text-foreground">3</div>
                <div className="text-xs text-muted-foreground">Quizzes</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-muted/50 rounded-xl p-4 text-center"
              >
                <MessageSquare className="w-6 h-6 mx-auto mb-2 text-rose-500" />
                <div className="text-2xl font-bold text-foreground">2</div>
                <div className="text-xs text-muted-foreground">Polls</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-muted/50 rounded-xl p-4 text-center"
              >
                <Cloud className="w-6 h-6 mx-auto mb-2 text-cyan-500" />
                <div className="text-2xl font-bold text-foreground">1</div>
                <div className="text-xs text-muted-foreground">Word Cloud</div>
              </motion.div>
            </div>

            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={handleReset}>
                Try Again
              </Button>
              <Button
                variant="hero"
                onClick={() => onComplete?.(topic)}
              >
                Start Creating
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
