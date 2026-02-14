import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Users } from "lucide-react";
import { DemoSlide, DemoStudent, PollResult } from "./types";
import { DemoLeaderboard } from "./DemoLeaderboard";
import { DemoConfetti } from "./DemoConfetti";
import { FloatingReactions } from "./FloatingReactions";
import { WORD_COLORS } from "./demoData";

interface LaptopScreenProps {
  slide: DemoSlide;
  slideIndex: number;
  totalSlides: number;
  pollResults: PollResult[];
  students: DemoStudent[];
  floatingEmojis: { id: number; emoji: string; startX: number; startY: number }[];
  showConfetti: boolean;
  quizResults: number[];
  wordCloudWords: { text: string; count: number }[];
  rankingOrder: string[];
  scaleAverage: number;
  onNavigate: (direction: "next" | "prev") => void;
}

export function LaptopScreen({
  slide,
  slideIndex,
  totalSlides,
  pollResults,
  students,
  floatingEmojis,
  showConfetti,
  quizResults,
  wordCloudWords,
  rankingOrder,
  scaleAverage,
  onNavigate,
}: LaptopScreenProps) {
  const totalVotes = pollResults.reduce((sum, opt) => sum + opt.votes, 0);
  const totalQuizVotes = quizResults.reduce((sum, v) => sum + v, 0);
  const maxWordCount = Math.max(...wordCloudWords.map((w) => w.count), 1);

  return (
    <div className="relative">
      {/* Laptop Frame - Bigger & Clean */}
      <div className="relative">
        {/* Screen bezel */}
        <div className="bg-gradient-to-b from-zinc-800 to-zinc-900 rounded-t-xl p-[6px] pb-0 shadow-2xl">
          {/* Camera notch */}
          <div className="absolute top-[6px] left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-zinc-700" />
          
          {/* Screen - Bigger */}
          <div className="bg-card rounded-lg overflow-hidden w-[520px] md:w-[620px] lg:w-[720px] aspect-[16/10] relative">
            {/* Confetti */}
            <DemoConfetti isActive={showConfetti} />
            
            {/* Floating Reactions */}
            <FloatingReactions reactions={floatingEmojis} />
            
            {/* Browser Bar */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted border-b border-border">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                <div className="w-2 h-2 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-background rounded px-3 py-0.5 text-[10px] text-muted-foreground text-center max-w-[180px] mx-auto font-mono">
                  clasly.app/live/ABC123
                </div>
              </div>
            </div>

            {/* Slide Content */}
            <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 h-[calc(100%-28px)] p-6 md:p-7">
              {/* Leaderboard - Top Right */}
              <DemoLeaderboard students={students} />

              {/* Top Bar */}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/30 text-red-100">
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                  <span className="text-xs font-medium">LIVE</span>
                </div>
                <div className="flex items-center gap-1.5 text-white/70">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">{students.length + 25} joined</span>
                </div>
              </div>

              {/* Question */}
              <h3 className="text-white text-xl md:text-2xl font-bold mb-6 pr-32 leading-tight">
                {slide.question}
              </h3>

              {/* Content based on slide type */}
              <AnimatePresence mode="wait">
                {slide.type === "quiz" && slide.options && (
                  <motion.div
                    key="quiz"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-2 gap-3"
                  >
                    {slide.options.map((option, index) => {
                      const votes = quizResults[index] || 0;
                      const percentage = totalQuizVotes > 0 ? Math.round((votes / totalQuizVotes) * 100) : 0;
                      const isCorrect = index === slide.correctIndex;
                      
                      return (
                        <div
                          key={option}
                          className={`relative rounded-xl overflow-hidden ${
                            isCorrect ? "ring-2 ring-green-400 ring-offset-2 ring-offset-transparent" : ""
                          }`}
                        >
                          <div className="absolute inset-0 bg-white/15" />
                          <motion.div
                            className={`absolute inset-y-0 left-0 ${
                              isCorrect ? "bg-green-500/40" : "bg-white/25"
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ type: "spring", stiffness: 80, damping: 15 }}
                          />
                          <div className="relative p-4 flex items-center justify-between">
                            <span className="text-white text-base font-medium flex items-center gap-2">
                              {isCorrect && <span className="text-green-300">✓</span>}
                              {option}
                            </span>
                            <span className="text-white/80 text-base font-bold">
                              {percentage}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}

                {slide.type === "poll" && (
                  <motion.div
                    key="poll"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-3"
                  >
                    {pollResults.map((option) => {
                      const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
                      
                      return (
                        <div key={option.label} className="space-y-1.5">
                          <div className="flex justify-between text-white text-base">
                            <span>{option.label}</span>
                            <span className="font-bold">{percentage}%</span>
                          </div>
                          <div className="h-8 rounded-lg bg-white/15 overflow-hidden">
                            <motion.div
                              className="h-full rounded-lg"
                              style={{ backgroundColor: option.color }}
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ type: "spring", stiffness: 80, damping: 15 }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}

                {slide.type === "scale" && (
                  <motion.div
                    key="scale"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                    {/* Scale gauge */}
                    <div className="relative pt-4">
                      {/* Track */}
                      <div className="h-10 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-emerald-500 relative overflow-hidden">
                        <div className="absolute inset-0 bg-white/10" />
                      </div>
                      
                      {/* Needle/Indicator */}
                      <motion.div
                        className="absolute top-0 w-1 h-14 bg-white rounded-full shadow-lg"
                        style={{ left: `${((scaleAverage - 1) / 9) * 100}%` }}
                        initial={{ left: "0%" }}
                        animate={{ left: `${((scaleAverage - 1) / 9) * 100}%` }}
                        transition={{ type: "spring", stiffness: 60, damping: 15 }}
                      />
                      
                      {/* Average value */}
                      <motion.div
                        className="absolute -top-8 bg-white text-primary font-bold px-3 py-1 rounded-full text-sm shadow-lg"
                        style={{ left: `${((scaleAverage - 1) / 9) * 100}%`, transform: "translateX(-50%)" }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        Avg: {scaleAverage.toFixed(1)}
                      </motion.div>
                    </div>
                    
                    {/* Labels */}
                    <div className="flex justify-between text-white/80 text-sm">
                      <span>{slide.scaleLabels?.min || "1"}</span>
                      <span>{slide.scaleLabels?.max || "10"}</span>
                    </div>
                  </motion.div>
                )}

                {slide.type === "wordcloud" && (
                  <motion.div
                    key="wordcloud"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-wrap items-center justify-center gap-3 min-h-[160px] max-h-[180px] overflow-hidden py-4 px-2"
                  >
                    {wordCloudWords.slice(0, 8).map((word, index) => {
                      const sizeScale = 0.5 + (word.count / maxWordCount) * 0.6;
                      const fontSize = Math.min(Math.max(14, 26 * sizeScale), 32);
                      const colorClass = WORD_COLORS[index % WORD_COLORS.length];
                      
                      return (
                        <motion.span
                          key={word.text}
                          className={`font-bold ${colorClass} whitespace-nowrap`}
                          style={{ fontSize: `${fontSize}px` }}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.04 }}
                        >
                          {word.text}
                          {word.count > 1 && (
                            <sup className="text-white/40 ml-0.5 text-[10px]">
                              {word.count}
                            </sup>
                          )}
                        </motion.span>
                      );
                    })}
                  </motion.div>
                )}

                {slide.type === "ranking" && (
                  <motion.div
                    key="ranking"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-2.5"
                  >
                    {rankingOrder.map((item, index) => (
                      <motion.div
                        key={item}
                        layout
                        className="flex items-center gap-3 p-3.5 rounded-xl bg-white/15"
                      >
                        <span className="w-8 h-8 rounded-full bg-white/25 flex items-center justify-center text-white text-base font-bold">
                          {index + 1}
                        </span>
                        <span className="text-white text-base font-medium">{item}</span>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation Controls */}
              <div className="absolute bottom-4 left-6 right-6 flex justify-between items-center">
                <button
                  onClick={() => onNavigate("prev")}
                  className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors active:scale-95"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex gap-2">
                  {Array.from({ length: totalSlides }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-all ${
                        i === slideIndex ? "bg-white scale-110" : "bg-white/40"
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => onNavigate("next")}
                  className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors active:scale-95"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Laptop base */}
        <div className="bg-gradient-to-b from-zinc-800 to-zinc-700 h-3 rounded-b-xl mx-16" />
        <div className="bg-gradient-to-b from-zinc-700 to-zinc-600 h-1.5 rounded-b-lg mx-8" />
      </div>
    </div>
  );
}
