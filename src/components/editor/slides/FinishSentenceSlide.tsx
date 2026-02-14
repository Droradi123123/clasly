import { motion, AnimatePresence } from "framer-motion";
import { Users, Sparkles } from "lucide-react";
import { SlideWrapper, QuestionHeader, ActivityFooter } from "./index";
import { Slide, FinishSentenceSlideContent } from "@/types/slides";
import { ThemeId } from "@/types/themes";
import { DesignStyleId, getDesignStyle } from "@/types/designStyles";

interface FinishSentenceSlideProps {
  slide: Slide;
  isEditing?: boolean;
  onUpdate?: (content: FinishSentenceSlideContent) => void;
  liveResults?: {
    responses: Array<{ text: string; count: number }>;
    clusters: Array<{ theme: string; keywords: string[]; count: number }>;
  };
  totalResponses?: number;
  themeId?: ThemeId;
  designStyleId?: DesignStyleId;
  hideFooter?: boolean;
}

// AI-themed colors for clusters
const CLUSTER_COLORS = [
  'from-violet-500 to-purple-500',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
];

export function FinishSentenceSlide({
  slide,
  isEditing = false,
  onUpdate,
  liveResults,
  totalResponses = 0,
  themeId = 'neon-cyber',
  designStyleId = 'dynamic',
  hideFooter = false,
}: FinishSentenceSlideProps) {
  const content = slide.content as FinishSentenceSlideContent;
  const designStyle = getDesignStyle(designStyleId);
  const styleConfig = designStyle.config;
  
  const hasResults = totalResponses > 0;
  const isMinimal = designStyleId === 'minimal';
  const textColor = slide.design?.textColor || '#ffffff';

  // Mock clusters for zero state / preview
  const clusters = liveResults?.clusters || [];

  return (
    <SlideWrapper slide={slide} themeId={themeId}>
      <div className="flex flex-col h-full min-h-0 overflow-hidden">
        <QuestionHeader 
          question={content.sentenceStart}
          onEdit={(q) => onUpdate?.({ ...content, sentenceStart: q })}
          editable={isEditing}
          subtitle={isEditing ? "AI groups similar responses automatically" : undefined}
          textColor={textColor}
        />

        {/* AI Badge */}
        <div className="flex justify-center mb-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-500/20 to-purple-500/20 border border-violet-500/30"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-xs font-medium text-violet-300">AI-Powered Grouping</span>
          </motion.div>
        </div>

        {/* Content area */}
        <div className="flex-1 flex items-center justify-center px-4 md:px-8 pb-4 overflow-hidden min-h-0">
          <div className="w-full max-w-3xl">
            {/* Clusters Display */}
            {hasResults && clusters.length > 0 ? (
              <div className="space-y-4">
                {clusters.map((cluster, index) => (
                  <motion.div
                    key={cluster.theme}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ 
                      delay: index * 0.1,
                      type: isMinimal ? "tween" : "spring",
                      stiffness: 100 
                    }}
                    className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${CLUSTER_COLORS[index % CLUSTER_COLORS.length]} p-[2px]`}
                  >
                    <div className="bg-black/60 backdrop-blur-sm rounded-[14px] p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-white font-bold text-lg">{cluster.theme}</h3>
                        <span className="text-white/70 text-sm font-medium">{cluster.count} responses</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {cluster.keywords.map((keyword, ki) => (
                          <motion.span
                            key={keyword}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 + ki * 0.05 }}
                            className="px-3 py-1 rounded-full bg-white/10 text-white/90 text-sm"
                          >
                            {keyword}
                          </motion.span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              /* Zero State - Animated Cards Preview */
              <div className="space-y-4">
                {/* Placeholder cards */}
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.3 }}
                    transition={{ delay: i * 0.2 }}
                    className={`rounded-2xl bg-gradient-to-r ${CLUSTER_COLORS[i]} p-[2px]`}
                  >
                    <div className="bg-black/60 backdrop-blur-sm rounded-[14px] p-4 h-20">
                      <div className="h-4 w-32 rounded bg-white/10 mb-2" />
                      <div className="flex gap-2">
                        <div className="h-6 w-16 rounded-full bg-white/10" />
                        <div className="h-6 w-20 rounded-full bg-white/10" />
                        <div className="h-6 w-14 rounded-full bg-white/10" />
                      </div>
                    </div>
                  </motion.div>
                ))}
                
                {/* Waiting indicator */}
                <motion.div
                  animate={!isMinimal ? { opacity: [0.5, 1, 0.5] } : undefined}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-center mt-6"
                >
                  <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                    <Users className="w-4 h-4 text-white/70" />
                    <span className="text-white/70 text-sm font-medium">Waiting for responses...</span>
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
                  </div>
                </motion.div>
              </div>
            )}

            {/* Editor hint */}
            {isEditing && (
              <motion.p
                className="text-center text-white/50 mt-6 text-xs md:text-sm"
                animate={{ opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                AI will group similar responses into themes automatically
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
