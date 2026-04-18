import { motion, AnimatePresence } from "framer-motion";
import { ThumbsUp, ThumbsDown, Users, Heart, X, Smile, Frown, Check } from "lucide-react";
import { SlideWrapper, QuestionHeader, ActivityFooter, CleanBarResults } from "./index";
import { Slide, YesNoSlideContent } from "@/types/slides";
import { ThemeId, getTheme } from "@/types/themes";
import { DesignStyleId, getDesignStyle } from "@/types/designStyles";
import { cn } from "@/lib/utils";

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
  /** In presenter mode: force show counts + percentages even when minimal */
  forceShowStats?: boolean;
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
  themeId = 'academic-pro',
  designStyleId = 'dynamic',
  hideFooter = false,
  showCorrectAnswer = false,
  forceShowStats = false,
}: YesNoSlideProps) {
  const content = slide.content as YesNoSlideContentExtended;
  const theme = getTheme(themeId);
  const designStyle = getDesignStyle(designStyleId);
  const styleConfig = designStyle.config;
  const showCounts = forceShowStats || styleConfig.showCounts;
  const showPercentages = forceShowStats || styleConfig.showPercentages;

  // Use live results if provided, otherwise use zeros
  const results = liveResults || { yes: 0, no: 0 };
  const hasResults = totalResponses > 0;
  const revealStats = isEditing || showResults;
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

  const isMinimal = designStyleId === 'minimal';
  const isCompact = designStyleId === 'compact';
  const isShowcase = slide.design?.yesNoVariant === "showcase";
  const isThumbsDynamic = slide.design?.yesNoVariant === 'thumbsDynamic';

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
            {/* Clean bar results view - when resultVisualization is clean_bars */}
            {!isEditing && showResults && slide.design?.resultVisualization === 'clean_bars' ? (
              <CleanBarResults
                options={[content.yesLabel || 'Yes', content.noLabel || 'No']}
                results={[results.yes, results.no]}
                totalResponses={totalResponses}
                correctIsYes={content.correctAnswer}
                isYesNo={true}
                textColor={textColor}
              />
            ) : isShowcase ? (
            <>
            <div className="flex w-full flex-row gap-3 md:gap-5 min-h-[300px] md:min-h-[360px]">
              {[
                {
                  key: "yes" as const,
                  pct: yesPercentage,
                  count: results.yes,
                  label: content.yesLabel || "Yes",
                  correct: yesIsCorrect,
                  onCorrect: () => handleCorrectAnswerChange(true),
                },
                {
                  key: "no" as const,
                  pct: noPercentage,
                  count: results.no,
                  label: content.noLabel || "No",
                  correct: noIsCorrect,
                  onCorrect: () => handleCorrectAnswerChange(false),
                },
              ].map((col, ci) => (
                <motion.div
                  key={col.key}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: ci * 0.08 }}
                  className={cn(
                    "flex flex-1 flex-col rounded-3xl border border-white/10 bg-[hsl(var(--theme-surface)/0.4)] p-4 md:p-5 shadow-sm min-h-0",
                    showCorrectAnswer &&
                      hasCorrectAnswer &&
                      col.correct &&
                      "ring-2 ring-[hsl(var(--theme-accent))] ring-offset-2 ring-offset-transparent",
                  )}
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    {isEditing ? (
                      <input
                        value={col.key === "yes" ? content.yesLabel || "Yes" : content.noLabel || "No"}
                        onChange={(e) =>
                          handleLabelChange(col.key, e.target.value)
                        }
                        className="flex-1 bg-transparent text-sm md:text-base font-semibold text-[hsl(var(--theme-text-primary))] outline-none border-b border-white/10"
                      />
                    ) : (
                      <span className="text-sm md:text-base font-semibold text-[hsl(var(--theme-text-primary))]">
                        {col.label}
                      </span>
                    )}
                    {isEditing && (
                      <button
                        type="button"
                        onClick={col.onCorrect}
                        className={cn(
                          "shrink-0 rounded-full px-2 py-1 text-xs font-bold",
                          col.correct
                            ? "bg-[hsl(var(--theme-accent)/0.25)] text-[hsl(var(--theme-accent))]"
                            : "bg-[hsl(var(--theme-text-primary)/0.08)] text-[hsl(var(--theme-text-secondary))]",
                        )}
                      >
                        {col.correct ? "Correct" : "Set"}
                      </button>
                    )}
                  </div>
                  <div className="relative flex flex-1 min-h-[180px] rounded-2xl bg-[hsl(var(--theme-text-primary)/0.06)] overflow-hidden">
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-[hsl(var(--theme-accent))]"
                      initial={false}
                      animate={{
                        height:
                          revealStats && hasResults
                            ? `${Math.max(0, col.pct)}%`
                            : isEditing
                              ? "12%"
                              : "0%",
                      }}
                      transition={{ type: "spring", stiffness: 120, damping: 22 }}
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center pb-4 pt-2">
                      {!isEditing && revealStats && hasResults ? (
                        <>
                          <span className="text-4xl md:text-6xl font-semibold tabular-nums tracking-tight text-[hsl(var(--theme-text-primary))]">
                            {col.pct}%
                          </span>
                          {showCounts ? (
                            <span className="text-xs md:text-sm text-[hsl(var(--theme-text-secondary))] tabular-nums">
                              {col.count} vote{col.count === 1 ? "" : "s"}
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-sm text-[hsl(var(--theme-text-secondary))]">
                          {isEditing ? "Preview" : "—"}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            {!isEditing && !hasResults && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-6 flex justify-center"
              >
                <div className="inline-flex items-center gap-2 rounded-3xl border border-white/10 bg-[hsl(var(--theme-surface)/0.4)] px-4 py-2 text-sm text-[hsl(var(--theme-text-secondary))]">
                  <Users className="w-4 h-4" />
                  <span>Waiting for votes…</span>
                </div>
              </motion.div>
            )}
            {!isEditing && hasResults && !revealStats && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 flex justify-center text-center"
              >
                <div className="inline-flex max-w-md flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/15 bg-[hsl(var(--theme-surface)/0.35)] px-4 py-2 text-sm text-[hsl(var(--theme-text-secondary))]">
                  <Users className="w-4 h-4 shrink-0" />
                  <span>
                    {totalResponses} vote{totalResponses === 1 ? "" : "s"} — percentages hidden until the timer ends or the presenter shows results.
                  </span>
                </div>
              </motion.div>
            )}
            </>
            ) : isThumbsDynamic ? (
            /* thumbsDynamic: two big thumbs; selected (by results) grows and glows, other shrinks and grays */
            <div className="relative flex flex-row items-center justify-center gap-8 md:gap-12">
              <motion.div
                className="flex flex-col items-center gap-2"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                {isEditing && (
                  <button
                    onClick={() => handleCorrectAnswerChange(true)}
                    className={`px-3 py-1 rounded-full text-xs font-bold ${yesIsCorrect ? 'bg-white text-green-600' : 'bg-white/20 text-white'}`}
                  >
                    {yesIsCorrect ? '✓ Correct' : 'Set correct'}
                  </button>
                )}
                <motion.div
                  className="flex flex-col items-center cursor-default"
                  animate={revealStats && hasResults ? (yesPercentage >= noPercentage ? { scale: 1.1 } : { scale: 0.85, opacity: 0.7 }) : { scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                >
                  <div className={`p-4 md:p-6 rounded-full transition-all ${
                    revealStats && hasResults && yesPercentage >= noPercentage ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50 ring-4 ring-white/40' : 'bg-emerald-500/90'
                  }`}>
                    <ThumbsUp className="w-14 h-14 md:w-20 md:h-20 text-white" />
                  </div>
                  <span className="text-white/90 text-sm mt-1 font-medium">{content.yesLabel || 'Yes'}</span>
                  {!isEditing && revealStats && hasResults && (
                    <div className="flex flex-col items-center mt-1">
                      <span className="text-white text-2xl font-bold">{yesPercentage}%</span>
                      {showCounts && <span className="text-white/70 text-sm">{results.yes} vote{results.yes === 1 ? '' : 's'}</span>}
                    </div>
                  )}
                </motion.div>
              </motion.div>
              <motion.div
                className="flex flex-col items-center gap-2"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                {isEditing && (
                  <button
                    onClick={() => handleCorrectAnswerChange(false)}
                    className={`px-3 py-1 rounded-full text-xs font-bold ${noIsCorrect ? 'bg-white text-green-600' : 'bg-white/20 text-white'}`}
                  >
                    {noIsCorrect ? '✓ Correct' : 'Set correct'}
                  </button>
                )}
                <motion.div
                  className="flex flex-col items-center cursor-default"
                  animate={revealStats && hasResults ? (noPercentage > yesPercentage ? { scale: 1.1 } : { scale: 0.85, opacity: 0.7 }) : { scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                >
                  <div className={`p-4 md:p-6 rounded-full transition-all ${
                    revealStats && hasResults && noPercentage > yesPercentage ? 'bg-rose-500 shadow-lg shadow-rose-500/50 ring-4 ring-white/40' : 'bg-rose-500/90'
                  }`}>
                    <ThumbsDown className="w-14 h-14 md:w-20 md:h-20 text-white" />
                  </div>
                  <span className="text-white/90 text-sm mt-1 font-medium">{content.noLabel || 'No'}</span>
                  {!isEditing && revealStats && hasResults && (
                    <div className="flex flex-col items-center mt-1">
                      <span className="text-white text-2xl font-bold">{noPercentage}%</span>
                      {showCounts && <span className="text-white/70 text-sm">{results.no} vote{results.no === 1 ? '' : 's'}</span>}
                    </div>
                  )}
                </motion.div>
              </motion.div>
              {!isEditing && !hasResults && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white/70 text-sm">
                  <Users className="w-4 h-4" />
                  <span>Waiting for votes...</span>
                </div>
              )}
              {!isEditing && hasResults && !revealStats && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-wrap items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white/80 text-sm max-w-md text-center">
                  <Users className="w-4 h-4 shrink-0" />
                  <span>
                    {totalResponses} vote{totalResponses === 1 ? "" : "s"} — percentages hidden until the timer ends or the presenter shows results.
                  </span>
                </div>
              )}
            </div>
            ) : (
            <>
            {/* Yes/No buttons - grid for minimal/dynamic, flex row for compact */}
            <div className={isCompact 
              ? 'flex flex-row flex-wrap justify-center gap-3 md:gap-4' 
              : 'grid grid-cols-2 gap-4 md:gap-6'
            }>
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
                      : isCompact
                      ? 'bg-emerald-500/90 border-2 border-emerald-400/80 shadow-md min-w-[120px] flex-1 max-w-[200px]'
                      : 'bg-gradient-to-br from-emerald-500 to-green-400'
                    }
                    ${showCorrectAnswer && yesIsCorrect ? 'ring-4 ring-white/80' : ''}
                  `}
                  whileHover={!isEditing ? { scale: (styleConfig.animationIntensity === 'high' || isCompact) ? 1.03 : 1.01 } : undefined}
                  animate={!isEditing && !isMinimal && !isCompact ? { y: [0, -3, 0] } : undefined}
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
                    {!isEditing && (showCounts || showPercentages) && (
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={results.yes}
                          initial={styleConfig.showAnimatedNumbers ? { scale: 1.5, opacity: 0 } : { opacity: 1 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={styleConfig.showAnimatedNumbers ? { scale: 0.5, opacity: 0 } : undefined}
                          className="mt-2 flex items-center gap-2"
                        >
                          {revealStats && hasResults ? (
                            <>
                              {showCounts && (
                                <span className="text-2xl md:text-3xl font-bold">{results.yes}</span>
                              )}
                              {showPercentages && (
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
                  {!isEditing && revealStats && hasResults && styleConfig.showProgressBars && (
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
                      : isCompact
                      ? 'bg-rose-500/90 border-2 border-rose-400/80 shadow-md min-w-[120px] flex-1 max-w-[200px]'
                      : 'bg-gradient-to-br from-rose-500 to-red-500'
                    }
                    ${showCorrectAnswer && noIsCorrect ? 'ring-4 ring-white/80' : ''}
                  `}
                  whileHover={!isEditing ? { scale: (styleConfig.animationIntensity === 'high' || isCompact) ? 1.03 : 1.01 } : undefined}
                  animate={!isEditing && !isMinimal && !isCompact ? { y: [0, -3, 0] } : undefined}
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
                    {!isEditing && (showCounts || showPercentages) && (
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={results.no}
                          initial={styleConfig.showAnimatedNumbers ? { scale: 1.5, opacity: 0 } : { opacity: 1 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={styleConfig.showAnimatedNumbers ? { scale: 0.5, opacity: 0 } : undefined}
                          className="mt-2 flex items-center gap-2"
                        >
                          {revealStats && hasResults ? (
                            <>
                              {showCounts && (
                                <span className="text-2xl md:text-3xl font-bold">{results.no}</span>
                              )}
                              {showPercentages && (
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
                  {!isEditing && revealStats && hasResults && styleConfig.showProgressBars && (
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

            {/* Zero-state waiting — or “votes in, breakdown hidden” during timed quiz */}
            {!isThumbsDynamic && !isEditing && !hasResults && (
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
            {!isThumbsDynamic && !isEditing && hasResults && !revealStats && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 text-center px-2"
              >
                <div className="inline-flex flex-wrap items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 max-w-lg mx-auto text-white/80 text-sm">
                  <Users className="w-5 h-5 shrink-0" />
                  <span>
                    {totalResponses} vote{totalResponses === 1 ? "" : "s"} — percentages stay hidden until the timer ends or the presenter shows results.
                  </span>
                </div>
              </motion.div>
            )}

            </>
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