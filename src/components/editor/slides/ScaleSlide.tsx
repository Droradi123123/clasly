import { motion, AnimatePresence } from "framer-motion";
import { Users } from "lucide-react";
import { SlideWrapper, QuestionHeader, ActivityFooter } from "./index";
import { Slide, ScaleSlideContent } from "@/types/slides";
import { ThemeId, getTheme } from "@/types/themes";
import { DesignStyleId, getDesignStyle } from "@/types/designStyles";

interface ScaleSlideProps {
  slide: Slide;
  isEditing?: boolean;
  onUpdate?: (content: ScaleSlideContent) => void;
  liveResults?: { average: number; distribution: number[] };
  totalResponses?: number;
  themeId?: ThemeId;
  designStyleId?: DesignStyleId;
  hideFooter?: boolean;
}

// Color gradient for scale values
const SCALE_COLORS = [
  'from-red-500 to-red-400',
  'from-orange-500 to-orange-400',
  'from-amber-500 to-yellow-400',
  'from-lime-500 to-green-400',
  'from-emerald-500 to-teal-400',
];

export function ScaleSlide({ 
  slide, 
  isEditing = false, 
  onUpdate,
  liveResults,
  totalResponses = 0,
  themeId = 'neon-cyber',
  designStyleId = 'dynamic',
  hideFooter = false,
}: ScaleSlideProps) {
  const content = slide.content as ScaleSlideContent;
  const theme = getTheme(themeId);
  const designStyle = getDesignStyle(designStyleId);
  const styleConfig = designStyle.config;
  const steps = content.scaleOptions?.steps || 5;

  // Use live results if provided, otherwise use empty
  const results = liveResults || { average: 0, distribution: Array(steps).fill(0) };
  const hasResults = totalResponses > 0;
  const maxCount = Math.max(...(results.distribution || []), 1);

  const isMinimal = designStyleId === 'minimal';

  // Calculate meter position (0-100%)
  const meterPosition = hasResults ? ((results.average - 1) / (steps - 1)) * 100 : 50;

  // Get text color from slide design
  const textColor = slide.design?.textColor || '#ffffff';

  return (
    <SlideWrapper slide={slide} themeId={themeId}>
      <div className="flex flex-col h-full min-h-0">
        <QuestionHeader
          question={content.question}
          onEdit={(q) => onUpdate?.({ ...content, question: q })}
          editable={isEditing}
          subtitle={isEditing ? `Scale: Rate from 1 to ${steps}` : undefined}
          textColor={textColor}
        />

        {/* Content area */}
        <div className="flex-1 flex items-center justify-center px-4 md:px-8 pb-4 min-h-0 overflow-y-auto">
          <div className="w-full max-w-2xl">
            {/* Scale labels - editable only in editor */}
            <motion.div
              className="flex items-center justify-between mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {isEditing ? (
                <>
                  <input 
                    value={content.scaleOptions?.minLabel || ""} 
                    onChange={(e) => onUpdate?.({ 
                      ...content, 
                      scaleOptions: { 
                        ...content.scaleOptions, 
                        minLabel: e.target.value, 
                        maxLabel: content.scaleOptions?.maxLabel || "", 
                        steps 
                      } 
                    })} 
                    placeholder="Min label" 
                    className="px-3 py-1.5 rounded-lg bg-white/10 text-white/80 placeholder:text-white/30 text-sm border border-white/20 w-28 text-center" 
                  />
                  <input 
                    value={content.scaleOptions?.maxLabel || ""} 
                    onChange={(e) => onUpdate?.({ 
                      ...content, 
                      scaleOptions: { 
                        ...content.scaleOptions, 
                        maxLabel: e.target.value, 
                        minLabel: content.scaleOptions?.minLabel || "", 
                        steps 
                      } 
                    })} 
                    placeholder="Max label" 
                    className="px-3 py-1.5 rounded-lg bg-white/10 text-white/80 placeholder:text-white/30 text-sm border border-white/20 w-28 text-center" 
                  />
                </>
              ) : (
                <>
                  <span className="text-white/70 text-sm font-medium px-3 py-1 rounded-lg bg-white/10">
                    {content.scaleOptions?.minLabel || '1'}
                  </span>
                  <span className="text-white/70 text-sm font-medium px-3 py-1 rounded-lg bg-white/10">
                    {content.scaleOptions?.maxLabel || steps.toString()}
                  </span>
                </>
              )}
            </motion.div>

            {/* Gauge/Meter Style Display */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative mb-6"
            >
              {/* Meter Track */}
              <div className="relative h-12 md:h-16 rounded-2xl bg-gradient-to-r from-red-500/30 via-amber-500/30 to-emerald-500/30 border-2 border-white/20 overflow-hidden">
                {/* Gradient fill based on average */}
                {hasResults && (
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${meterPosition}%` }}
                    transition={isMinimal 
                      ? { duration: 0.5, ease: "easeOut" }
                      : { type: "spring", stiffness: 100, damping: 20 }
                    }
                    style={{ opacity: 0.7 }}
                  />
                )}
                
                {/* Meter needle/indicator */}
                <motion.div
                  className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
                  initial={{ left: '50%' }}
                  animate={{ left: `${hasResults ? meterPosition : 50}%` }}
                  transition={isMinimal 
                    ? { duration: 0.5, ease: "easeOut" }
                    : { type: "spring", stiffness: 100, damping: 20 }
                  }
                >
                  {/* Needle head */}
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full shadow-lg" />
                </motion.div>

                {/* Scale markers */}
                <div className="absolute inset-0 flex justify-between px-2 items-center">
                  {Array.from({ length: steps }, (_, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <span className="text-white/80 font-bold text-sm md:text-base">{i + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Distribution bars - show vote counts per value */}
            <div className="flex justify-between gap-1 md:gap-2 mb-4">
              {Array.from({ length: steps }, (_, i) => i + 1).map((value, index) => {
                const count = results.distribution?.[index] || 0;
                const heightPercent = hasResults ? Math.max((count / maxCount) * 100, 5) : 10;
                const colorIndex = Math.floor((index / (steps - 1)) * (SCALE_COLORS.length - 1));

                return (
                  <motion.div
                    key={value}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex-1 flex flex-col items-center"
                  >
                    {/* Count */}
                    {!isEditing && styleConfig.showCounts && (
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={count}
                          initial={styleConfig.showAnimatedNumbers ? { scale: 1.5, opacity: 0 } : { opacity: 1 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="text-white/80 font-bold text-xs md:text-sm mb-1"
                        >
                          {hasResults ? count : ''}
                        </motion.span>
                      </AnimatePresence>
                    )}
                    
                    {/* Bar */}
                    <div className="w-full h-16 md:h-20 rounded-lg bg-white/10 relative overflow-hidden">
                      <motion.div
                        className={`absolute bottom-0 left-0 right-0 rounded-lg bg-gradient-to-t ${SCALE_COLORS[colorIndex]}`}
                        initial={{ height: 0 }}
                        animate={{ height: `${heightPercent}%` }}
                        transition={isMinimal 
                          ? { duration: 0.5, ease: "easeOut" }
                          : { type: "spring", stiffness: 100, damping: 20 }
                        }
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Average indicator */}
            {!isEditing && hasResults && results.average > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <div className="inline-flex items-center gap-3 px-5 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                  <span className="text-white/70 text-sm">Average:</span>
                  <span className="text-2xl md:text-3xl font-bold text-white">{results.average.toFixed(1)}</span>
                </div>
              </motion.div>
            )}

            {/* Zero-state waiting indicator */}
            {!isEditing && !hasResults && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <motion.div
                  animate={!isMinimal ? { 
                    scale: [1, 1.03, 1],
                    opacity: [0.6, 1, 0.6],
                  } : undefined}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20"
                >
                  <Users className="w-4 h-4 text-white/70" />
                  <span className="text-white/70 text-sm font-medium">Waiting for ratings...</span>
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

            {/* Editor hint */}
            {isEditing && (
              <motion.p
                className="text-center text-white/50 mt-4 text-xs md:text-sm"
                animate={{ opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Live ratings will appear as a meter during the presentation
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