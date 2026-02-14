import { useState, useEffect } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Send, CheckCircle2, Sparkles } from "lucide-react";
import { DemoSlide } from "./types";
import { DEMO_COLORS, REACTION_EMOJIS } from "./demoData";

interface PhoneScreenProps {
  slide: DemoSlide;
  userEmoji: string;
  userPoints: number;
  selectedOption: number | null;
  isCorrect: boolean | null;
  rankingOrder: string[];
  scaleValue: number | null;
  onVote: (index: number) => void;
  onReaction: (emoji: string) => void;
  onWordSubmit: (word: string) => void;
  onRankingChange: (newOrder: string[]) => void;
  onScaleSubmit: (value: number) => void;
  showMiniConfetti: boolean;
}

// Mini confetti for phone
function MiniConfetti({ isActive }: { isActive: boolean }) {
  const [particles, setParticles] = useState<{ id: number; x: number; color: string }[]>([]);

  useEffect(() => {
    if (isActive) {
      const newParticles = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#FF9FF3"][Math.floor(Math.random() * 5)],
      }));
      setParticles(newParticles);
      const timer = setTimeout(() => setParticles([]), 1500);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  return (
    <AnimatePresence>
      {particles.length > 0 && (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden rounded-[2rem]">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ left: `${p.x}%`, top: "50%", scale: 1, opacity: 1 }}
              animate={{ top: "-10%", scale: 0.5, opacity: 0 }}
              transition={{ duration: 1, ease: "easeOut", delay: Math.random() * 0.2 }}
              className="absolute w-2 h-2 rounded-full"
              style={{ backgroundColor: p.color }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}

export function PhoneScreen({
  slide,
  userEmoji,
  userPoints,
  selectedOption,
  isCorrect,
  rankingOrder,
  scaleValue,
  onVote,
  onReaction,
  onWordSubmit,
  onRankingChange,
  onScaleSubmit,
  showMiniConfetti,
}: PhoneScreenProps) {
  const [wordInput, setWordInput] = useState("");
  const [localScaleValue, setLocalScaleValue] = useState(5);

  const handleWordSubmit = () => {
    if (wordInput.trim()) {
      onWordSubmit(wordInput.trim());
      setWordInput("");
    }
  };

  return (
    <div className="relative">
      {/* Phone Frame */}
      <div className="relative">
        <div className="bg-zinc-900 rounded-[2.5rem] p-[6px] shadow-2xl">
          <div className="w-56 bg-background rounded-[2.2rem] overflow-hidden relative">
            {/* Mini confetti */}
            <MiniConfetti isActive={showMiniConfetti} />

            {/* Dynamic Island */}
            <div className="h-8 bg-background flex items-center justify-center relative">
              <div className="w-24 h-6 bg-black rounded-full flex items-center justify-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
              </div>
            </div>

            {/* Screen Content */}
            <div className="min-h-[380px] px-4 pb-4">
              {/* User Info Bar */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{userEmoji}</span>
                  <span className="text-sm font-medium text-foreground">You</span>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-500/15 border border-yellow-500/20">
                  <span className="text-xs font-bold text-yellow-600">⭐ {userPoints}</span>
                </div>
              </div>

              {/* Slide Type Label */}
              <p className="text-[11px] text-muted-foreground mb-1.5 uppercase tracking-wider font-medium">
                {slide.type === "quiz" ? "Quiz" : 
                 slide.type === "poll" ? "Poll" : 
                 slide.type === "wordcloud" ? "Word Cloud" : 
                 slide.type === "scale" ? "Rate" : "Ranking"}
              </p>

              {/* Question */}
              <h4 className="font-semibold text-foreground text-base mb-4 leading-snug">
                {slide.question}
              </h4>

              {/* Content based on slide type */}
              <AnimatePresence mode="wait">
                {(slide.type === "quiz" || slide.type === "poll") && slide.options && (
                  <motion.div
                    key="options"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-2.5"
                  >
                    {slide.options.map((option, index) => {
                      const isSelected = selectedOption === index;
                      const showResult = slide.type === "quiz" && selectedOption !== null;
                      const optionIsCorrect = slide.type === "quiz" && index === slide.correctIndex;
                      
                      return (
                        <motion.button
                          key={option}
                          onClick={() => selectedOption === null && onVote(index)}
                          disabled={selectedOption !== null}
                          className={`w-full p-3 rounded-xl border-2 text-left text-sm font-medium transition-all ${
                            isSelected
                              ? showResult
                                ? isCorrect
                                  ? "border-green-500 bg-green-500/15 text-green-700"
                                  : "border-red-500 bg-red-500/15 text-red-700"
                                : "border-primary bg-primary/10 text-primary"
                              : showResult && optionIsCorrect
                              ? "border-green-500 bg-green-500/10"
                              : "border-border bg-muted/30 text-foreground hover:border-primary/40 hover:bg-muted/50"
                          }`}
                          whileTap={selectedOption === null ? { scale: 0.98 } : undefined}
                        >
                          <span className="flex items-center gap-2.5">
                            <span
                              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                              style={{ backgroundColor: DEMO_COLORS[index] }}
                            >
                              {String.fromCharCode(65 + index)}
                            </span>
                            <span className="flex-1">{option}</span>
                            {showResult && optionIsCorrect && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                          </span>
                        </motion.button>
                      );
                    })}
                    
                    {/* Meaningful Feedback */}
                    {slide.type === "quiz" && selectedOption !== null && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`text-center py-3 rounded-xl ${
                          isCorrect ? "bg-green-500/10" : "bg-red-500/10"
                        }`}
                      >
                        {isCorrect ? (
                          <div className="flex items-center justify-center gap-2">
                            <Sparkles className="w-5 h-5 text-green-600" />
                            <span className="text-green-600 font-bold">Correct! +100 pts</span>
                          </div>
                        ) : (
                          <span className="text-red-600 font-medium">Not quite! The answer is highlighted.</span>
                        )}
                      </motion.div>
                    )}
                    
                    {slide.type === "poll" && selectedOption !== null && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-3 rounded-xl bg-primary/10"
                      >
                        <span className="text-primary font-medium">✓ Vote recorded!</span>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {slide.type === "scale" && (
                  <motion.div
                    key="scale"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    {scaleValue === null ? (
                      <>
                        {/* Slider */}
                        <div className="space-y-2">
                          <input
                            type="range"
                            min={slide.scaleMin || 1}
                            max={slide.scaleMax || 10}
                            value={localScaleValue}
                            onChange={(e) => setLocalScaleValue(Number(e.target.value))}
                            className="w-full h-3 rounded-full appearance-none cursor-pointer bg-gradient-to-r from-red-400 via-yellow-400 to-emerald-400"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{slide.scaleLabels?.min || "1"}</span>
                            <span className="text-lg font-bold text-foreground">{localScaleValue}</span>
                            <span>{slide.scaleLabels?.max || "10"}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => onScaleSubmit(localScaleValue)}
                          className="w-full p-3 rounded-xl bg-primary text-primary-foreground font-medium"
                        >
                          Submit Rating
                        </button>
                      </>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-4 rounded-xl bg-primary/10"
                      >
                        <p className="text-primary font-medium">✓ You rated: {scaleValue}/10</p>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {slide.type === "wordcloud" && (
                  <motion.div
                    key="wordcloud"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-3"
                  >
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={wordInput}
                        onChange={(e) => setWordInput(e.target.value)}
                        placeholder="Type a word..."
                        className="flex-1 p-2.5 rounded-xl border border-border bg-muted/30 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                        onKeyDown={(e) => e.key === "Enter" && handleWordSubmit()}
                      />
                      <button
                        onClick={handleWordSubmit}
                        className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground text-center">
                      Press enter to submit
                    </p>
                  </motion.div>
                )}

                {slide.type === "ranking" && (
                  <motion.div
                    key="ranking"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-1.5"
                  >
                    <p className="text-[11px] text-muted-foreground mb-2">
                      Drag to reorder
                    </p>
                    <Reorder.Group
                      axis="y"
                      values={rankingOrder}
                      onReorder={onRankingChange}
                      className="space-y-2"
                    >
                      {rankingOrder.map((item, index) => (
                        <Reorder.Item
                          key={item}
                          value={item}
                          className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/50 border border-border cursor-grab active:cursor-grabbing active:bg-muted/80 transition-colors"
                        >
                          <span className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">
                            {index + 1}
                          </span>
                          <span className="text-sm font-medium text-foreground flex-1">
                            {item}
                          </span>
                          <span className="text-muted-foreground text-sm">⋮⋮</span>
                        </Reorder.Item>
                      ))}
                    </Reorder.Group>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Emoji Reactions */}
              <div className="mt-5 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  {REACTION_EMOJIS.map((emoji) => (
                    <motion.button
                      key={emoji}
                      onClick={() => onReaction(emoji)}
                      className="text-xl hover:scale-125 transition-transform p-1.5 rounded-lg hover:bg-muted/50"
                      whileTap={{ scale: 1.4 }}
                    >
                      {emoji}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>

            {/* Home Indicator */}
            <div className="h-6 bg-background flex items-center justify-center">
              <div className="w-28 h-1 bg-foreground/15 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
