import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Presentation, Send, MessageCircle, X, CheckCircle, Trophy, Loader2, ThumbsUp, ThumbsDown, GripVertical } from "lucide-react";
import { Confetti } from "@/components/effects/Confetti";
import {
  getLectureByCode,
  subscribeLecture,
  submitResponse,
} from "@/lib/lectureService";
import { supabase } from "@/integrations/supabase/client";
import { Slide, SLIDE_TYPES, FinishSentenceSlideContent, SentimentMeterSlideContent, AgreeSpectrumSlideContent } from "@/types/slides";
import { Json } from "@/integrations/supabase/types";
import { StudentGameControls } from "@/components/game";
import { ThemeId, getTheme, THEMES } from "@/types/themes";

const emojis = ["👍", "❤️", "🎉", "🤔", "💡", "👏"];

// Default option colors matching presenter theme
const DEFAULT_OPTION_COLORS = THEMES['neon-cyber'].optionColors;

const Student = () => {
  const { lectureCode } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const studentId = searchParams.get("studentId") || "";

  const [lecture, setLecture] = useState<any>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [student, setStudent] = useState<any>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [wordInput, setWordInput] = useState("");
  const [numberInput, setNumberInput] = useState("");
  const [scaleValue, setScaleValue] = useState([3]);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [lastReaction, setLastReaction] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isGameActive, setIsGameActive] = useState(false);
  const [rankingOrder, setRankingOrder] = useState<string[]>([]);
  // For new slide types
  const [sentimentValue, setSentimentValue] = useState([50]);
  const [agreeValue, setAgreeValue] = useState([50]);
  const [sentenceInput, setSentenceInput] = useState("");

  const currentSlide = slides[currentSlideIndex];
  const slideTypeInfo = currentSlide ? SLIDE_TYPES.find(t => t.type === currentSlide.type) : null;
  const isInteractiveSlide = slideTypeInfo?.category === 'interactive' || slideTypeInfo?.category === 'quiz';

  // Get theme colors - use lecture settings or default
  const themeId: ThemeId = (lecture?.settings?.themeId as ThemeId) || 'neon-cyber';
  const theme = getTheme(themeId);
  const optionColors = theme.optionColors || DEFAULT_OPTION_COLORS;

  // Helper to get color class for option index
  const getOptionColor = (index: number) => optionColors[index % optionColors.length];

  // Load lecture and subscribe to updates
  useEffect(() => {
    if (!lectureCode) return;

    const loadLecture = async () => {
      try {
        const data = await getLectureByCode(lectureCode);
        if (data) {
          setLecture(data);
          setSlides((data.slides as unknown as Slide[]) || []);
          setCurrentSlideIndex(data.current_slide_index || 0);
        }
      } catch (error) {
        console.error('Error loading lecture:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLecture();
  }, [lectureCode]);

  // Helper to apply lecture update - extracted for reuse
  const applyLectureUpdate = React.useCallback((updatedLecture: any) => {
    const newSlideIndex = updatedLecture.current_slide_index;
    const newSlides = (updatedLecture.slides as unknown as Slide[]) || [];
    
    // Reset answer state when slide changes
    setCurrentSlideIndex((prevIndex: number) => {
      if (newSlideIndex !== prevIndex) {
        console.log('[Student] Slide changed from', prevIndex, 'to', newSlideIndex);
        setHasAnswered(false);
        setSelectedOption(null);
        setWordInput("");
        setNumberInput("");
        setScaleValue([3]);
        setRankingOrder([]);
        setSentimentValue([50]);
        setAgreeValue([50]);
        setSentenceInput("");
      }
      return newSlideIndex;
    });
    
    // Update slides if they changed
    setSlides(newSlides);
    setLecture(updatedLecture);
  }, []);

  // Hard refetch lecture state (used for guaranteed instant sync)
  const refetchLectureState = React.useCallback(async (lectureId: string) => {
    const { data, error } = await supabase
      .from('lectures')
      .select('*')
      .eq('id', lectureId)
      .single();

    if (!error && data) {
      applyLectureUpdate(data);
      return data;
    }
    if (error) {
      console.error('[Student] Refetch lecture error:', error);
    }
    return null;
  }, [applyLectureUpdate]);

  // Subscribe to lecture updates - Real-time sync with presenter + aggressive polling fallback
  useEffect(() => {
    if (!lecture?.id) return;

    console.log('[Student] Subscribing to lecture updates:', lecture.id);
    setIsConnected(false);

    let pollIntervalMs = 1000; // Start with 1s polling for faster sync
    let pollTimeoutId: NodeJS.Timeout | null = null;
    let lastUpdatedAt = lecture.updated_at;
    let lastSlideIndex = lecture.current_slide_index;
    let isRealtimeActive = false;

    // Fetch immediately on mount
    refetchLectureState(lecture.id).then((data) => {
      if (data) {
        lastUpdatedAt = data.updated_at;
        lastSlideIndex = data.current_slide_index;
      }
    });

    // Polling fallback function - more aggressive
    const pollForUpdates = async () => {
      try {
        const { data, error } = await supabase
          .from('lectures')
          .select('*')
          .eq('id', lecture.id)
          .single();

        if (error) {
          console.error('[Student] Poll error:', error);
          pollIntervalMs = Math.min(pollIntervalMs * 1.2, 5000); // Max 5s on error
        } else if (data) {
          // Check for ANY changes - slide index is most critical
          if (data.current_slide_index !== lastSlideIndex || data.updated_at !== lastUpdatedAt) {
            console.log('[Student] Poll detected change - slide:', data.current_slide_index);
            lastUpdatedAt = data.updated_at;
            lastSlideIndex = data.current_slide_index;
            applyLectureUpdate(data);
            pollIntervalMs = 1000; // Reset to fast polling
          } else if (isRealtimeActive) {
            // No changes and realtime works, slow down slightly
            pollIntervalMs = Math.min(pollIntervalMs * 1.1, 3000);
          }
        }
      } catch (err) {
        console.error('[Student] Poll exception:', err);
        pollIntervalMs = Math.min(pollIntervalMs * 1.2, 5000);
      }

      // Schedule next poll
      pollTimeoutId = setTimeout(pollForUpdates, pollIntervalMs);
    };

    // Start polling immediately
    pollTimeoutId = setTimeout(pollForUpdates, pollIntervalMs);

    // Primary: Realtime subscription
    const channel = supabase
      .channel(`lecture-live-${lecture.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lectures',
          filter: `id=eq.${lecture.id}`,
        },
        (payload: any) => {
          console.log('[Student] Realtime update received:', payload.new?.current_slide_index);
          if (payload.new) {
            // Only apply if actually changed
            if (payload.new.current_slide_index !== lastSlideIndex || payload.new.updated_at !== lastUpdatedAt) {
              lastUpdatedAt = payload.new.updated_at;
              lastSlideIndex = payload.new.current_slide_index;
              applyLectureUpdate(payload.new);
            }
            pollIntervalMs = 2000; // Slow down polling when realtime works
          }
        }
      )
      .subscribe((status, err) => {
        console.log('[Student] Subscription status:', status, err);
        isRealtimeActive = status === 'SUBSCRIBED';
        setIsConnected(status === 'SUBSCRIBED');
        
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[Student] Realtime channel error, relying on polling');
          pollIntervalMs = 1000; // Speed up polling if realtime fails
        }
      });

    return () => {
      console.log('[Student] Unsubscribing from lecture');
      if (pollTimeoutId) clearTimeout(pollTimeoutId);
      supabase.removeChannel(channel);
    };
  }, [lecture?.id, applyLectureUpdate, refetchLectureState]);

  // Ultra-fast slide sync: presenter broadcasts on every navigation
  useEffect(() => {
    if (!lecture?.id) return;

    const channel = supabase.channel(`lecture-sync-${lecture.id}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'slide_changed' }, async ({ payload }) => {
        const p = payload as { currentSlideIndex?: number; lectureId?: string; ts?: number };
        const newIndex = p.currentSlideIndex;
        if (typeof newIndex === 'number') {
          // Apply immediately so student sees the right slide without waiting for refetch
          setCurrentSlideIndex(newIndex);
          setHasAnswered(false);
          setSelectedOption(null);
          setWordInput('');
          setNumberInput('');
          setScaleValue([3]);
          setRankingOrder([]);
          setSentimentValue([50]);
          setAgreeValue([50]);
          setSentenceInput('');
        }
        // Refetch in background for full lecture/slides data
        if (lecture?.id) refetchLectureState(lecture.id);
      })
      .subscribe((status) => {
        console.log('[Student] Slide sync channel status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lecture?.id, refetchLectureState]);

  // Subscribe to game events
  useEffect(() => {
    if (!lecture?.id) return;

    const channel = supabase.channel(`game-${lecture.id}`, {
      config: {
        broadcast: { self: true },
      },
    });

    channel
      .on('broadcast', { event: 'game_state' }, ({ payload }) => {
        const state = payload as { status: string };
        setIsGameActive(state.status !== 'ended' && state.status !== undefined);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lecture?.id]);

  // Load student info
  useEffect(() => {
    if (!studentId) return;

    const loadStudent = async () => {
      const { data } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .single();
      
      if (data) {
        setStudent(data);
      }
    };

    loadStudent();

    // Subscribe to student updates (for points)
    const channel = supabase
      .channel(`student-${studentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'students',
          filter: `id=eq.${studentId}`,
        },
        (payload) => {
          setStudent(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [studentId]);

  // Check if already answered
  useEffect(() => {
    if (!lecture?.id || !studentId || !currentSlide) return;

    const checkExistingResponse = async () => {
      const { data } = await supabase
        .from('responses')
        .select('*')
        .eq('lecture_id', lecture.id)
        .eq('student_id', studentId)
        .eq('slide_index', currentSlideIndex)
        .maybeSingle();
      
      if (data) {
        setHasAnswered(true);
        // Restore selected option if quiz/poll
        if (data.response_data && typeof (data.response_data as any).answer === 'number') {
          setSelectedOption((data.response_data as any).answer);
        }
      }
    };

    checkExistingResponse();
  }, [lecture?.id, studentId, currentSlideIndex, currentSlide]);

  // Initialize ranking order when slide changes
  useEffect(() => {
    if (currentSlide?.type === 'ranking') {
      const content = currentSlide.content as any;
      if (content?.items && rankingOrder.length === 0) {
        setRankingOrder([...content.items]);
      }
    }
  }, [currentSlide, rankingOrder.length]);

  const handleSubmitResponse = async (responseData: any, isCorrect?: boolean, points?: number) => {
    if (!lecture?.id || !studentId || hasAnswered) return;

    setIsSubmitting(true);
    try {
      await submitResponse(
        lecture.id,
        studentId,
        currentSlideIndex,
        responseData,
        isCorrect,
        points
      );
      setHasAnswered(true);
      if (isCorrect) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
    } catch (error) {
      console.error('Error submitting response:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuizAnswer = (index: number) => {
    if (hasAnswered) return;
    setSelectedOption(index);
    const content = currentSlide?.content as any;
    const isCorrect = content?.correctAnswer === index;
    const points = isCorrect ? 100 : 0;
    handleSubmitResponse({ answer: index }, isCorrect, points);
  };

  const handlePollAnswer = (index: number) => {
    if (hasAnswered) return;
    setSelectedOption(index);
    handleSubmitResponse({ answer: index });
  };

  const handleYesNo = (answer: boolean) => {
    if (hasAnswered) return;
    setSelectedOption(answer ? 0 : 1); // 0 = Yes, 1 = No for tracking
    handleSubmitResponse({ answer });
  };

  const handleWordSubmit = () => {
    if (!wordInput.trim() || hasAnswered) return;
    handleSubmitResponse({ word: wordInput.trim() });
    setWordInput("");
  };

  const handleNumberSubmit = () => {
    const num = parseInt(numberInput);
    if (isNaN(num) || hasAnswered) return;
    const content = currentSlide?.content as any;
    const isCorrect = content?.correctNumber === num;
    const points = isCorrect ? 100 : 0;
    handleSubmitResponse({ guess: num }, isCorrect, points);
  };

  const handleScaleSubmit = () => {
    if (hasAnswered) return;
    handleSubmitResponse({ value: scaleValue[0] });
  };

  const handleSentimentSubmit = () => {
    if (hasAnswered) return;
    handleSubmitResponse({ value: sentimentValue[0] });
  };

  const handleAgreeSubmit = () => {
    if (hasAnswered) return;
    handleSubmitResponse({ value: agreeValue[0] });
  };

  const handleSentenceSubmit = () => {
    if (!sentenceInput.trim() || hasAnswered) return;
    handleSubmitResponse({ text: sentenceInput.trim() });
    setSentenceInput("");
  };

  const handleRankingSubmit = () => {
    if (hasAnswered) return;
    const items = rankingOrder.length > 0 ? rankingOrder : ((currentSlide?.content as any).items || []);
    handleSubmitResponse({ ranking: items });
  };

  // Ref for the persistent emoji reaction channel
  const reactionChannelRef = React.useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Initialize reaction channel once
  useEffect(() => {
    if (!lecture?.id) return;

    const channel = supabase.channel(`reactions-${lecture.id}`, {
      config: { broadcast: { self: false } },
    });
    
    channel.subscribe((status) => {
      console.log('[Student] Reaction channel status:', status);
    });
    
    reactionChannelRef.current = channel;

    return () => {
      if (reactionChannelRef.current) {
        supabase.removeChannel(reactionChannelRef.current);
        reactionChannelRef.current = null;
      }
    };
  }, [lecture?.id]);

  // Send emoji reaction via broadcast - reuses persistent channel
  const handleSendReaction = (emoji: string) => {
    setLastReaction(emoji);
    setTimeout(() => setLastReaction(null), 1000);
    
    if (reactionChannelRef.current) {
      reactionChannelRef.current.send({
        type: 'broadcast',
        event: 'emoji_reaction',
        payload: {
          emoji,
          studentId,
          studentName: student?.name,
          timestamp: Date.now(),
        }
      }).then(() => {
        console.log('[Student] Emoji sent:', emoji);
      }).catch((err) => {
        console.error('[Student] Failed to send emoji:', err);
      });
    }
  };

  // Submit question to database
  const handleSubmitQuestion = async () => {
    if (!questionText.trim() || !lecture?.id) return;
    
    try {
      await supabase.from('questions').insert({
        lecture_id: lecture.id,
        student_id: studentId || null,
        question: questionText.trim(),
      });
      setQuestionText("");
      setShowQuestionForm(false);
    } catch (error) {
      console.error('Error submitting question:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Connecting to lecture...</p>
        </motion.div>
      </div>
    );
  }

  if (!lecture) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Lecture not found</h1>
          <Button onClick={() => navigate('/join')}>Back to Join</Button>
        </div>
      </div>
    );
  }

  // Show game controls when game is active
  if (isGameActive && lecture?.id && studentId && student) {
    return (
      <StudentGameControls
        lectureId={lecture.id}
        studentId={studentId}
        studentName={student.name}
        studentEmoji={student.emoji}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Confetti isActive={showConfetti} />

      {/* Header */}
      <header className="bg-gradient-primary text-primary-foreground p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center text-xl">
              {student?.emoji || "😊"}
            </div>
            <div>
              <p className="font-medium">{student?.name || "Student"}</p>
              <div className="flex items-center gap-1 text-sm text-primary-foreground/80">
                <Trophy className="w-3 h-3" />
                <span>{student?.points || 0} points</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-400" : "bg-red-400"}`} />
            <span className="text-sm text-primary-foreground/80">
              {isConnected ? "Connected" : "Reconnecting..."}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 overflow-auto">
        {lecture.status === 'draft' ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center"
          >
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Presentation className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-display font-bold text-foreground mb-2">
              Waiting to Start
            </h2>
            <p className="text-muted-foreground max-w-xs">
              The instructor will start the presentation soon. Stay tuned!
            </p>
          </motion.div>
        ) : currentSlide && isInteractiveSlide ? (
          <motion.div
            key={currentSlide.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl shadow-lg border border-border/50 p-6"
          >
            <div className="flex items-center gap-2 text-sm text-primary font-medium mb-4">
              <Presentation className="w-4 h-4" />
              {SLIDE_TYPES.find(t => t.type === currentSlide.type)?.label || currentSlide.type}
            </div>

            <h2 className="text-xl font-display font-bold text-foreground mb-6">
              {(currentSlide.content as any).question || (currentSlide.content as any).statement || (currentSlide.content as any).sentenceStart || (currentSlide.content as any).title}
            </h2>

            {/* Quiz/Poll Options - Using theme colors */}
            {(currentSlide.type === 'quiz' || currentSlide.type === 'poll') && (
              <div className="space-y-3">
                {((currentSlide.content as any).options || []).map((option: string, index: number) => (
                  <motion.button
                    key={index}
                    onClick={() => currentSlide.type === 'quiz' ? handleQuizAnswer(index) : handlePollAnswer(index)}
                    disabled={hasAnswered || isSubmitting}
                    whileHover={{ scale: hasAnswered ? 1 : 1.02 }}
                    whileTap={{ scale: hasAnswered ? 1 : 0.98 }}
                    className={`w-full p-4 rounded-xl text-left transition-all text-white font-medium shadow-lg ${
                      selectedOption === index
                        ? "ring-2 ring-white ring-offset-2 ring-offset-background"
                        : hasAnswered
                        ? "opacity-50"
                        : ""
                    } ${getOptionColor(index)}`}
                  >
                    {option}
                  </motion.button>
                ))}
              </div>
            )}

            {/* Yes/No - Using gradient colors matching presenter */}
            {currentSlide.type === 'yesno' && (
              <div className="grid grid-cols-2 gap-4">
                <motion.button
                  onClick={() => handleYesNo(true)}
                  disabled={hasAnswered || isSubmitting}
                  whileHover={{ scale: hasAnswered ? 1 : 1.05 }}
                  whileTap={{ scale: hasAnswered ? 1 : 0.95 }}
                  className={`p-8 rounded-2xl text-center transition-all shadow-xl ${
                    hasAnswered && selectedOption === 0
                      ? "ring-2 ring-white"
                      : hasAnswered
                      ? "opacity-50"
                      : ""
                  } bg-gradient-to-br from-emerald-500 to-green-500 text-white`}
                >
                  <ThumbsUp className="w-10 h-10 mx-auto mb-2" />
                  <span className="text-xl font-bold">{(currentSlide.content as any).yesLabel || 'Yes'}</span>
                </motion.button>
                <motion.button
                  onClick={() => handleYesNo(false)}
                  disabled={hasAnswered || isSubmitting}
                  whileHover={{ scale: hasAnswered ? 1 : 1.05 }}
                  whileTap={{ scale: hasAnswered ? 1 : 0.95 }}
                  className={`p-8 rounded-2xl text-center transition-all shadow-xl ${
                    hasAnswered && selectedOption === 1
                      ? "ring-2 ring-white"
                      : hasAnswered
                      ? "opacity-50"
                      : ""
                  } bg-gradient-to-br from-rose-500 to-red-500 text-white`}
                >
                  <ThumbsDown className="w-10 h-10 mx-auto mb-2" />
                  <span className="text-xl font-bold">{(currentSlide.content as any).noLabel || 'No'}</span>
                </motion.button>
              </div>
            )}

            {/* Word Cloud Input */}
            {currentSlide.type === 'wordcloud' && (
              <div className="space-y-4">
                <Input
                  value={wordInput}
                  onChange={(e) => setWordInput(e.target.value)}
                  placeholder="Enter a word..."
                  className="text-lg"
                  disabled={hasAnswered}
                  onKeyDown={(e) => e.key === 'Enter' && handleWordSubmit()}
                />
                <Button
                  variant="hero"
                  className="w-full"
                  onClick={handleWordSubmit}
                  disabled={!wordInput.trim() || hasAnswered || isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Submit
                </Button>
              </div>
            )}

            {/* Guess Number Input */}
            {currentSlide.type === 'guess_number' && (
              <div className="space-y-4">
                <div className="text-center text-muted-foreground mb-2">
                  Range: {(currentSlide.content as any).minRange || 1} - {(currentSlide.content as any).maxRange || 100}
                </div>
                <Input
                  type="number"
                  value={numberInput}
                  onChange={(e) => setNumberInput(e.target.value)}
                  placeholder="Enter your guess..."
                  className="text-lg text-center"
                  disabled={hasAnswered}
                  onKeyDown={(e) => e.key === 'Enter' && handleNumberSubmit()}
                />
                <Button
                  variant="hero"
                  className="w-full"
                  onClick={handleNumberSubmit}
                  disabled={!numberInput || hasAnswered || isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Submit Guess
                </Button>
              </div>
            )}

            {/* Scale Slider */}
            {currentSlide.type === 'scale' && (
              <div className="space-y-6">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{(currentSlide.content as any).scaleOptions?.minLabel || 'Low'}</span>
                  <span>{(currentSlide.content as any).scaleOptions?.maxLabel || 'High'}</span>
                </div>
                <Slider
                  value={scaleValue}
                  onValueChange={setScaleValue}
                  min={1}
                  max={(currentSlide.content as any).scaleOptions?.steps || 5}
                  step={1}
                  disabled={hasAnswered}
                  className="py-4"
                />
                <div className="text-center">
                  <span className="text-3xl font-bold text-primary">{scaleValue[0]}</span>
                </div>
                <Button
                  variant="hero"
                  className="w-full"
                  onClick={handleScaleSubmit}
                  disabled={hasAnswered || isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Submit Rating
                </Button>
              </div>
            )}

            {/* Sentiment Meter - Emoji slider 0-100 */}
            {currentSlide.type === 'sentiment_meter' && (
              <div className="space-y-6">
                <div className="flex justify-between text-3xl">
                  <span>{(currentSlide.content as SentimentMeterSlideContent).leftEmoji || '😡'}</span>
                  <span>{(currentSlide.content as SentimentMeterSlideContent).rightEmoji || '😍'}</span>
                </div>
                <Slider
                  value={sentimentValue}
                  onValueChange={setSentimentValue}
                  min={0}
                  max={100}
                  step={1}
                  disabled={hasAnswered}
                  className="py-4"
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{(currentSlide.content as SentimentMeterSlideContent).leftLabel || 'Not great'}</span>
                  <span>{(currentSlide.content as SentimentMeterSlideContent).rightLabel || 'Amazing'}</span>
                </div>
                <div className="text-center">
                  <span className="text-2xl font-bold text-primary">{sentimentValue[0]}%</span>
                </div>
                <Button
                  variant="hero"
                  className="w-full"
                  onClick={handleSentimentSubmit}
                  disabled={hasAnswered || isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Submit
                </Button>
              </div>
            )}

            {/* Agree/Disagree Spectrum - 0-100 slider */}
            {currentSlide.type === 'agree_spectrum' && (
              <div className="space-y-6">
                <Slider
                  value={agreeValue}
                  onValueChange={setAgreeValue}
                  min={0}
                  max={100}
                  step={1}
                  disabled={hasAnswered}
                  className="py-4"
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{(currentSlide.content as AgreeSpectrumSlideContent).leftLabel || 'Strongly Disagree'}</span>
                  <span>{(currentSlide.content as AgreeSpectrumSlideContent).rightLabel || 'Strongly Agree'}</span>
                </div>
                <div className="text-center">
                  <span className="text-2xl font-bold text-primary">{agreeValue[0]}%</span>
                </div>
                <Button
                  variant="hero"
                  className="w-full"
                  onClick={handleAgreeSubmit}
                  disabled={hasAnswered || isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Submit
                </Button>
              </div>
            )}

            {/* Finish the Sentence - Text input */}
            {currentSlide.type === 'finish_sentence' && (
              <div className="space-y-4">
                <p className="text-lg font-medium text-foreground italic">
                  "{(currentSlide.content as FinishSentenceSlideContent).sentenceStart}"
                </p>
                <Textarea
                  value={sentenceInput}
                  onChange={(e) => setSentenceInput(e.target.value.slice(0, (currentSlide.content as FinishSentenceSlideContent).maxCharacters || 100))}
                  placeholder="Complete the sentence..."
                  className="min-h-[100px]"
                  disabled={hasAnswered}
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{sentenceInput.length} / {(currentSlide.content as FinishSentenceSlideContent).maxCharacters || 100}</span>
                </div>
                <Button
                  variant="hero"
                  className="w-full"
                  onClick={handleSentenceSubmit}
                  disabled={!sentenceInput.trim() || hasAnswered || isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Submit
                </Button>
              </div>
            )}

            {/* Ranking with smooth Reorder drag-and-drop */}
            {currentSlide.type === 'ranking' && (
              <div className="space-y-3">
                <Reorder.Group
                  axis="y"
                  values={rankingOrder.length > 0 ? rankingOrder : ((currentSlide.content as any).items || [])}
                  onReorder={setRankingOrder}
                  className="space-y-2"
                >
                  {(rankingOrder.length > 0 ? rankingOrder : ((currentSlide.content as any).items || [])).map((item: string, index: number) => (
                    <Reorder.Item
                      key={item}
                      value={item}
                      className={`p-4 rounded-xl flex items-center gap-3 cursor-grab active:cursor-grabbing touch-manipulation text-white shadow-lg ${
                        hasAnswered ? 'opacity-60 cursor-not-allowed' : ''
                      } ${getOptionColor(index)}`}
                      drag={!hasAnswered ? "y" : false}
                      whileDrag={{ scale: 1.02, boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}
                    >
                      <span className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {index + 1}
                      </span>
                      <span className="font-medium flex-1">{item}</span>
                      <GripVertical className="w-5 h-5 text-white/60 flex-shrink-0" />
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
                <Button
                  variant="hero"
                  className="w-full mt-4"
                  onClick={handleRankingSubmit}
                  disabled={hasAnswered || isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Submit Ranking
                </Button>
              </div>
            )}

            {/* Answer submitted message */}
            {hasAnswered && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 text-center"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Answer submitted!</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">Waiting for results...</p>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Presentation className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-display font-bold text-foreground mb-2">
              {lecture.status === 'active' ? 'Waiting for Activity' : 'Lecture Ended'}
            </h2>
            <p className="text-muted-foreground">
              {lecture.status === 'active' 
                ? 'The presenter will start an interactive activity soon'
                : 'Thank you for participating!'}
            </p>
          </div>
        )}
      </main>

      {/* Reaction Bar */}
      <div className="p-4 border-t border-border/50 bg-card/50">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            {emojis.map((emoji) => (
              <motion.button
                key={emoji}
                onClick={() => handleSendReaction(emoji)}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                animate={lastReaction === emoji ? { y: [-20, 0], opacity: [0.5, 1] } : {}}
                className="text-2xl p-2 hover:bg-muted rounded-lg transition-colors"
              >
                {emoji}
              </motion.button>
            ))}
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowQuestionForm(true)}
        >
          <MessageCircle className="w-4 h-4" />
          Ask a Question
        </Button>
      </div>

      {/* Question Form Modal */}
      <AnimatePresence>
        {showQuestionForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-end z-50"
            onClick={() => setShowQuestionForm(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              className="w-full bg-card rounded-t-2xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-display font-bold text-foreground">
                  Ask a Question
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowQuestionForm(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <Input
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Type your question..."
                  className="text-base"
                  autoFocus
                />
                <Button
                  variant="hero"
                  className="w-full"
                  onClick={handleSubmitQuestion}
                  disabled={!questionText.trim()}
                >
                  <Send className="w-4 h-4" />
                  Send Question
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Student;
