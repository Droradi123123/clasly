import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  DEMO_SLIDES,
  DEMO_STUDENTS,
  INITIAL_POLL_RESULTS,
  LaptopScreen,
  PhoneScreen,
  DemoStudent,
  PollResult,
  FloatingEmoji,
} from "./demo";

export default function InteractiveSyncDemo() {
  // Slide state
  const [currentSlide, setCurrentSlide] = useState(0);
  const [phoneSlide, setPhoneSlide] = useState(0);
  
  // Results state
  const [pollResults, setPollResults] = useState<PollResult[]>(INITIAL_POLL_RESULTS);
  const [quizResults, setQuizResults] = useState<number[]>([3, 12, 2, 1]);
  const [wordCloudWords, setWordCloudWords] = useState(DEMO_SLIDES[3].words || []);
  const [rankingOrder, setRankingOrder] = useState<string[]>(DEMO_SLIDES[4].options || []);
  const [scaleAverage, setScaleAverage] = useState(6.8);
  const [scaleValue, setScaleValue] = useState<number | null>(null);
  
  // User interaction state
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [students, setStudents] = useState<DemoStudent[]>(DEMO_STUDENTS);
  const [userPoints, setUserPoints] = useState(320);
  const [userEmoji] = useState("🦄");
  
  // Animation state
  const [syncPulse, setSyncPulse] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showMiniConfetti, setShowMiniConfetti] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);

  const slide = DEMO_SLIDES[currentSlide];
  const phoneSlideData = DEMO_SLIDES[phoneSlide];

  const handleVote = useCallback((index: number) => {
    setSelectedOption(index);
    setSyncPulse(true);
    setShowMiniConfetti(true);
    setTimeout(() => setShowMiniConfetti(false), 1500);

    const currentSlideData = DEMO_SLIDES[phoneSlide];
    
    if (currentSlideData.type === "quiz") {
      const correct = index === currentSlideData.correctIndex;
      setIsCorrect(correct);
      
      // Update quiz results on laptop
      setQuizResults((prev) => {
        const newResults = [...prev];
        newResults[index] = (newResults[index] || 0) + 1;
        return newResults;
      });
      
      if (correct) {
        setUserPoints((prev) => prev + 100);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2500);
        
        setStudents((prev) => {
          const updated = [...prev];
          const userIndex = updated.findIndex((s) => s.name === "You");
          if (userIndex >= 0) {
            updated[userIndex].points += 100;
          }
          return updated.sort((a, b) => b.points - a.points);
        });
      }
    } else if (currentSlideData.type === "poll") {
      setPollResults((prev) =>
        prev.map((opt, i) =>
          i === index ? { ...opt, votes: opt.votes + 1 } : opt
        )
      );
    }

    setTimeout(() => setSyncPulse(false), 600);
  }, [phoneSlide]);

  const handleNavigate = useCallback((direction: "next" | "prev") => {
    const newSlide =
      direction === "next"
        ? (currentSlide + 1) % DEMO_SLIDES.length
        : (currentSlide - 1 + DEMO_SLIDES.length) % DEMO_SLIDES.length;

    setCurrentSlide(newSlide);
    setSyncPulse(true);
    
    // Reset selection state when navigating
    setSelectedOption(null);
    setIsCorrect(null);
    setScaleValue(null);

    setTimeout(() => {
      setPhoneSlide(newSlide);
      setSyncPulse(false);
    }, 150);
  }, [currentSlide]);

  const handleReaction = useCallback((emoji: string) => {
    const id = Date.now();
    const newEmoji: FloatingEmoji = {
      id,
      emoji,
      startX: 50,
      startY: 100,
    };

    setFloatingEmojis((prev) => [...prev, newEmoji]);
    setSyncPulse(true);

    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((e) => e.id !== id));
      setSyncPulse(false);
    }, 1500);
  }, []);

  const handleWordSubmit = useCallback((word: string) => {
    setSyncPulse(true);
    setShowMiniConfetti(true);
    setTimeout(() => setShowMiniConfetti(false), 1500);
    
    setWordCloudWords((prev) => {
      const existing = prev.find((w) => w.text.toLowerCase() === word.toLowerCase());
      if (existing) {
        return prev.map((w) =>
          w.text.toLowerCase() === word.toLowerCase()
            ? { ...w, count: w.count + 1 }
            : w
        );
      }
      return [...prev, { text: word, count: 1 }];
    });

    setTimeout(() => setSyncPulse(false), 600);
  }, []);

  const handleRankingChange = useCallback((newOrder: string[]) => {
    setRankingOrder(newOrder);
    setSyncPulse(true);
    setTimeout(() => setSyncPulse(false), 400);
  }, []);

  const handleScaleSubmit = useCallback((value: number) => {
    setScaleValue(value);
    setSyncPulse(true);
    setShowMiniConfetti(true);
    setTimeout(() => setShowMiniConfetti(false), 1500);
    
    // Update average
    setScaleAverage((prev) => (prev * 10 + value) / 11);
    
    setTimeout(() => setSyncPulse(false), 600);
  }, []);

  return (
    <section className="py-12 md:py-16 px-4 bg-muted/30 overflow-hidden">
      <div className="container mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="text-center mb-16 md:mb-20">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground mb-6"
          >
            See it in action
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground max-w-xl mx-auto text-base md:text-lg leading-relaxed"
          >
            Vote on your phone.<br />
            Watch results update instantly on the big screen.<br />
            <span className="text-foreground font-medium">Experience real-time interaction — live.</span>
          </motion.p>
        </div>

        {/* Interactive Demo - Side by Side */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16"
        >
          {/* Desktop/Laptop - Dominant */}
          <motion.div
            initial={{ x: -30, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="relative z-10"
          >
            <LaptopScreen
              slide={slide}
              slideIndex={currentSlide}
              totalSlides={DEMO_SLIDES.length}
              pollResults={pollResults}
              students={students}
              floatingEmojis={floatingEmojis}
              showConfetti={showConfetti}
              quizResults={quizResults}
              wordCloudWords={wordCloudWords}
              rankingOrder={rankingOrder}
              scaleAverage={scaleAverage}
              onNavigate={handleNavigate}
            />
            
            {/* Desktop hint */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="text-center text-sm text-muted-foreground mt-4"
            >
              ← Use arrows to navigate slides →
            </motion.p>
          </motion.div>

          {/* Sync Indicator - Simple and Clean */}
          <div className="hidden lg:flex flex-col items-center gap-2">
            <motion.div
              animate={{
                scale: syncPulse ? [1, 1.3, 1] : 1,
                opacity: syncPulse ? 1 : 0.5,
              }}
              transition={{ duration: 0.4 }}
              className="w-3 h-3 rounded-full bg-primary shadow-lg shadow-primary/50"
            />
            <div className="w-px h-16 bg-gradient-to-b from-primary/60 via-primary/30 to-transparent" />
            <span className="text-xs text-muted-foreground font-medium tracking-wide">SYNC</span>
          </div>

          {/* Mobile indicator for small screens */}
          <div className="lg:hidden flex items-center gap-3 text-muted-foreground">
            <div className="w-8 h-px bg-border" />
            <motion.div
              animate={{
                scale: syncPulse ? 1.3 : 1,
                opacity: syncPulse ? 1 : 0.5,
              }}
              className="w-2 h-2 rounded-full bg-primary"
            />
            <span className="text-xs font-medium">SYNCED</span>
            <motion.div
              animate={{
                scale: syncPulse ? 1.3 : 1,
                opacity: syncPulse ? 1 : 0.5,
              }}
              className="w-2 h-2 rounded-full bg-primary"
            />
            <div className="w-8 h-px bg-border" />
          </div>

          {/* Phone - Supporting */}
          <motion.div
            initial={{ x: 30, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="relative z-10"
          >
            <PhoneScreen
              slide={phoneSlideData}
              userEmoji={userEmoji}
              userPoints={userPoints}
              selectedOption={selectedOption}
              isCorrect={isCorrect}
              rankingOrder={rankingOrder}
              scaleValue={scaleValue}
              onVote={handleVote}
              onReaction={handleReaction}
              onWordSubmit={handleWordSubmit}
              onRankingChange={handleRankingChange}
              onScaleSubmit={handleScaleSubmit}
              showMiniConfetti={showMiniConfetti}
            />
            
            {/* Phone hint */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.8 }}
              className="text-center text-sm text-muted-foreground mt-4"
            >
              Tap to vote here
            </motion.p>
          </motion.div>
        </motion.div>

        {/* Feature badges */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-4 mt-16 text-sm text-muted-foreground"
        >
          {[
            "Quizzes with scoring",
            "Live polls",
            "Scale ratings",
            "Word clouds",
            "Rankings",
          ].map((feature) => (
            <span
              key={feature}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-background border border-border"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              {feature}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
