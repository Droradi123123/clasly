import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SlidePreview {
  id: number;
  type: "quiz" | "poll" | "wordcloud" | "title";
  title: string;
  content: React.ReactNode;
}

const PREVIEW_SLIDES: SlidePreview[] = [
  {
    id: 1,
    type: "title",
    title: "Welcome to AI Startups",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Introduction to AI Startups
        </h2>
        <p className="text-lg text-white/70 max-w-md">
          Understanding the landscape of artificial intelligence in the startup ecosystem
        </p>
      </div>
    ),
  },
  {
    id: 2,
    type: "quiz",
    title: "Quick Quiz",
    content: (
      <div className="flex flex-col h-full p-6">
        <h3 className="text-xl font-bold text-white mb-6 text-center">
          What percentage of AI startups fail in the first 5 years?
        </h3>
        <div className="space-y-3 flex-1 flex flex-col justify-center">
          {["A) 40%", "B) 60%", "C) 75%", "D) 90%"].map((option, i) => (
            <motion.div
              key={option}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                i === 2 
                  ? "border-green-400 bg-green-500/20" 
                  : "border-white/20 bg-white/5 hover:border-white/40"
              }`}
            >
              <span className="text-white font-medium">{option}</span>
            </motion.div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 3,
    type: "poll",
    title: "Live Poll",
    content: (
      <div className="flex flex-col h-full p-6">
        <h3 className="text-xl font-bold text-white mb-6 text-center">
          Which AI sector interests you most?
        </h3>
        <div className="space-y-4 flex-1">
          {[
            { label: "Healthcare AI", votes: 45 },
            { label: "Finance AI", votes: 30 },
            { label: "Creative AI", votes: 65 },
            { label: "Autonomous Vehicles", votes: 25 },
          ].map((item, i) => (
            <div key={item.label} className="space-y-1">
              <div className="flex justify-between text-white text-sm">
                <span>{item.label}</span>
                <span>{item.votes}%</span>
              </div>
              <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${item.votes}%` }}
                  transition={{ delay: 0.5 + i * 0.2, duration: 0.8, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                />
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-white/50 text-sm mt-4">127 responses</p>
      </div>
    ),
  },
  {
    id: 4,
    type: "wordcloud",
    title: "Word Cloud",
    content: (
      <div className="flex flex-col h-full p-6">
        <h3 className="text-xl font-bold text-white mb-6 text-center">
          What word comes to mind?
        </h3>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-wrap gap-3 justify-center items-center max-w-sm">
            {[
              { text: "Innovation", size: "text-3xl" },
              { text: "Future", size: "text-2xl" },
              { text: "Data", size: "text-xl" },
              { text: "Machine Learning", size: "text-lg" },
              { text: "Automation", size: "text-2xl" },
              { text: "Disruption", size: "text-lg" },
              { text: "Scale", size: "text-xl" },
              { text: "Growth", size: "text-lg" },
            ].map((word, i) => (
              <motion.span
                key={word.text}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.15 }}
                className={`${word.size} font-bold text-white/90 hover:text-primary transition-colors cursor-default`}
              >
                {word.text}
              </motion.span>
            ))}
          </div>
        </div>
      </div>
    ),
  },
];

export default function LivePreviewSection() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % PREVIEW_SLIDES.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setIsPlaying(false);
  };

  return (
    <section className="py-20 px-4 bg-muted/30">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4"
          >
            See It in Action
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground max-w-2xl mx-auto"
          >
            This is exactly how your presentation will look and feel during a live session.
            Real slides, real interactions, real engagement.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative"
        >
          {/* Device frame */}
          <div className="bg-card rounded-3xl shadow-2xl border border-border overflow-hidden">
            {/* Browser bar */}
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-destructive/50" />
                <div className="w-3 h-3 rounded-full bg-accent/50" />
                <div className="w-3 h-3 rounded-full bg-success/50" />
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-background rounded-lg px-4 py-1.5 text-sm text-muted-foreground text-center">
                  clasly.app/present/demo
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Slide content */}
            <div className="relative aspect-video bg-gradient-to-br from-primary/90 via-primary to-primary/80">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.4 }}
                  className="absolute inset-0"
                >
                  {PREVIEW_SLIDES[currentSlide].content}
                </motion.div>
              </AnimatePresence>

              {/* Navigation arrows */}
              <button
                onClick={() => goToSlide((currentSlide - 1 + PREVIEW_SLIDES.length) % PREVIEW_SLIDES.length)}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => goToSlide((currentSlide + 1) % PREVIEW_SLIDES.length)}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Slide indicator */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {PREVIEW_SLIDES.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentSlide 
                        ? "bg-white w-6" 
                        : "bg-white/40 hover:bg-white/60"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Slide thumbnails */}
          <div className="flex justify-center gap-3 mt-6">
            {PREVIEW_SLIDES.map((slide, index) => (
              <button
                key={slide.id}
                onClick={() => goToSlide(index)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  index === currentSlide
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {slide.type.charAt(0).toUpperCase() + slide.type.slice(1)}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
