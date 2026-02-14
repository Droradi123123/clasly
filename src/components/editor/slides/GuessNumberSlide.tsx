import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Users } from "lucide-react";
import { SlideWrapper, QuestionHeader, ActivityFooter } from "./index";
import { Slide, GuessNumberSlideContent } from "@/types/slides";
import { ThemeId, getTheme } from "@/types/themes";
import { DesignStyleId, getDesignStyle } from "@/types/designStyles";
import { Input } from "@/components/ui/input";
import { Confetti, SuccessBurst } from "@/components/effects";

interface GuessNumberSlideProps {
  slide: Slide;
  isEditing?: boolean;
  onUpdate?: (content: GuessNumberSlideContent) => void;
  liveResults?: { guesses: number[] };
  totalResponses?: number;
  showAnswer?: boolean;
  themeId?: ThemeId;
  designStyleId?: DesignStyleId;
  hideFooter?: boolean;
}

export function GuessNumberSlide({ 
  slide, 
  isEditing = false, 
  onUpdate,
  liveResults,
  totalResponses = 0,
  showAnswer = false,
  themeId = 'neon-cyber',
  designStyleId = 'dynamic',
  hideFooter = false,
}: GuessNumberSlideProps) {
  const content = slide.content as GuessNumberSlideContent;
  const theme = getTheme(themeId);
  const designStyle = getDesignStyle(designStyleId);
  const styleConfig = designStyle.config;
  
  const [showCelebration, setShowCelebration] = useState(false);
  const [prevShowAnswer, setPrevShowAnswer] = useState(showAnswer);

  // Use live results if provided, otherwise use empty - safely handle undefined guesses
  const guesses = liveResults?.guesses ?? [];
  const hasResults = guesses.length > 0;
  const averageGuess = hasResults 
    ? guesses.reduce((a, b) => a + b, 0) / guesses.length 
    : 0;
  const closestGuess = hasResults
    ? guesses.reduce((prev, curr) => 
        Math.abs(curr - content.correctNumber) < Math.abs(prev - content.correctNumber) ? curr : prev
      )
    : 0;

  // Trigger celebration when answer is revealed
  useEffect(() => {
    if (showAnswer && !prevShowAnswer && hasResults && styleConfig.celebrationOnResults) {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 3000);
      return () => clearTimeout(timer);
    }
    setPrevShowAnswer(showAnswer);
  }, [showAnswer, prevShowAnswer, hasResults, styleConfig.celebrationOnResults]);

  const isMinimal = designStyleId === 'minimal';

  // Get text color from slide design
  const textColor = slide.design?.textColor || '#ffffff';

  return (
    <>
      {styleConfig.celebrationOnResults && <Confetti isActive={showCelebration} />}
      {styleConfig.celebrationOnResults && <SuccessBurst isActive={showCelebration} message="Revealed!" variant="celebration" />}

      <SlideWrapper slide={slide} themeId={themeId}>
        <div className="flex flex-col h-full min-h-0 overflow-hidden">
          <QuestionHeader 
            question={content.question} 
            onEdit={(q) => onUpdate?.({ ...content, question: q })} 
            editable={isEditing} 
            subtitle={`Range: ${content.minRange || 1} - ${content.maxRange || 100}`} 
            textColor={textColor}
          />
          
          {/* Content area */}
          <div className="flex-1 flex items-center justify-center px-4 md:px-6 pb-4 min-h-0 overflow-y-auto">
            <div className="w-full max-w-xl flex flex-col items-center">
              {/* Mystery box / Answer display */}
              <motion.div 
                className="relative w-24 h-24 md:w-32 md:h-32 mx-auto mb-6"
                animate={!showAnswer && !isMinimal ? { 
                  rotate: [0, 2, -2, 0],
                  scale: [1, 1.02, 1],
                } : undefined}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                {/* Glow effect */}
                {!isMinimal && (
                  <motion.div
                    className={`absolute inset-0 rounded-2xl md:rounded-3xl blur-xl ${showAnswer ? 'bg-green-400' : 'bg-gradient-to-br from-amber-400 to-orange-500'}`}
                    animate={{ 
                      opacity: [0.4, 0.7, 0.4],
                      scale: [0.9, 1.1, 0.9],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
                
                {/* Box */}
                <motion.div
                  className={`
                    relative w-full h-full rounded-2xl md:rounded-3xl shadow-xl flex items-center justify-center overflow-visible
                    ${showAnswer 
                      ? isMinimal 
                        ? 'bg-emerald-500 border-2 border-emerald-400' 
                        : 'bg-gradient-to-br from-green-400 to-emerald-500' 
                      : isMinimal
                        ? 'bg-amber-500 border-2 border-amber-400'
                        : 'bg-gradient-to-br from-amber-400 to-orange-500'
                    }
                  `}
                  style={{ fontFamily: theme.tokens.fontFamily }}
                >
                  {/* Sparkle decorations */}
                  {!showAnswer && !isMinimal && Array.from({ length: 4 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute"
                      style={{
                        top: `${20 + (i % 2) * 40}%`,
                        left: `${15 + i * 20}%`,
                      }}
                      animate={{
                        scale: [0.8, 1.2, 0.8],
                        opacity: [0.3, 0.8, 0.3],
                        rotate: [0, 180, 360],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                    >
                      <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-white/60" />
                    </motion.div>
                  ))}

                  {/* Number display */}
                  {(isEditing || showAnswer) ? (
                    <motion.span 
                      className="text-4xl md:text-6xl font-bold text-white drop-shadow-lg"
                      initial={showAnswer ? { scale: 0 } : undefined}
                      animate={showAnswer ? { scale: [0, 1.2, 1] } : undefined}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      {content.correctNumber}
                    </motion.span>
                  ) : (
                    <motion.span 
                      className="text-4xl md:text-6xl font-bold text-white drop-shadow-lg"
                      animate={!isMinimal ? { opacity: [0.5, 1, 0.5] } : undefined}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      ?
                    </motion.span>
                  )}
                </motion.div>
              </motion.div>

              {/* Editor controls - always visible when editing */}
              {isEditing && (
                <div className="space-y-3 text-center">
                  <p className="text-white/80 font-medium text-sm">Correct answer:</p>
                  <Input 
                    type="number" 
                    value={content.correctNumber} 
                    onChange={(e) => onUpdate?.({ ...content, correctNumber: parseInt(e.target.value) || 0 })} 
                    className="w-28 mx-auto text-center bg-white/20 border-white/30 text-white text-xl font-bold [&::-webkit-inner-spin-button]:appearance-none" 
                  />
                  <div className="flex gap-3 justify-center mt-3">
                    <div>
                      <p className="text-white/60 text-xs mb-1">Min Range</p>
                      <Input 
                        type="number" 
                        value={content.minRange ?? 1} 
                        onChange={(e) => onUpdate?.({ ...content, minRange: parseInt(e.target.value) || 1 })} 
                        className="w-24 text-center bg-white/20 border-white/30 text-white text-sm [&::-webkit-inner-spin-button]:appearance-none" 
                      />
                    </div>
                    <div>
                      <p className="text-white/60 text-xs mb-1">Max Range</p>
                      <Input 
                        type="number" 
                        value={content.maxRange ?? 100} 
                        onChange={(e) => onUpdate?.({ ...content, maxRange: parseInt(e.target.value) || 100 })} 
                        className="w-24 text-center bg-white/20 border-white/30 text-white text-sm [&::-webkit-inner-spin-button]:appearance-none" 
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Live statistics */}
              {!isEditing && (
                <div className="grid grid-cols-3 gap-2 md:gap-3 mt-4 md:mt-6">
                  {/* Guesses count */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-2 md:p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-center"
                  >
                    <p className="text-white/60 text-xs mb-0.5">Guesses</p>
                    <AnimatePresence mode="wait">
                      <motion.p
                        key={totalResponses}
                        initial={styleConfig.showAnimatedNumbers ? { scale: 1.5, opacity: 0 } : { opacity: 1 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-lg md:text-xl font-bold text-white"
                      >
                        {totalResponses}
                      </motion.p>
                    </AnimatePresence>
                  </motion.div>

                  {/* Average guess */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-2 md:p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-center"
                  >
                    <p className="text-white/60 text-xs mb-0.5">Average</p>
                    <p className="text-lg md:text-xl font-bold text-white">
                      {hasResults ? averageGuess.toFixed(0) : '-'}
                    </p>
                  </motion.div>

                  {/* Closest guess */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="p-2 md:p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-center"
                  >
                    <p className="text-white/60 text-xs mb-0.5">Closest</p>
                    <p className="text-lg md:text-xl font-bold text-white">
                      {hasResults ? closestGuess : '-'}
                    </p>
                  </motion.div>
                </div>
              )}

              {/* Zero-state waiting indicator */}
              {!isEditing && !hasResults && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 md:mt-6 text-center"
                >
                  <motion.div
                    animate={!isMinimal ? { 
                      scale: [1, 1.03, 1],
                      opacity: [0.6, 1, 0.6],
                    } : undefined}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20"
                  >
                    <Users className="w-4 h-4 text-white/70" />
                    <span className="text-white/70 text-sm font-medium">Waiting for guesses...</span>
                    {!isMinimal && (
                      <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-white/50"
                            animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </div>
          </div>
          
          {/* Footer */}
          {!isEditing && !hideFooter && styleConfig.footerStyle !== 'hidden' && (
            <ActivityFooter 
              participantCount={totalResponses} 
              showTimer={false}
              isActive={true}
            />
          )}
        </div>
      </SlideWrapper>
    </>
  );
}