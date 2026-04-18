import { motion, AnimatePresence } from "framer-motion";
import { Users } from "lucide-react";
import { SlideWrapper, QuestionHeader, ActivityFooter } from "./index";
import { Slide, AgreeSpectrumSlideContent } from "@/types/slides";
import { ThemeId } from "@/types/themes";
import { DesignStyleId, getDesignStyle } from "@/types/designStyles";
import {
  ShowcaseShell,
  ShowcaseTitle,
} from "@/components/editor/slides/showcase/ShowcasePrimitives";

interface AgreeSpectrumSlideProps {
  slide: Slide;
  isEditing?: boolean;
  onUpdate?: (content: AgreeSpectrumSlideContent) => void;
  liveResults?: {
    positions: number[]; // Array of positions (0-100)
    average: number;
    clusters: { position: number; count: number }[];
  };
  totalResponses?: number;
  themeId?: ThemeId;
  designStyleId?: DesignStyleId;
  hideFooter?: boolean;
  showResults?: boolean;
}

// Spectrum colors
const SPECTRUM_COLORS = {
  disagree: '#ef4444',
  neutral: '#a3a3a3', 
  agree: '#22c55e',
};

export function AgreeSpectrumSlide({
  slide,
  isEditing = false,
  onUpdate,
  liveResults,
  totalResponses = 0,
  themeId = 'academic-pro',
  designStyleId = 'dynamic',
  hideFooter = false,
  showResults = true,
}: AgreeSpectrumSlideProps) {
  const rawContent = slide.content as AgreeSpectrumSlideContent;
  const content = {
    ...rawContent,
    statement: rawContent?.statement ?? '',
    leftLabel: rawContent?.leftLabel ?? 'Strongly Disagree',
    rightLabel: rawContent?.rightLabel ?? 'Strongly Agree',
  };
  const designStyle = getDesignStyle(designStyleId);
  const styleConfig = designStyle.config;
  
  const hasResults = totalResponses > 0;
  const revealStats = isEditing || showResults;
  const agg = revealStats && hasResults;
  const isMinimal = designStyleId === 'minimal';
  const isCompact = designStyleId === 'compact';
  const isShowcase = slide.design?.agreeSpectrumVariant === "showcase";
  const isSteps = slide.design?.agreeSpectrumVariant === 'steps';
  const textColor = slide.design?.textColor || '#ffffff';

  const leftLabel = content.leftLabel;
  const rightLabel = content.rightLabel;
  const stepLabels = [leftLabel, 'Disagree', 'Neutral', 'Agree', rightLabel];
  
  // Use clusters for visualization or individual dots
  const positions = liveResults?.positions || [];
  const average = liveResults?.average ?? 50;

  // Group positions into buckets for visualization
  const buckets = Array(20).fill(0);
  positions.forEach(pos => {
    const bucketIndex = Math.min(Math.floor(pos / 5), 19);
    buckets[bucketIndex]++;
  });
  const maxBucket = Math.max(...buckets, 1);

  const stepBuckets = isSteps && agg
    ? [0, 1, 2, 3, 4].map((i) => {
        const low = i * 4;
        const high = (i + 1) * 4;
        return buckets.slice(low, high).reduce((a, b) => a + b, 0);
      })
    : [];
  const maxStepCount = Math.max(...stepBuckets, 1);

  return (
    <SlideWrapper slide={slide} themeId={themeId}>
      <div className="flex flex-col h-full min-h-0 overflow-hidden">
        {/* Statement as main question (Showcase variant renders statement inside content) */}
        {!isShowcase && (
        <div className="px-6 md:px-10 py-3 md:py-4 text-center">
          {isEditing ? (
            <textarea
              value={content.statement}
              onChange={(e) => onUpdate?.({ ...content, statement: e.target.value })}
              className="text-xl md:text-2xl font-bold bg-transparent border-0 outline-none text-center w-full resize-none placeholder:opacity-50"
              style={{ color: textColor }}
              placeholder="Enter statement..."
              rows={2}
            />
          ) : (
            <h2 
              className="text-xl md:text-2xl font-bold"
              style={{ color: textColor }}
            >
              "{content.statement}"
            </h2>
          )}
        </div>
        )}

        {/* Content area */}
        <div className="flex-1 flex items-center justify-center px-4 md:px-8 pb-4 overflow-hidden min-h-0">
          <div className="w-full max-w-3xl">
            {isShowcase ? (
            <ShowcaseShell className="max-w-3xl w-full space-y-8 py-2">
              {isEditing ? (
                <textarea
                  value={content.statement}
                  onChange={(e) => onUpdate?.({ ...content, statement: e.target.value })}
                  className="w-full rounded-3xl border border-white/10 bg-[hsl(var(--theme-surface)/0.35)] px-4 py-3 text-center text-lg md:text-2xl font-semibold text-[hsl(var(--theme-text-primary))] outline-none placeholder:opacity-40"
                  placeholder="Enter statement..."
                  rows={3}
                />
              ) : (
                <ShowcaseTitle className="text-center !text-2xl md:!text-4xl font-semibold">
                  &ldquo;{content.statement}&rdquo;
                </ShowcaseTitle>
              )}
              <div className="w-full px-1 md:px-2">
                <div className="mb-2 flex justify-between text-xs md:text-sm text-[hsl(var(--theme-text-secondary))]">
                  <span>{leftLabel}</span>
                  <span>{rightLabel}</span>
                </div>
                <div className="relative h-24 md:h-28 overflow-hidden rounded-3xl border border-white/10 bg-[hsl(var(--theme-text-primary)/0.05)]">
                  {agg && (
                    <div className="absolute inset-0 flex items-end px-1">
                      {buckets.map((count, i) => {
                        const h = maxBucket > 0 ? (count / maxBucket) * 85 : 0;
                        return (
                          <motion.div
                            key={i}
                            className="flex-1 mx-px rounded-t-md bg-[hsl(var(--theme-accent)/0.22)]"
                            initial={{ height: 0 }}
                            animate={{ height: `${h}%` }}
                            transition={{ type: "spring", stiffness: 100, damping: 22 }}
                          />
                        );
                      })}
                    </div>
                  )}
                  {agg && (
                    <motion.div
                      className="absolute top-1/2 z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[hsl(var(--theme-accent))] bg-[hsl(var(--theme-bg))] shadow-lg"
                      initial={false}
                      animate={{ left: `${average}%` }}
                      transition={{ type: "spring", stiffness: 120, damping: 20 }}
                    />
                  )}
                </div>
                {agg && (
                  <p className="mt-3 text-center text-sm tabular-nums text-[hsl(var(--theme-text-secondary))]">
                    Average {Math.round(average)}% · {totalResponses} response
                    {totalResponses === 1 ? "" : "s"}
                  </p>
                )}
              </div>
              {!agg && !isEditing && (
                <div className="flex justify-center pt-2">
                  <div className="inline-flex items-center gap-2 rounded-3xl border border-white/10 bg-[hsl(var(--theme-surface)/0.4)] px-4 py-2 text-sm text-[hsl(var(--theme-text-secondary))]">
                    <Users className="w-4 h-4" />
                    <span>Waiting for positions…</span>
                  </div>
                </div>
              )}
            </ShowcaseShell>
            ) : isSteps ? (
            /* steps: 5 discrete buttons */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-between">
                {stepLabels.map((label, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex flex-col items-center gap-2 flex-1 min-w-0"
                  >
                    <div
                      className={`w-full py-3 px-2 rounded-xl text-center text-sm font-medium border-2 cursor-default ${
                        i === 0 ? 'bg-red-500/20 border-red-500/40' :
                        i === 4 ? 'bg-green-500/20 border-green-500/40' :
                        'bg-white/10 border-white/20'
                      }`}
                      style={{ color: textColor }}
                    >
                      {isEditing && (i === 0 || i === 4) ? (
                        <input
                          value={i === 0 ? leftLabel : rightLabel}
                          onChange={(e) => onUpdate?.({ ...content, ...(i === 0 ? { leftLabel: e.target.value } : { rightLabel: e.target.value }) })}
                          className="bg-transparent outline-none w-full text-center text-sm"
                          style={{ color: textColor }}
                        />
                      ) : label}
                    </div>
                    {agg && (
                      <motion.div
                        className="w-full bg-white/30 rounded max-h-12 min-h-[4px]"
                        initial={{ height: 0 }}
                        animate={{ height: `${(stepBuckets[i] / maxStepCount) * 100}%` }}
                        transition={{ type: 'spring', stiffness: 150 }}
                      />
                    )}
                    {agg && <span className="text-white/70 text-xs">{stepBuckets[i]}</span>}
                  </motion.div>
                ))}
              </div>
              {agg && (
                <div className="text-center text-white/80 text-sm">Average: {Math.round(average)}%</div>
              )}
              {!agg && (
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white/70 text-sm">
                    <Users className="w-4 h-4" />
                    <span>Tap a level – waiting for responses...</span>
                  </div>
                </div>
              )}
            </div>
            ) : (
            <>
            {/* Labels - editable */}
            <motion.div
              className="flex items-end justify-between mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {isEditing ? (
                <>
                  <input
                    value={content.leftLabel || ''}
                    onChange={(e) => onUpdate?.({ ...content, leftLabel: e.target.value })}
                    placeholder="Strongly Disagree"
                    className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 placeholder:text-red-400/50 text-sm font-medium border border-red-500/30 w-40"
                  />
                  <input
                    value={content.rightLabel || ''}
                    onChange={(e) => onUpdate?.({ ...content, rightLabel: e.target.value })}
                    placeholder="Strongly Agree"
                    className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-300 placeholder:text-green-400/50 text-sm font-medium border border-green-500/30 w-40 text-right"
                  />
                </>
              ) : (
                <>
                  <span className="text-red-400 text-sm font-medium">{leftLabel}</span>
                  <span className="text-green-400 text-sm font-medium">{rightLabel}</span>
                </>
              )}
            </motion.div>

            {/* Main Spectrum */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative mb-6"
            >
              {/* Track */}
              <div className={`rounded-2xl bg-gradient-to-r from-red-500/20 via-neutral-500/20 to-green-500/20 border-2 border-white/20 relative overflow-hidden ${isCompact ? 'h-14 md:h-16' : 'h-20 md:h-24'}`}>
                {/* Distribution bars */}
                {agg && (
                  <div className="absolute inset-0 flex items-end px-1">
                    {buckets.map((count, i) => {
                      const height = (count / maxBucket) * 80;
                      const position = (i / buckets.length) * 100;
                      // Color based on position
                      const hue = 120 * (position / 100); // 0 (red) to 120 (green)
                      
                      return (
                        <motion.div
                          key={i}
                          className="flex-1 mx-px"
                          initial={{ height: 0 }}
                          animate={{ height: `${height}%` }}
                          transition={{ delay: i * 0.02, type: "spring", stiffness: 100 }}
                          style={{ 
                            backgroundColor: `hsl(${hue}, 70%, 50%)`,
                            opacity: 0.6,
                            borderRadius: '4px 4px 0 0',
                          }}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Individual dot markers for positions */}
                {agg && positions.slice(0, 30).map((pos, i) => (
                  <motion.div
                    key={i}
                    className="absolute top-1/2 w-3 h-3 rounded-full border-2 border-white shadow-lg"
                    style={{ 
                      left: `${pos}%`,
                      transform: 'translate(-50%, -50%)',
                      backgroundColor: `hsl(${(pos / 100) * 120}, 70%, 50%)`,
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 0.8 }}
                    transition={{ delay: i * 0.03 }}
                  />
                ))}

                {/* Center line */}
                <div className="absolute inset-y-0 left-1/2 w-px bg-white/30" />
              </div>

              {/* Average indicator */}
              {agg && (
                <motion.div
                  className="absolute -bottom-8"
                  style={{ left: `${average}%` }}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex flex-col items-center -translate-x-1/2">
                    <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-transparent border-b-white" />
                    <div className="px-2 py-1 rounded bg-white text-black text-xs font-bold">
                      AVG: {Math.round(average)}%
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* Stats */}
                {agg && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-6 mt-12"
              >
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">
                    {Math.round((positions.filter(p => p < 40).length / positions.length) * 100) || 0}%
                  </div>
                  <div className="text-white/60 text-sm">Disagree</div>
                </div>
                <div className="w-px h-10 bg-white/20" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-white/80">
                    {Math.round((positions.filter(p => p >= 40 && p <= 60).length / positions.length) * 100) || 0}%
                  </div>
                  <div className="text-white/60 text-sm">Neutral</div>
                </div>
                <div className="w-px h-10 bg-white/20" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {Math.round((positions.filter(p => p > 60).length / positions.length) * 100) || 0}%
                  </div>
                  <div className="text-white/60 text-sm">Agree</div>
                </div>
              </motion.div>
            )}

            {/* Zero state */}
            {!isEditing && !agg && (
              <motion.div
                animate={!isMinimal ? { opacity: isCompact ? [0.6, 0.9, 0.6] : [0.5, 1, 0.5] } : undefined}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-center mt-8"
              >
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                  <Users className="w-4 h-4 text-white/70" />
                  <span className="text-white/70 text-sm font-medium">Slide to share your position...</span>
                </div>
              </motion.div>
            )}

            {/* Editor hint - only when not steps */}
            {isEditing && !isSteps && (
              <motion.p
                className="text-center text-white/50 mt-6 text-xs md:text-sm"
                animate={{ opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Participants position themselves on the spectrum
              </motion.p>
            )}
            </>
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
