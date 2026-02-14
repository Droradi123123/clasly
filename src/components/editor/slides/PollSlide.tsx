import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Users } from "lucide-react";
import { SlideWrapper, ActivityFooter } from "./index";
import { Slide, PollSlideContent } from "@/types/slides";
import { Button } from "@/components/ui/button";
import { ThemeId, getTheme } from "@/types/themes";
import {
  DesignStyleId,
  getDesignStyle,
  getAnimationVariants,
  getSpacingClasses,
  getShadowClasses,
} from "@/types/designStyles";
import { AutoResizeTextarea } from "@/components/ui/AutoResizeTextarea";
import { inferDirectionFromSlide } from "@/lib/textDirection";

interface PollSlideProps {
  slide: Slide;
  isEditing?: boolean;
  onUpdate?: (content: PollSlideContent) => void;
  showResults?: boolean;
  liveResults?: number[];
  totalResponses?: number;
  themeId?: ThemeId;
  designStyleId?: DesignStyleId;
  hideFooter?: boolean;
}

export function PollSlide({
  slide,
  isEditing = false,
  onUpdate,
  showResults = false,
  liveResults,
  totalResponses = 0,
  themeId = 'neon-cyber',
  designStyleId = 'dynamic',
  hideFooter = false,
}: PollSlideProps) {
  const content = slide.content as PollSlideContent;
  const theme = getTheme(themeId);
  const designStyle = getDesignStyle(designStyleId);
  const styleConfig = designStyle.config;
  const animations = getAnimationVariants(designStyle);

  // Use live results if provided, otherwise use zeros
  const results = liveResults || content.options.map(() => 0);
  const hasResults = totalResponses > 0;

  // Animation entrance config based on style
  const getEntranceAnimation = (index: number) => {
    const baseDelay = styleConfig.animationIntensity === 'high' ? 0.1 : 
                      styleConfig.animationIntensity === 'moderate' ? 0.07 : 0.03;
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

  const addOption = () => {
    if (content.options.length < 6) {
      onUpdate?.({ ...content, options: [...content.options, `Option ${content.options.length + 1}`] });
    }
  };

  const removeOption = (index: number) => {
    if (content.options.length > 2) {
      const newOptions = content.options.filter((_, i) => i !== index);
      onUpdate?.({ ...content, options: newOptions });
    }
  };

  // Get text color from slide design
  const textColor = slide.design?.textColor || "#ffffff";

  // Get text alignment from slide design
  const textAlign = slide.design?.textAlign || "center";

  // Determine text direction (explicit toggle wins)
  const direction = slide.design?.direction || inferDirectionFromSlide(slide);

  return (
    <SlideWrapper slide={slide} themeId={themeId}>
      <div className="flex flex-col h-full min-h-0 p-3 md:p-5" dir={direction}>
        {/* Clean Header */}
        <div className="flex-shrink-0 mb-3" style={{ textAlign }}>
          {/* Question */}
          {isEditing ? (
            <AutoResizeTextarea
              value={content.question}
              onChange={(e) => handleQuestionChange(e.target.value)}
              className="text-xl md:text-2xl font-semibold bg-transparent border-0 outline-none w-full placeholder:opacity-40"
              style={{ color: textColor, textAlign }}
              placeholder="What would you like to ask?"
              minRows={1}
            />
          ) : (
            <h2
              className="text-xl md:text-2xl font-semibold break-words"
              style={{ color: textColor, textAlign }}
            >
              {content.question}
            </h2>
          )}
        </div>

        {/* Options List - Stacked Label + Bar Style - More compact */}
        <div className="flex-1 flex flex-col gap-2 min-h-0 overflow-y-auto">
          {content.options.map((option, index) => {
            const count = results[index] || 0;
            const percentage = totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0;
            const maxPercentage = Math.max(...results.map((_, i) => totalResponses > 0 ? Math.round((results[i] / totalResponses) * 100) : 0), 1);
            const barWidth = totalResponses > 0 ? (percentage / maxPercentage) * 100 : (hasResults ? 0 : 25 + index * 15);
            const entranceAnim = getEntranceAnimation(index);
            
            // Progress bar colors
            const barColors = [
              'bg-[#F97066]', // Coral/salmon
              'bg-[#4ADE9F]', // Mint green  
              'bg-[#67D4E5]', // Light cyan
              'bg-[#9B87F5]', // Purple
              'bg-[#FACC15]', // Yellow
              'bg-[#F472B6]', // Pink
            ];

            return (
              <motion.div 
                key={index} 
                className="relative group"
                initial={entranceAnim.initial}
                animate={entranceAnim.animate}
                transition={entranceAnim.transition}
              >
                {/* Label row with percentage */}
                <div className="flex items-center justify-between mb-1">
                  {isEditing ? (
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <AutoResizeTextarea
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        className="bg-transparent font-medium outline-none text-sm md:text-base flex-1"
                        style={{ color: textColor, textAlign }}
                        placeholder={`Option ${index + 1}`}
                        minRows={1}
                      />
                      {content.options.length > 2 && (
                        <button
                          onClick={() => removeOption(index)}
                          className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-opacity"
                          title="Remove option"
                        >
                          <Trash2 className="w-3 h-3" style={{ color: textColor, opacity: 0.6 }} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="font-medium text-sm md:text-base" style={{ color: textColor }}>
                      {option}
                    </span>
                  )}
                  
                  {/* Percentage - only in presentation mode */}
                  {!isEditing && (
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={percentage}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-sm md:text-base font-bold"
                        style={{ color: textColor, marginInlineStart: '1rem' }}
                      >
                        {percentage}%
                      </motion.span>
                    </AnimatePresence>
                  )}
                </div>
                
                {/* Progress bar track - smaller height */}
                <div className="relative h-6 md:h-7 rounded-md bg-white/20 overflow-hidden">
                  {/* Filled bar - respect RTL direction */}
                  <motion.div
                    className={`absolute inset-y-0 rounded-md ${barColors[index % barColors.length]}`}
                    style={{ 
                      [direction === 'rtl' ? 'right' : 'left']: 0 
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${barWidth}%` }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 100, 
                      damping: 20,
                      delay: index * 0.05 
                    }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Add option button - only in editor */}
        {isEditing && content.options.length < 6 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 flex-shrink-0"
            style={{ textAlign }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={addOption}
              className="text-white/60 hover:text-white hover:bg-white/10 gap-2"
            >
              <Plus className="w-3 h-3" />
              Add option
            </Button>
          </motion.div>
        )}

        {/* Zero-state waiting indicator - only in presentation mode with no results */}
        {!isEditing && !hasResults && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-8 ${textAlign === 'center' ? 'text-center' : textAlign === 'right' ? 'text-right' : 'text-left'}`}
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
  );
}
