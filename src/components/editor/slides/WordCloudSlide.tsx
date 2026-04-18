import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users } from "lucide-react";

import { SlideWrapper, QuestionHeader, ActivityFooter } from "./index";
import { Slide, WordCloudSlideContent } from "@/types/slides";
import { ThemeId } from "@/types/themes";
import { DesignStyleId } from "@/types/designStyles";
import { ShowcaseShell, ShowcaseChip } from "@/components/editor/slides/showcase/ShowcasePrimitives";

interface WordCloudSlideProps {
  slide: Slide;
  isEditing?: boolean;
  onUpdate?: (content: WordCloudSlideContent) => void;
  liveWords?: { text: string; count: number }[];
  totalResponses?: number;
  themeId?: ThemeId;
  /** Passed from SlideRenderer for consistency with other slides */
  designStyleId?: DesignStyleId;
  hideFooter?: boolean;
  /** When false (e.g. non-present contexts), hide live aggregate words */
  showResults?: boolean;
}

// Color palette – blue/purple and red/pink tones (like reference image)
const WORD_COLORS = [
  '#6366F1', // indigo
  '#8B5CF6', // violet
  '#3B82F6', // blue
  '#7C3AED', // purple
  '#EC4899', // pink
  '#EF4444', // red
  '#F97316', // orange-red
  '#DB2777', // pink-rose
];

// Hash for stable color per word
function getWordColor(text: string) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  return WORD_COLORS[Math.abs(hash) % WORD_COLORS.length];
}

