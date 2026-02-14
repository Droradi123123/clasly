import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users } from "lucide-react";
import { SlideWrapper, QuestionHeader, ActivityFooter } from "./index";
import { Slide, WordCloudSlideContent } from "@/types/slides";
import { ThemeId } from "@/types/themes";

interface WordCloudSlideProps {
  slide: Slide;
  isEditing?: boolean;
  onUpdate?: (content: WordCloudSlideContent) => void;
  liveWords?: { text: string; count: number }[];
  totalResponses?: number;
  themeId?: ThemeId;
  hideFooter?: boolean;
}

// Color palette for words
const WORD_COLORS = [
  'text-pink-300',
  'text-purple-300',
  'text-indigo-300',
  'text-blue-300',
  'text-cyan-300',
  'text-emerald-300',
  'text-amber-300',
  'text-rose-300',
];

export function WordCloudSlide({
  slide,
  isEditing = false,
  onUpdate,
  liveWords = [],
  totalResponses = 0,
  themeId = 'neon-cyber',
  hideFooter = false,
}: WordCloudSlideProps) {
  const content = slide.content as WordCloudSlideContent;
  const hasResults = liveWords.length > 0;

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
  const displayWords = isEditing ? placeholderWords : liveWords;
  const maxCount = Math.max(...displayWords.map(w => w.count), 1);

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
            {/* Word cloud container */}
            <motion.div
              className="relative min-h-[300px] flex flex-wrap items-center justify-center gap-4 p-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {displayWords.length > 0 ? (
                displayWords.map((word, index) => {
                  const sizeScale = 0.8 + (word.count / maxCount) * 1.2;
                  const fontSize = Math.min(Math.max(18, 28 * sizeScale), 64);
                  const colorClass = WORD_COLORS[index % WORD_COLORS.length];

                  return (
                    <motion.span
                      key={`${word.text}-${index}`}
                      className={`font-bold ${colorClass}`}
                      style={{ fontSize: `${fontSize}px` }}
                      initial={{ opacity: 0, scale: 0, rotate: -10 }}
                      animate={{ 
                        opacity: 1, 
                        scale: 1, 
                        rotate: 0,
                      }}
                      transition={{ 
                        delay: index * 0.05,
                        duration: 0.3,
                      }}
                      whileHover={{ scale: 1.1 }}
                    >
                      {word.text}
                      {!isEditing && word.count > 1 && (
                        <motion.sup
                          className="text-white/50 ml-1"
                          style={{ fontSize: '0.5em' }}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                        >
                          {word.count}
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
