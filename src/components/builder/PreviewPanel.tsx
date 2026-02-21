import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, Eye } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useConversationalBuilder } from '@/hooks/useConversationalBuilder';
import { SlideRenderer } from '@/components/editor/SlideRenderer';
import { BuilderPreviewProvider } from '@/contexts/BuilderPreviewContext';

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
  
  if (isInitialLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-primary/[0.04] to-transparent min-h-0">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-md px-8"
        >
          <div className="relative inline-flex mb-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center"
            >
              <Loader2 className="w-10 h-10 text-primary" />
            </motion.div>
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute -inset-1 rounded-2xl border-2 border-primary/20"
            />
          </div>
          <h2 className="text-xl font-display font-bold text-foreground mb-2">
            Building your interactive presentation
          </h2>
          <p className="text-muted-foreground mb-2">
            Based on your instructions:
          </p>
          {initialPrompt && (
            <p className="text-sm text-foreground/80 bg-muted/50 rounded-lg px-4 py-3 mb-4 text-left max-h-24 overflow-y-auto">
              &ldquo;{initialPrompt}&rdquo;
            </p>
          )}
          <p className="text-muted-foreground text-sm">
            AI is creating slides, quizzes, and engagement elements. Almost there...
          </p>
          <div className="flex justify-center gap-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                className="w-2 h-2 rounded-full bg-primary/60"
              />
            ))}
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