export function WordCloudSlide({
  slide,
  isEditing = false,
  onUpdate,
  liveWords = [],
  totalResponses = 0,
  themeId = 'academic-pro',
  designStyleId: _designStyleId,
  hideFooter = false,
  showResults = true,
}: WordCloudSlideProps) {
  const content = slide.content as WordCloudSlideContent;
  const revealWords = isEditing || showResults;
  const wordsForDisplay = revealWords ? liveWords : [];
  const hasResults = wordsForDisplay.length > 0;
  const rawStyle = slide.design?.wordCloudStyleId;
  const isShowcase = rawStyle === "showcase";
  const isCompactStyle = rawStyle === "compact";
  /** undefined or legacy organic → scattered layout */
  const isOrganicStyle = rawStyle === undefined || rawStyle === "organic";

  const handleQuestionChange = (question: string) => {
    onUpdate?.({ ...content, question });
  };

  // Placeholder words for editor mode - shown clearly (not faded)
  const placeholderWords = [
    { text: 'creativity', count: 5 },
    { text: 'innovation', count: 4 },
    { text: 'ideas', count: 3 },
    { text: 'teamwork', count: 3 },
    { text: 'learning', count: 2 },
    { text: 'growth', count: 2 },
  ];

  // Use live words in presentation, placeholder in editor
  const displayWords = isEditing ? placeholderWords : wordsForDisplay;
  const maxCount = Math.max(...displayWords.map(w => w.count), 1);

  // Font size range: larger and more readable (compact: 18-48px, organic: 24-72px)
  const getFontSize = (ratio: number) => {
    if (isCompactStyle) {
      return Math.min(Math.max(18, 18 + ratio * 30), 48);
    }
    return Math.min(Math.max(24, 24 + ratio * 48), 72);
  };

  const sortedWords = [...displayWords].sort((a, b) => b.count - a.count);
  const topWord = sortedWords[0];
  const nextFour = sortedWords.slice(1, 5);
  const tailWords = sortedWords.slice(5);

  // Get text color from slide design
  const textColor = slide.design?.textColor || '#ffffff';

  return (
    <SlideWrapper slide={slide} themeId={themeId}>
      <div className="flex flex-col h-full min-h-0 overflow-hidden">
        {/* Header */}
        <QuestionHeader
          question={content.question}
          onEdit={handleQuestionChange}
          editable={isEditing}
          subtitle={isEditing ? "Word Cloud: Participants submit words" : undefined}
          textColor={textColor}
        />

        {/* Word Cloud Display - IDENTICAL layout for both modes */}
        <div className="flex-1 flex items-center justify-center px-4 md:px-8 pb-4 min-h-0 overflow-y-auto">
          <div className="w-full max-w-4xl">
            {isShowcase ? (
              <ShowcaseShell className="min-h-[280px] justify-center py-6 md:py-10">
                {sortedWords.length > 0 ? (
                  <div className="flex flex-col items-center gap-6 md:gap-8 text-center">
                    {topWord ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full px-2"
                      >
                        <div
                          className="text-4xl sm:text-5xl md:text-7xl font-semibold tracking-tight break-words leading-tight"
                          style={{
                            color: `hsl(var(--theme-accent))`,
                            fontFamily: "var(--theme-font-family-display), var(--theme-font-family)",
                          }}
                        >
                          {topWord.text}
                        </div>
                        {!isEditing && (
                          <div className="mt-2 text-sm tabular-nums text-[hsl(var(--theme-text-secondary))]">
                            ×{topWord.count}
                          </div>
                        )}
                      </motion.div>
                    ) : null}
                    {nextFour.length > 0 ? (
                      <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4 md:gap-6 w-full">
                        {nextFour.map((word, i) => {
                          const ratio =
                            maxCount > 0 ? (word.count - 1) / (maxCount - 1 || 1) : 0;
                          const fontSize = Math.min(
                            Math.max(20, 20 + ratio * 28),
                            44,
                          );
                          return (
                            <motion.span
                              key={`${word.text}-${i}`}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.06 + i * 0.05 }}
                              className="font-semibold text-[hsl(var(--theme-text-primary))]"
                              style={{ fontSize: `${fontSize}px` }}
                            >
                              {word.text}
                              {!isEditing ? (
                                <span className="text-[hsl(var(--theme-text-secondary))] text-sm ml-1 tabular-nums">
                                  ×{word.count}
                                </span>
                              ) : null}
                            </motion.span>
                          );
                        })}
                      </div>
                    ) : null}
                    {tailWords.length > 0 ? (
                      <div className="flex flex-wrap justify-center gap-2 max-w-3xl">
                        {tailWords.map((word, i) => (
                          <motion.div
                            key={`${word.text}-tail-${i}`}
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.15 + i * 0.02 }}
                          >
                            <ShowcaseChip>
                              {word.text}
                              {!isEditing ? (
                                <span className="ml-1.5 tabular-nums text-[hsl(var(--theme-text-secondary))]">
                                  ×{word.count}
                                </span>
                              ) : null}
                            </ShowcaseChip>
                          </motion.div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-center gap-4 min-h-[200px]">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <motion.div
                        key={i}
                        className="rounded-full bg-[hsl(var(--theme-text-primary)/0.08)]"
                        style={{
                          width: `${60 + (i % 3) * 20}px`,
                          height: `${30 + (i % 2) * 12}px`,
                        }}
                        animate={{ opacity: [0.15, 0.35, 0.15] }}
                        transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                      />
                    ))}
                  </div>
                )}
              </ShowcaseShell>
            ) : (
            /* Word cloud container – organic (scattered+rotate) or compact (rows, no rotate) */
            <motion.div
              className={`relative min-h-[280px] flex flex-wrap items-center justify-center content-center p-6 md:p-10 ${isCompactStyle ? 'gap-3 gap-y-4' : 'gap-4 md:gap-6 gap-y-5'}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {displayWords.length > 0 ? (
                displayWords
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 40)
                  .map((word, index) => {
                    const ratio = maxCount > 0 ? (word.count - 1) / (maxCount - 1 || 1) : 0;
                    const fontSize = getFontSize(ratio);
                    const hash = word.text.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0);
                    const color = WORD_COLORS[Math.abs(hash) % WORD_COLORS.length];
                    const rotation = isCompactStyle || !isOrganicStyle ? 0 : (Math.sin(index * 1.3) * 6) + (hash % 3 - 1) * 3;

                    return (
                      <motion.span
                        key={`${word.text}-${index}`}
                        className="font-bold inline-block"
                        style={{ 
                          fontSize: `${fontSize}px`, 
                          color,
                          transform: rotation ? `rotate(${rotation}deg)` : undefined,
                        }}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.04, duration: 0.35 }}
                        whileHover={{ scale: 1.08 }}
                      >
                        {word.text}
                        {!isEditing && word.count >= 1 && (
                          <motion.sup
                            className="opacity-70 ml-0.5"
                            style={{ fontSize: '0.45em', color }}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                          >
                            ×{word.count}
                          </motion.sup>
                        )}
                      </motion.span>
                    );
                  })
              ) : (
                /* Empty state placeholder circles */
                <div className="flex flex-wrap items-center justify-center gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="rounded-full bg-white/10"
                      style={{
                        width: `${60 + Math.random() * 60}px`,
                        height: `${30 + Math.random() * 20}px`,
                      }}
                      animate={{ opacity: [0.1, 0.2, 0.1] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </div>
              )}
            </motion.div>
            )}

            {/* Live response count badge */}
            {!isEditing && hasResults && (
              <div className="text-center mt-2">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={totalResponses}
                    initial={{ scale: 1.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-white/70 text-sm"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span className="font-semibold tabular-nums">{totalResponses}</span> response{totalResponses === 1 ? '' : 's'}
                  </motion.span>
                </AnimatePresence>
              </div>
            )}

            {/* Zero-state waiting indicator - only in presentation mode with no results */}
            {!isEditing && !hasResults && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
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
                  <span className="text-white/70 text-base font-medium">Waiting for words...</span>
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

            {/* Editor hint */}
            {isEditing && (
              <motion.p
                className="text-center text-white/60 mt-4 text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                Preview of how words will appear during the presentation
              </motion.p>
            )}
          </div>
        </div>

        {/* Footer - only in non-editing mode */}
        {!isEditing && !hideFooter && (
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
