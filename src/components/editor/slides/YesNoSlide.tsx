import { motion, AnimatePresence } from "framer-motion";
import { ThumbsUp, ThumbsDown, Users, Heart, X, Smile, Frown, Check } from "lucide-react";
import { SlideWrapper, QuestionHeader, ActivityFooter } from "./index";
import { Slide, YesNoSlideContent } from "@/types/slides";
import { ThemeId, getTheme } from "@/types/themes";
import { DesignStyleId, getDesignStyle } from "@/types/designStyles";

export interface YesNoSlideProps {
  slide: Slide;
  isEditing?: boolean;
  onUpdate?: (content: YesNoSlideContent) => void;
  showResults?: boolean;
  liveResults?: { yes: number; no: number };
  totalResponses?: number;
  themeId?: ThemeId;
  designStyleId?: DesignStyleId;
  hideFooter?: boolean;
  showCorrectAnswer?: boolean;
}

// Extended content type for custom labels
interface YesNoSlideContentExtended extends YesNoSlideContent {
  yesLabel?: string;
  noLabel?: string;
  visualStyle?: 'thumbs' | 'emoji' | 'hearts';
}

export function YesNoSlide({
  slide,
  isEditing = false,
  onUpdate,
  showResults = false,
  liveResults,
  totalResponses = 0,
  themeId = 'neon-cyber',
  designStyleId = 'dynamic',
  hideFooter = false,
  showCorrectAnswer = false,
}: YesNoSlideProps) {
  const content = slide.content as YesNoSlideContentExtended;
  const theme = getTheme(themeId);
  const designStyle = getDesignStyle(designStyleId);
  const styleConfig = designStyle.config;

  // Use live results if provided, otherwise use zeros
  const results = liveResults || { yes: 0, no: 0 };
  const hasResults = totalResponses > 0;
  const yesPercentage = totalResponses > 0 ? Math.round((results.yes / totalResponses) * 100) : 0;
  const noPercentage = totalResponses > 0 ? Math.round((results.no / totalResponses) * 100) : 0;

  const handleQuestionChange = (question: string) => {
    onUpdate?.({ ...content, question });
  };

  const handleLabelChange = (type: 'yes' | 'no', value: string) => {
    if (type === 'yes') {
      onUpdate?.({ ...content, yesLabel: value } as YesNoSlideContent);
    } else {
      onUpdate?.({ ...content, noLabel: value } as YesNoSlideContent);
    }
  };

  const handleCorrectAnswerChange = (correct: boolean) => {
    onUpdate?.({ ...content, correctAnswer: correct });
  };

  // Get icons based on visual style
  const getIcons = () => {
    const style = content.visualStyle || 'thumbs';
    switch (style) {
      case 'emoji':
        return { yes: Smile, no: Frown };
      case 'hearts':
        return { yes: Heart, no: X };
      default:
        return { yes: ThumbsUp, no: ThumbsDown };
    }
  };

  const icons = getIcons();
  const YesIcon = icons.yes;
  const NoIcon = icons.no;

  // Dynamic vs Minimal style differences
  const isMinimal = designStyleId === 'minimal';

  // Get text color from slide design
  const textColor = slide.design?.textColor || '#ffffff';
  
  // Check which answer is correct
  const yesIsCorrect = content.correctAnswer === true;
  const noIsCorrect = content.correctAnswer === false;
  const hasCorrectAnswer = content.correctAnswer !== undefined;

  return (
    <SlideWrapper slide={slide} themeId={themeId}>
      <div className="flex flex-col h-full min-h-0 overflow-hidden">
        {/* Header */}
        <QuestionHeader
          question={content.question}
          onEdit={handleQuestionChange}
          editable={isEditing}
          subtitle={isEditing ? "Yes/No: Cast your vote" : undefined}
          textColor={textColor}
        />

        {/* Content area */}
        <div className="flex-1 flex items-center justify-center px-4 md:px-8 pb-4 overflow-hidden min-h-0">
          <div className="w-full max-w-3xl">
            {/* Yes/No buttons grid */}
            <div className="grid grid-cols-2 gap-4 md:gap-6">
              {/* Yes Button */}
              <motion.div 
                className="relative group"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                {/* Correct answer indicator in editing mode */}
                {isEditing && (
                  <button
                    onClick={() => handleCorrectAnswerChange(true)}
                    className={`absolute -top-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
                      yesIsCorrect 
                        ? 'bg-white text-green-600 shadow-lg' 
                        : 'bg-white/20 text-white/70 hover:bg-white/40'
                    }`}
                  >
                    {yesIsCorrect && <Check className="w-3 h-3" />}
                    {yesIsCorrect ? 'Correct ✓' : 'Set as correct'}
                  </button>
                )}
                
                {/* Show correct indicator when revealed */}
                {showCorrectAnswer && yesIsCorrect && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full bg-white text-green-600 text-xs font-bold shadow-lg flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    Correct
                  </motion.div>
                )}
                
                <motion.div
                  className={`
                    relative p-4 md:p-6 rounded-2xl shadow-xl overflow-hidden
                    ${isMinimal 
                      ? 'bg-emerald-500/80 border-2 border-emerald-400' 
                      : 'bg-gradient-to-br from-emerald-500 to-green-400'
                    }
                    ${showCorrectAnswer && yesIsCorrect ? 'ring-4 ring-white/80' : ''}
                  `}
                  whileHover={!isEditing ? { scale: styleConfig.animationIntensity === 'high' ? 1.03 : 1.01 } : undefined}
                  animate={!isEditing && !isMinimal ? { y: [0, -3, 0] } : undefined}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{ fontFamily: theme.tokens.fontFamily }}
                >
                  <div className="flex flex-col items-center text-white relative z-10">
                    <YesIcon className={`mb-2 ${isMinimal ? 'w-8 h-8 md:w-10 md:h-10' : 'w-10 h-10 md:w-12 md:h-12'}`} />
                    
                    {/* Editable label */}
                    {isEditing ? (
                      <input
                        value={content.yesLabel || 'Yes'}
                        onChange={(e) => handleLabelChange('yes', e.target.value)}
                        className="bg-transparent text-center text-lg md:text-xl font-bold outline-none w-full placeholder:text-white/50"
                        placeholder="Yes"
                      />
                    ) : (
                      <span className="text-lg md:text-xl font-bold">{content.yesLabel || 'Yes'}</span>
                    )}
                    
                    {/* Live count indicator */}
                    {!isEditing && (styleConfig.showCounts || styleConfig.showPercentages) && (
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={results.yes}
                          initial={styleConfig.showAnimatedNumbers ? { scale: 1.5, opacity: 0 } : { opacity: 1 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={styleConfig.showAnimatedNumbers ? { scale: 0.5, opacity: 0 } : undefined}
                          className="mt-2 flex items-center gap-2"
                        >
                          {hasResults ? (
                            <>
                              {styleConfig.showCounts && (
                                <span className="text-2xl md:text-3xl font-bold">{results.yes}</span>
                              )}
                              {styleConfig.showPercentages && (
                                <span className="text-white/80 text-sm">({yesPercentage}%)</span>
                              )}
                            </>
                          ) : (
                            <motion.div
                              animate={!isMinimal ? { opacity: [0.3, 0.6, 0.3] } : undefined}
                              transition={{ duration: 1.5, repeat: Infinity }}
                              className="w-10 h-10 rounded-full bg-white/20"
                            />
                          )}
                        </motion.div>
                      </AnimatePresence>
                    )}
                  </div>

                  {/* Progress bar */}
                  {!isEditing && hasResults && styleConfig.showProgressBars && (
                    <motion.div
                      className="absolute bottom-0 left-0 h-1.5 bg-white/30 rounded-b-2xl"
                      initial={{ width: 0 }}
                      animate={{ width: `${yesPercentage}%` }}
                      transition={isMinimal 
                        ? { duration: 0.5, ease: "easeOut" }
                        : { type: "spring", stiffness: 100, damping: 20 }
                      }
                    />
                  )}
                </motion.div>
              </motion.div>

              {/* No Button */}
              <motion.div 
                className="relative group"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {/* Correct answer indicator in editing mode */}
                {isEditing && (
                  <button
                    onClick={() => handleCorrectAnswerChange(false)}
                    className={`absolute -top-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
                      noIsCorrect 
                        ? 'bg-white text-green-600 shadow-lg' 
                        : 'bg-white/20 text-white/70 hover:bg-white/40'
                    }`}
                  >
                    {noIsCorrect && <Check className="w-3 h-3" />}
                    {noIsCorrect ? 'Correct ✓' : 'Set as correct'}
                  </button>
                )}
                
                {/* Show correct indicator when revealed */}
                {showCorrectAnswer && noIsCorrect && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full bg-white text-green-600 text-xs font-bold shadow-lg flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    Correct
                  </motion.div>
                )}
                
                <motion.div
                  className={`
                    relative p-4 md:p-6 rounded-2xl shadow-xl overflow-hidden
                    ${isMinimal 
                      ? 'bg-rose-500/80 border-2 border-rose-400' 
                      : 'bg-gradient-to-br from-rose-500 to-red-500'
                    }
                    ${showCorrectAnswer && noIsCorrect ? 'ring-4 ring-white/80' : ''}
                  `}
                  whileHover={!isEditing ? { scale: styleConfig.animationIntensity === 'high' ? 1.03 : 1.01 } : undefined}
                  animate={!isEditing && !isMinimal ? { y: [0, -3, 0] } : undefined}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                  style={{ fontFamily: theme.tokens.fontFamily }}
                >
                  <div className="flex flex-col items-center text-white relative z-10">
                    <NoIcon className={`mb-2 ${isMinimal ? 'w-8 h-8 md:w-10 md:h-10' : 'w-10 h-10 md:w-12 md:h-12'}`} />
                    
                    {/* Editable label */}
                    {isEditing ? (
                      <input
                        value={content.noLabel || 'No'}
                        onChange={(e) => handleLabelChange('no', e.target.value)}
                        className="bg-transparent text-center text-lg md:text-xl font-bold outline-none w-full placeholder:text-white/50"
                        placeholder="No"
                      />
                    ) : (
                      <span className="text-lg md:text-xl font-bold">{content.noLabel || 'No'}</span>
                    )}
                    
                    {/* Live count indicator */}
                    {!isEditing && (styleConfig.showCounts || styleConfig.showPercentages) && (
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={results.no}
                          initial={styleConfig.showAnimatedNumbers ? { scale: 1.5, opacity: 0 } : { opacity: 1 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={styleConfig.showAnimatedNumbers ? { scale: 0.5, opacity: 0 } : undefined}
                          className="mt-2 flex items-center gap-2"
                        >
                          {hasResults ? (
                            <>
                              {styleConfig.showCounts && (
                                <span className="text-2xl md:text-3xl font-bold">{results.no}</span>
                              )}
                              {styleConfig.showPercentages && (
                                <span className="text-white/80 text-sm">({noPercentage}%)</span>
                              )}
                            </>
                          ) : (
                            <motion.div
                              animate={!isMinimal ? { opacity: [0.3, 0.6, 0.3] } : undefined}
                              transition={{ duration: 1.5, repeat: Infinity }}
                              className="w-10 h-10 rounded-full bg-white/20"
                            />
                          )}
                        </motion.div>
                      </AnimatePresence>
                    )}
                  </div>

                  {/* Progress bar */}
                  {!isEditing && hasResults && styleConfig.showProgressBars && (
                    <motion.div
                      className="absolute bottom-0 left-0 h-1.5 bg-white/30 rounded-b-2xl"
                      initial={{ width: 0 }}
                      animate={{ width: `${noPercentage}%` }}
                      transition={isMinimal 
                        ? { duration: 0.5, ease: "easeOut" }
                        : { type: "spring", stiffness: 100, damping: 20 }
                      }
                    />
                  )}
                </motion.div>
              </motion.div>
            </div>

            {/* Zero-state waiting indicator */}
            {!isEditing && !hasResults && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 text-center"
              >
                <motion.div
                  animate={!isMinimal ? { 
                    scale: [1, 1.03, 1],
                    opacity: [0.6, 1, 0.6],
                  } : undefined}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20"
                >
                  <Users className="w-5 h-5 text-white/70" />
                  <span className="text-white/70 text-sm md:text-base font-medium">Waiting for votes...</span>
                  {!isMinimal && (
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 rounded-full bg-white/50"
                          animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}

            {/* Editor hint - show if no correct answer set */}
            {isEditing && !hasCorrectAnswer && (
              <motion.p
                className="text-center text-amber-300/90 mt-6 text-xs md:text-sm bg-amber-500/20 px-4 py-2 rounded-xl mx-auto max-w-md"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                ⚠️ Click "Set as correct" above to define the correct answer
              </motion.p>
            )}
            
            {isEditing && hasCorrectAnswer && (
              <motion.p
                className="text-center text-white/50 mt-6 text-xs md:text-sm"
                animate={{ opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {yesIsCorrect ? '"Yes"' : '"No"'} is marked as the correct answer
              </motion.p>
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
  );
}