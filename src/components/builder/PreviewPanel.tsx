import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Eye } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useConversationalBuilder } from '@/hooks/useConversationalBuilder';
import { SlideRenderer } from '@/components/editor/SlideRenderer';
import { BuilderPreviewProvider } from '@/contexts/BuilderPreviewContext';

const BUILDER_TIPS = [
  'Students join with a QR code—no app download needed.',
  'Add quizzes and polls to boost engagement during your lecture.',
  'Use Student View to see exactly what your audience sees on their phones.',
  'Change slide themes anytime—each presentation can have its own style.',
  'AI can refine your slides—describe changes in the chat to apply them instantly.',
  'Export your presentation to images or PDF when you\'re done.',
];

interface PreviewPanelProps {
  isInitialLoading?: boolean;
  initialPrompt?: string;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ isInitialLoading, initialPrompt }) => {
  const {
    sandboxSlides,
    currentPreviewIndex,
    setCurrentPreviewIndex,
    isGenerating,
  } = useConversationalBuilder();

  const [tipIndex, setTipIndex] = useState(0);
  useEffect(() => {
    if (!isInitialLoading) return;
    const t = setInterval(() => {
      setTipIndex((i) => (i + 1) % BUILDER_TIPS.length);
    }, 4500);
    return () => clearInterval(t);
  }, [isInitialLoading]);

  if (isInitialLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center justify-center text-center max-w-sm"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-5"
          >
            <Loader2 className="w-7 h-7 text-primary" />
          </motion.div>
          <p className="text-sm text-muted-foreground mb-1">Building your presentation</p>
          {initialPrompt && (
            <p className="text-xs text-foreground/70 bg-muted/40 rounded-lg px-3 py-2 mb-5 text-left max-h-16 overflow-y-auto line-clamp-2">
              &ldquo;{initialPrompt}&rdquo;
            </p>
          )}
          <div className="h-10 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={tipIndex}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.3 }}
                className="text-xs text-muted-foreground/90 italic"
              >
                {BUILDER_TIPS[tipIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    );
  }
  
  if (sandboxSlides.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center text-muted-foreground">
          <Eye className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg">No slides yet</p>
          <p className="text-sm mt-2">Enter a topic to generate your presentation</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex-1 flex flex-col bg-muted/10 h-full overflow-hidden">
      {/* Top bar with slide counter */}
      <div className="shrink-0 p-4 border-b border-border bg-background flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Previewing {sandboxSlides.length} slides
          </span>
          {isGenerating && (
            <div className="flex items-center gap-1 text-primary">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="text-xs">Updating...</span>
            </div>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          Click a slide to select • Scroll to see all
        </span>
      </div>
      
      {/* Scrollable slides grid - all slides visible */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {sandboxSlides.map((slide, index) => (
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => setCurrentPreviewIndex(index)}
              className={`cursor-pointer transition-all ${
                index === currentPreviewIndex
                  ? 'ring-4 ring-primary ring-offset-2 ring-offset-background'
                  : 'hover:ring-2 hover:ring-primary/30 hover:ring-offset-2 hover:ring-offset-background'
              }`}
            >
              {/* Slide number badge */}
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  index === currentPreviewIndex
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  Slide {index + 1}
                </span>
                <span className="text-xs text-muted-foreground">
                  {slide.type.replace('_', ' ')}
                </span>
                {index === currentPreviewIndex && (
                  <span className="text-xs text-primary font-medium">
                    ← Currently selected
                  </span>
                )}
              </div>
              
              {/* Full-size slide preview - scrollable when content overflows */}
              <div className="w-full aspect-video rounded-xl overflow-hidden shadow-lg border border-border min-h-0 flex flex-col">
                <BuilderPreviewProvider allowContentScroll>
                  <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
                    <SlideRenderer
                      slide={slide}
                      isEditing={false}
                      showCorrectAnswer
                    />
                  </div>
                </BuilderPreviewProvider>
              </div>
              
              {/* Slide title/question preview */}
              <p className="mt-2 text-sm text-muted-foreground truncate">
                {(slide.content as any).title || (slide.content as any).question || (slide.content as any).statement || ''}
              </p>
            </motion.div>
          ))}
          
          {/* Bottom padding for scroll */}
          <div className="h-4" />
        </div>
      </ScrollArea>
    </div>
  );
};

export default PreviewPanel;
