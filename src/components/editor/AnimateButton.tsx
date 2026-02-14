import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Sparkles, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slide, SlideType, QuizSlideContent, PollSlideContent, YesNoSlideContent, ScaleSlideContent, GuessNumberSlideContent, WordCloudSlideContent, RankingSlideContent, SentimentMeterSlideContent, AgreeSpectrumSlideContent, FinishSentenceSlideContent } from '@/types/slides';
import { useSimulation } from '@/hooks/useSimulation';
import {
  simulateQuizResponses,
  simulatePollResponses,
  simulateWordCloud,
  simulateYesNo,
  simulateScale,
  simulateGuessNumber,
  simulateRanking,
  simulateSentiment,
  simulateAgreeSpectrum,
  simulateFinishSentence,
} from '@/lib/simulationData';

interface AnimateButtonProps {
  slide: Slide;
  onSimulationData: (data: any) => void;
  hasSimulationData?: boolean;
  className?: string;
}

export function AnimateButton({ slide, onSimulationData, hasSimulationData = false, className }: AnimateButtonProps) {
  const { isSimulating, startSimulation, stopSimulation, setProgress, simulationProgress } = useSimulation();
  const [localSimulating, setLocalSimulating] = useState(false);
  const [responseCount, setResponseCount] = useState(0);
  const cancelRef = useRef<(() => void) | null>(null);

  const handleAnimate = useCallback(() => {
    if (localSimulating) {
      // Stop simulation
      cancelRef.current?.();
      setLocalSimulating(false);
      stopSimulation();
      onSimulationData(null);
      setResponseCount(0);
      return;
    }

    // Start simulation based on slide type
    setLocalSimulating(true);
    startSimulation();
    setResponseCount(0);

    const content = slide.content;
    // Slower duration for better feel (8 seconds instead of 4)
    const duration = 8000;

    switch (slide.type) {
      case 'quiz': {
        const quizContent = content as QuizSlideContent;
        cancelRef.current = simulateQuizResponses(
          quizContent.options.length,
          quizContent.correctAnswer,
          50,
          (results, total) => {
            onSimulationData({ results, total });
            setProgress((total / 50) * 100);
            setResponseCount(total);
          },
          duration
        );
        break;
      }
      case 'poll': {
        const pollContent = content as PollSlideContent;
        cancelRef.current = simulatePollResponses(
          pollContent.options.length,
          50,
          (results, total) => {
            onSimulationData({ results, total });
            setProgress((total / 50) * 100);
            setResponseCount(total);
          },
          duration
        );
        break;
      }
      case 'yesno': {
        cancelRef.current = simulateYesNo(
          50,
          (results, total) => {
            onSimulationData({ results, total });
            setProgress((total / 50) * 100);
            setResponseCount(total);
          },
          duration
        );
        break;
      }
      case 'scale': {
        const scaleContent = content as ScaleSlideContent;
        cancelRef.current = simulateScale(
          scaleContent.scaleOptions?.steps || 5,
          50,
          (results, total) => {
            onSimulationData({ results, total });
            setProgress((total / 50) * 100);
            setResponseCount(total);
          },
          duration
        );
        break;
      }
      case 'guess_number': {
        const guessContent = content as GuessNumberSlideContent;
        cancelRef.current = simulateGuessNumber(
          guessContent.correctNumber,
          guessContent.minRange || 1,
          guessContent.maxRange || 100,
          30,
          (results, total) => {
            onSimulationData({ results, total });
            setProgress((total / 30) * 100);
            setResponseCount(total);
          },
          duration
        );
        break;
      }
      case 'wordcloud': {
        cancelRef.current = simulateWordCloud(
          30,
          (words, total) => {
            onSimulationData({ words, total });
            setProgress((total / 30) * 100);
            setResponseCount(total);
          },
          duration
        );
        break;
      }
      case 'ranking': {
        const rankingContent = content as RankingSlideContent;
        cancelRef.current = simulateRanking(
          rankingContent.items,
          25,
          (scores) => {
            // Convert scores to rankings format expected by RankingSlide
            const rankings = Object.entries(scores)
              .map(([item, score]) => ({ item, avgRank: rankingContent.items.length - score + 1 }))
              .sort((a, b) => a.avgRank - b.avgRank);
            const total = Object.values(scores).reduce((sum, s) => sum + 1, 0);
            onSimulationData({ rankings, total: Math.min(total, 25) });
            setProgress(Math.min(total / 25, 1) * 100);
            setResponseCount(Math.min(total, 25));
          },
          duration
        );
        break;
      }
      case 'sentiment_meter': {
        cancelRef.current = simulateSentiment(
          40,
          (results, total) => {
            onSimulationData({ ...results, totalResponses: total, total });
            setProgress((total / 40) * 100);
            setResponseCount(total);
          },
          duration
        );
        break;
      }
      case 'agree_spectrum': {
        cancelRef.current = simulateAgreeSpectrum(
          40,
          (results, total) => {
            onSimulationData({ ...results, total });
            setProgress((total / 40) * 100);
            setResponseCount(total);
          },
          duration
        );
        break;
      }
      case 'finish_sentence': {
        cancelRef.current = simulateFinishSentence(
          30,
          (results, total) => {
            onSimulationData({ ...results, total });
            setProgress((total / 30) * 100);
            setResponseCount(total);
          },
          duration
        );
        break;
      }
      default:
        setLocalSimulating(false);
        stopSimulation();
        return;
    }

    // Auto-clear results and return to edit mode after simulation finishes
    setTimeout(() => {
      setLocalSimulating(false);
      stopSimulation();
      // Auto-clear simulation data to return to edit mode
      onSimulationData(null);
      setResponseCount(0);
    }, duration + 500);
  }, [slide, localSimulating, onSimulationData, startSimulation, stopSimulation, setProgress]);

  // Handler to clear simulation and return to edit mode
  const handleClearSimulation = useCallback(() => {
    cancelRef.current?.();
    setLocalSimulating(false);
    stopSimulation();
    onSimulationData(null);
    setResponseCount(0);
  }, [onSimulationData, stopSimulation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelRef.current?.();
    };
  }, []);

  // Check if this slide type supports simulation
  const supportsSimulation = ['quiz', 'poll', 'yesno', 'scale', 'guess_number', 'wordcloud', 'ranking', 'finish_sentence', 'sentiment_meter', 'agree_spectrum'].includes(slide.type);

  if (!supportsSimulation) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <AnimatePresence mode="wait">
        {localSimulating ? (
          <motion.div
            key="simulating"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center gap-3"
          >
            {/* Live indicator */}
            <motion.div 
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/20 border border-primary/30"
              animate={{ 
                boxShadow: [
                  '0 0 0 0 rgba(var(--primary), 0)',
                  '0 0 0 8px rgba(var(--primary), 0.1)',
                  '0 0 0 0 rgba(var(--primary), 0)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <motion.div
                className="w-2 h-2 rounded-full bg-primary"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
              <span className="text-xs font-medium text-primary">LIVE</span>
            </motion.div>

            {/* Response counter */}
            <motion.div 
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted"
              key={responseCount}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
            >
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <motion.span 
                className="text-sm font-bold text-foreground"
                key={responseCount}
                initial={{ y: -5, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
              >
                {responseCount}
              </motion.span>
            </motion.div>

            {/* Progress bar */}
            <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${simulationProgress}%` }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
              />
            </div>

            {/* Stop button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleAnimate}
              className="gap-1.5"
            >
              <Pause className="w-3.5 h-3.5" />
              Stop
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={handleAnimate}
              className="gap-2 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30 hover:from-primary/20 hover:to-primary/10 hover:border-primary/50 transition-all"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Sparkles className="w-4 h-4 text-primary" />
              </motion.div>
              <span className="font-medium">Animate</span>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
