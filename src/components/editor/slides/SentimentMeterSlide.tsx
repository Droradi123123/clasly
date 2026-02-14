import { motion, AnimatePresence } from "framer-motion";
import { Users } from "lucide-react";
import { SlideWrapper, QuestionHeader, ActivityFooter } from "./index";
import { Slide, SentimentMeterSlideContent } from "@/types/slides";
import { ThemeId } from "@/types/themes";
import { DesignStyleId, getDesignStyle } from "@/types/designStyles";

interface SentimentMeterSlideProps {
  slide: Slide;
  isEditing?: boolean;
  onUpdate?: (content: SentimentMeterSlideContent) => void;
  liveResults?: {
    average: number; // 0-100
    distribution: number[]; // buckets
    totalResponses: number;
  };
  totalResponses?: number;
  themeId?: ThemeId;
  designStyleId?: DesignStyleId;
  hideFooter?: boolean;
}

// Sentiment gradient colors
const SENTIMENT_COLORS = [
  '#ef4444', // red
  '#f97316', // orange  
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
];

function getSentimentColor(value: number): string {
  const index = Math.min(Math.floor((value / 100) * SENTIMENT_COLORS.length), SENTIMENT_COLORS.length - 1);
  return SENTIMENT_COLORS[index];
}

function getSentimentEmoji(value: number, left: string, right: string): string {
  const emojis = [left, '😕', '😐', '🙂', right];
  const index = Math.min(Math.floor((value / 100) * emojis.length), emojis.length - 1);
  return emojis[index];
}

export function SentimentMeterSlide({
  slide,
  isEditing = false,
  onUpdate,
  liveResults,
  totalResponses = 0,
  themeId = 'neon-cyber',
  designStyleId = 'dynamic',
  hideFooter = false,
}: SentimentMeterSlideProps) {
  const content = slide.content as SentimentMeterSlideContent;
  const designStyle = getDesignStyle(designStyleId);
  const styleConfig = designStyle.config;
  
  const hasResults = totalResponses > 0;
  const isMinimal = designStyleId === 'minimal';
  const textColor = slide.design?.textColor || '#ffffff';

  const leftEmoji = content.leftEmoji || '😡';
  const rightEmoji = content.rightEmoji || '😍';
  const average = liveResults?.average ?? 50;
  const distribution = liveResults?.distribution || Array(10).fill(0);
  const maxCount = Math.max(...distribution, 1);

  return (
    <SlideWrapper slide={slide} themeId={themeId}>
      <div className="flex flex-col h-full min-h-0 overflow-hidden">
        <QuestionHeader 
          question={content.question}
          onEdit={(q) => onUpdate?.({ ...content, question: q })}
          editable={isEditing}
          subtitle={isEditing ? "Continuous emotional scale" : undefined}
          textColor={textColor}
        />

        {/* Content area */}
        <div className="flex-1 flex items-center justify-center px-4 md:px-8 pb-4 overflow-hidden min-h-0">
          <div className="w-full max-w-2xl">
            {/* Emoji labels - editable */}
            <motion.div
              className="flex items-center justify-between mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {isEditing ? (
                <>
                  <div className="flex flex-col items-center gap-1">
                    <input
                      value={content.leftEmoji || '😡'}
                      onChange={(e) => onUpdate?.({ ...content, leftEmoji: e.target.value })}
                      className="w-16 text-center text-3xl bg-transparent border-0 outline-none"
                      maxLength={2}
                    />
                    <input
                      value={content.leftLabel || ''}
                      onChange={(e) => onUpdate?.({ ...content, leftLabel: e.target.value })}
                      placeholder="Label..."
                      className="px-2 py-1 rounded bg-white/10 text-white/70 text-xs text-center w-24 border border-white/20"
                    />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <input
                      value={content.rightEmoji || '😍'}
                      onChange={(e) => onUpdate?.({ ...content, rightEmoji: e.target.value })}
                      className="w-16 text-center text-3xl bg-transparent border-0 outline-none"
                      maxLength={2}
                    />
                    <input
                      value={content.rightLabel || ''}
                      onChange={(e) => onUpdate?.({ ...content, rightLabel: e.target.value })}
                      placeholder="Label..."
                      className="px-2 py-1 rounded bg-white/10 text-white/70 text-xs text-center w-24 border border-white/20"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-4xl md:text-5xl">{leftEmoji}</span>
                    {content.leftLabel && (
                      <span className="text-white/70 text-sm">{content.leftLabel}</span>
                    )}
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-4xl md:text-5xl">{rightEmoji}</span>
                    {content.rightLabel && (
                      <span className="text-white/70 text-sm">{content.rightLabel}</span>
                    )}
                  </div>
                </>
              )}
            </motion.div>

            {/* Main Meter */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative mb-6"
            >
              {/* Track */}
              <div className="h-14 md:h-16 rounded-2xl bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 relative overflow-hidden shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
                
                {/* Distribution overlay */}
                {hasResults && (
                  <div className="absolute inset-0 flex">
                    {distribution.map((count, i) => {
                      const height = (count / maxCount) * 100;
                      return (
                        <div key={i} className="flex-1 flex items-end">
                          <motion.div
                            className="w-full bg-white/30"
                            initial={{ height: 0 }}
                            animate={{ height: `${height}%` }}
                            transition={{ delay: i * 0.05, type: "spring" }}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Average Indicator */}
              <motion.div
                className="absolute top-0 bottom-0"
                style={{ left: `${hasResults ? average : 50}%` }}
                initial={{ left: '50%' }}
                animate={{ left: `${hasResults ? average : 50}%` }}
                transition={isMinimal 
                  ? { duration: 0.5 }
                  : { type: "spring", stiffness: 100, damping: 20 }
                }
              >
                {/* Vertical line */}
                <div className="absolute inset-y-0 w-1 bg-white -translate-x-1/2 shadow-lg" />
                
                {/* Top indicator with emoji */}
                <motion.div
                  className="absolute -top-14 left-1/2 -translate-x-1/2 flex flex-col items-center"
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                >
                  <span className="text-3xl mb-1">
                    {hasResults ? getSentimentEmoji(average, leftEmoji, rightEmoji) : '❓'}
                  </span>
                  {hasResults && (
                    <div className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm">
                      <span className="text-white font-bold text-sm">{Math.round(average)}%</span>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Response count or waiting */}
            {hasResults ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                  <Users className="w-4 h-4 text-white/70" />
                  <span className="text-white/90 font-medium">{totalResponses} responses</span>
                </div>
              </motion.div>
            ) : !isEditing ? (
              <motion.div
                animate={!isMinimal ? { opacity: [0.5, 1, 0.5] } : undefined}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-center"
              >
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                  <Users className="w-4 h-4 text-white/70" />
                  <span className="text-white/70 text-sm font-medium">Slide to share how you feel...</span>
                </div>
              </motion.div>
            ) : null}

            {/* Editor hint */}
            {isEditing && (
              <motion.p
                className="text-center text-white/50 mt-6 text-xs md:text-sm"
                animate={{ opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Participants will slide to express their sentiment
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
