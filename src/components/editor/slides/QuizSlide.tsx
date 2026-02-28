import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Check, Users } from "lucide-react";
import { SlideWrapper, QuestionHeader, ActivityFooter } from "./index";
import { Slide, QuizSlideContent } from "@/types/slides";
import { Button } from "@/components/ui/button";
import { AutoResizeTextarea } from "@/components/ui/AutoResizeTextarea";
import { Confetti, SuccessBurst } from "@/components/effects";
import { ThemeId, getTheme } from "@/types/themes";
import { DesignStyleId, getDesignStyle, getAnimationVariants, getSpacingClasses, getShadowClasses } from "@/types/designStyles";

export interface QuizSlideProps {
  slide: Slide;
  isEditing?: boolean;
  onUpdate?: (content: QuizSlideContent) => void;
  showResults?: boolean;
  liveResults?: number[];
  totalResponses?: number;
  themeId?: ThemeId;
  designStyleId?: DesignStyleId;
  hideFooter?: boolean;
  showCorrectAnswer?: boolean;
}

export function QuizSlide({
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
}: QuizSlideProps) {
  const content = slide.content as QuizSlideContent;
  const theme = getTheme(themeId);
  const designStyle = getDesignStyle(designStyleId);
  const styleConfig = designStyle.config;
  const animations = getAnimationVariants(designStyle);
  const spacing = getSpacingClasses(designStyle);
  const shadowClass = getShadowClasses(designStyle);
  
  const [showCelebration, setShowCelebration] = useState(false);
  const [prevShowResults, setPrevShowResults] = useState(showResults);

  // Use live results if provided, otherwise use zeros
  const results = liveResults || content.options.map(() => 0);
  const hasResults = totalResponses > 0;

  // Trigger celebration when showResults becomes true (only for dynamic style)
  if (showResults && !prevShowResults && hasResults && styleConfig.celebrationOnResults) {
    setShowCelebration(true);
    setPrevShowResults(true);
    setTimeout(() => setShowCelebration(false), 3000);
  } else if (!showResults && prevShowResults) {
    setPrevShowResults(false);
  }

  // Animation entrance config based on style
  const getEntranceAnimation = (index: number) => {
    const baseDelay = styleConfig.animationIntensity === 'high' ? 0.08 : 
                      styleConfig.animationIntensity === 'moderate' ? 0.05 : 0.02;
    return {
      initial: animations.entrance.initial,
      animate: animations.entrance.animate,
      transition: { delay: index * baseDelay, ...animations.entrance.transition },
    };
  };

  const handleQuestionChange = (question: string) => {
    onUpdate?.({ ...content, question });
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...content.options];
    newOptions[index] = value;
    onUpdate?.({ ...content, options: newOptions });
  };

  const handleCorrectAnswerChange = (index: number) => {
    onUpdate?.({ ...content, correctAnswer: index });
  };

  const addOption = () => {
    if (content.options.length < 6) {
      onUpdate?.({ ...content, options: [...content.options, `Option ${content.options.length + 1}`] });
    }
  };

  const removeOption = (index: number) => {
    if (content.options.length > 2) {
      const newOptions = content.options.filter((_, i) => i !== index);
      const newCorrectAnswer = content.correctAnswer >= newOptions.length 
        ? newOptions.length - 1 
        : content.correctAnswer;
      onUpdate?.({ ...content, options: newOptions, correctAnswer: newCorrectAnswer });
    }
  };

  // Get text color from slide design
  const textColor = slide.design?.textColor || '#ffffff';

  // Minimal style - simpler, no animations
  const isMinimal = designStyleId === 'minimal';

  return (
    <>
      {styleConfig.celebrationOnResults && <Confetti isActive={showCelebration} />}
      {styleConfig.celebrationOnResults && <SuccessBurst isActive={showCelebration} message="Correct!" variant="correct" />}

      <SlideWrapper slide={slide} themeId={themeId}>
        <div className="flex flex-col h-full min-h-0 overflow-hidden">
          {/* Header - flex-shrink-0 to prevent shrinking */}
          <QuestionHeader
            question={content.question}
            onEdit={handleQuestionChange}
            editable={isEditing}
            subtitle={isEditing ? "Quiz: Select the correct answer" : undefined}
            textColor={textColor}
          />

          {/* Content area - scrollable if needed */}
          <div className={`flex-1 flex items-center justify-center px-3 md:px-6 pb-4 min-h-0 overflow-y-auto`}>
            <div className="w-full max-w-3xl max-h-full">
              {/* Options Grid - use stack for minimal, grid for dynamic */}
              <div className={`
                ${isMinimal 
                  ? 'flex flex-col space-y-2 max-w-md mx-auto' 
                  : `grid ${spacing.gap} ${content.options.length <= 2 ? 'grid-cols-1 max-w-md mx-auto' : 'grid-cols-2'}`
                }
              `}>
              {content.options.map((option, index) => {
                  const optionColorClass = theme.optionColors[index % theme.optionColors.length];
                  const count = results[index] || 0;
                  const percentage = totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0;
                  const isCorrect = index === content.correctAnswer;
                  const isHighlighted = showResults && isCorrect;
                  
                  // Get border radius based on theme
                  const getBorderRadius = () => {
                    switch (theme.tokens.buttonStyle) {
                      case 'pill': return 'rounded-full';
                      case 'rounded': return 'rounded-2xl';
                      case 'square': return 'rounded-xl';
                      case 'sharp': return 'rounded-none';
                      default: return 'rounded-xl';
                    }
                  };

                  const entranceAnim = getEntranceAnimation(index);

                  return (
                    <motion.div 
                      key={index} 
                      className="relative group min-w-0"
                      initial={isMinimal ? { opacity: 0 } : entranceAnim.initial}
                      animate={isMinimal ? { opacity: 1 } : entranceAnim.animate}
                      transition={isMinimal ? { duration: 0.2 } : entranceAnim.transition}
                    >
                      <motion.div
                        className={`
                          relative ${isMinimal ? 'p-3' : spacing.padding} ${getBorderRadius()} border-2 transition-all overflow-hidden 
                          ${isMinimal ? '' : shadowClass}
                          ${isHighlighted 
                            ? 'bg-green-500/40 border-green-400' 
                            : (isEditing || showCorrectAnswer) && isCorrect
                            ? 'bg-green-500/30 border-green-400/50'
                            : `${optionColorClass} border-white/20`
                          }
                          ${themeId === 'swiss-minimal' ? 'border-black border-[3px]' : ''}
                        `}
                        whileHover={!isEditing && !isMinimal ? { scale: 1.03 } : undefined}
                        animate={styleConfig.pulseOnNewVote && !isEditing && hasResults ? {
                          scale: [1, 1.01, 1],
                        } : undefined}
                        transition={styleConfig.pulseOnNewVote ? { duration: 0.3 } : undefined}
                        style={{
                          fontFamily: theme.tokens.fontFamily,
                        }}
                      >
                        {/* Option content */}
                        <div className="flex items-center justify-between gap-2 min-h-[2rem]">
                          {isEditing ? (
                            <AutoResizeTextarea
                              value={option}
                              onChange={(e) => handleOptionChange(index, e.target.value)}
                              className={`flex-1 bg-transparent text-white font-semibold outline-none text-center resize-none leading-snug ${
                                styleConfig.optionTextSize === 'large'
                                  ? 'text-base md:text-lg'
                                  : 'text-sm md:text-base'
                              }`}
                              placeholder={`Option ${index + 1}`}
                              minRows={1}
                            />
                          ) : (
                            <span className={`flex-1 min-w-0 text-white font-semibold text-center break-words ${
                              styleConfig.optionTextSize === 'large' ? 'text-base md:text-lg' : 'text-sm md:text-base'
                            }`}>
                              {option}
                            </span>
                          )}
                          
                          {/* Live count indicator - based on style config */}
                          {!isEditing && hasResults && (styleConfig.showCounts || styleConfig.showPercentages) && (
                            <AnimatePresence mode="wait">
                              <motion.span 
                                key={count}
                                initial={styleConfig.showAnimatedNumbers ? { scale: 1.5, opacity: 0 } : { opacity: 1 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="text-white/80 font-bold text-sm md:text-base flex-shrink-0"
                              >
                                {styleConfig.showCounts && `${count}`}
                                {styleConfig.showCounts && styleConfig.showPercentages && ' '}
                                {styleConfig.showPercentages && `(${percentage}%)`}
                              </motion.span>
                            </AnimatePresence>
                          )}
                        </div>

                        {/* Progress bar overlay for presentation mode */}
                        {!isEditing && hasResults && styleConfig.showProgressBars && (
                          <motion.div
                            className="absolute bottom-0 left-0 h-1 bg-white/30 rounded-b-xl"
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={styleConfig.animationIntensity === 'high' 
                              ? { type: "spring", stiffness: 100, damping: 20 }
                              : { duration: 0.5, ease: "easeOut" }
                            }
                          />
                        )}

                        {/* Correct answer check mark - show when revealed or in builder/editor preview */}
                        {(isHighlighted || (showCorrectAnswer && isCorrect)) && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-2 right-2"
                          >
                            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                              <Check className="w-5 h-5 text-white" />
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                      
                      {/* Editor controls */}
                      {isEditing && (
                        <div className="absolute -right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleCorrectAnswerChange(index)}
                            className={`
                              w-8 h-8 rounded-full flex items-center justify-center shadow-lg
                              ${isCorrect 
                                ? 'bg-green-500 text-white' 
                                : 'bg-white/90 text-gray-600 hover:bg-green-100'
                              }
                            `}
                            title="Mark as correct"
                          >
                            <Check className="w-4 h-4" />
                          </motion.button>
                          
                          {content.options.length > 2 && (
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => removeOption(index)}
                              className="w-8 h-8 rounded-full bg-white/90 text-red-500 hover:bg-red-100 flex items-center justify-center shadow-lg"
                              title="Remove option"
                            >
                              <Trash2 className="w-4 h-4" />
                            </motion.button>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Add option button - only in editor */}
              {isEditing && content.options.length < 6 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-6 text-center"
                >
                  <Button
                    variant="outline"
                    onClick={addOption}
                    className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Option
                  </Button>
                </motion.div>
              )}

              {/* Zero-state waiting indicator - only in presentation mode with no results */}
              {!isEditing && !hasResults && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 text-center"
                >
                  <motion.div
                    animate={{ 
                      scale: [1, 1.03, 1],
                      opacity: [0.6, 1, 0.6],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20"
                  >
                    <Users className="w-5 h-5 text-white/70" />
                    <span className="text-white/70 text-base font-medium">Waiting for responses...</span>
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
                  </motion.div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Footer - based on style config */}
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
