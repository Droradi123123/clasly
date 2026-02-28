import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import {
  ChevronLeft,
  ChevronRight,
  Users,
  MessageCircle,
  X,
  QrCode,
  Copy,
  Check,
  Play,
  Trophy,
  Maximize,
  Minimize,
  Eye,
  EyeOff,
  Gamepad2,
  HelpCircle,
  CheckCircle,
  Flag,
} from "lucide-react";
import { SlideRenderer } from "@/components/editor/SlideRenderer";
import { Slide, SLIDE_TYPES, isQuizSlide } from "@/types/slides";
import { Confetti } from "@/components/effects/Confetti";
import { FloatingParticles } from "@/components/effects/FloatingParticles";
import { BuilderPreviewProvider } from "@/contexts/BuilderPreviewContext";
import { Leaderboard } from "@/components/present/Leaderboard";
import { MiniLeaderboard } from "@/components/present/MiniLeaderboard";
import { FruitCatchGame } from "@/components/game";
import {
  getLecture,
  getStudents,
  getResponses,
  updateLecture,
  startLecture,
  endLecture,
  subscribeStudents,
  subscribeResponses,
} from "@/lib/lectureService";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";

// Types for questions
interface Question {
  id: string;
  lecture_id: string;
  student_id: string | null;
  question: string;
  is_answered: boolean;
  created_at: string;
  answered_at: string | null;
}

// Response aggregation helpers
function aggregateQuizResponses(responses: any[], options: string[]) {
  const counts = options.map(() => 0);
  responses.forEach((r) => {
    const answer = r.response_data?.answer;
    if (typeof answer === 'number' && answer >= 0 && answer < options.length) {
      counts[answer]++;
    }
  });
  return counts;
}

function aggregatePollResponses(responses: any[], options: string[]) {
  const counts = options.map(() => 0);
  responses.forEach((r) => {
    const answer = r.response_data?.answer;
    if (typeof answer === 'number' && answer >= 0 && answer < options.length) {
      counts[answer]++;
    }
  });
  return counts;
}

function aggregateYesNoResponses(responses: any[]) {
  let yes = 0, no = 0;
  responses.forEach((r) => {
    if (r.response_data?.answer === true) yes++;
    else if (r.response_data?.answer === false) no++;
  });
  return { yes, no };
}

function aggregateWordCloudResponses(responses: any[]) {
  const words: Record<string, number> = {};
  responses.forEach((r) => {
    const word = r.response_data?.word;
    if (word) {
      words[word.toLowerCase()] = (words[word.toLowerCase()] || 0) + 1;
    }
  });
  return Object.entries(words).map(([text, count]) => ({ text, count }));
}

function aggregateScaleResponses(responses: any[]) {
  const values: number[] = [];
  responses.forEach((r) => {
    const value = r.response_data?.value;
    if (typeof value === 'number') values.push(value);
  });
  if (values.length === 0) return { average: 0, distribution: [] };
  const average = values.reduce((a, b) => a + b, 0) / values.length;
  return { average, distribution: values };
}

function aggregateGuessResponses(responses: any[], correctNumber: number) {
  const guesses: number[] = [];
  responses.forEach((r) => {
    const guess = r.response_data?.guess;
    if (typeof guess === 'number') guesses.push(guess);
  });
  return { guesses, correctNumber };
}

function aggregateRankingResponses(responses: any[], items: string[]) {
  if (responses.length === 0) return { rankings: [] };
  
  // Calculate average rank for each item
  const rankSums: Record<string, number[]> = {};
  items.forEach(item => { rankSums[item] = []; });
  
  responses.forEach((r) => {
    const ranking = r.response_data?.ranking;
    if (Array.isArray(ranking)) {
      ranking.forEach((item: string, index: number) => {
        if (rankSums[item]) {
          rankSums[item].push(index + 1); // 1-based ranking
        }
      });
    }
  });
  
  const rankings = items.map(item => ({
    item,
    avgRank: rankSums[item].length > 0 
      ? rankSums[item].reduce((a, b) => a + b, 0) / rankSums[item].length 
      : 0
  }));
  
  return { rankings };
}

// Aggregate sentiment and agree responses
function aggregateSentimentResponses(responses: any[]) {
  const values: number[] = [];
  responses.forEach((r) => {
    const value = r.response_data?.value;
    if (typeof value === 'number') values.push(value);
  });
  if (values.length === 0) return { average: 50, distribution: [] };
  const average = values.reduce((a, b) => a + b, 0) / values.length;
  return { average, distribution: values };
}

function aggregateFinishSentenceResponses(responses: any[]) {
  const texts: string[] = [];
  responses.forEach((r) => {
    const text = r.response_data?.text;
    if (text) texts.push(text);
  });
  return { texts };
}

const Present = () => {
  const { lectureId } = useParams();
  const navigate = useNavigate();
  const [lecture, setLecture] = useState<any>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [showQRCode, setShowQRCode] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showMiniLeaderboard, setShowMiniLeaderboard] = useState(true);
  const [showCodeInQR, setShowCodeInQR] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [responses, setResponses] = useState<any[]>([]);
  const [lectureCode, setLectureCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<{ id: number; emoji: string; x: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGame, setShowGame] = useState(false);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  // Questions state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showQuestionsPanel, setShowQuestionsPanel] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  // Layer 1 – Broadcast (fastest): channel lecture-sync-${lectureId} for instant slide sync to students
  const slideSyncChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const slideSyncReadyRef = useRef(false);
  const pendingBroadcastRef = useRef<{ lectureId: string; currentSlideIndex: number; ts: number } | null>(null);
  const slideContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!lectureId) return;

    slideSyncReadyRef.current = false;
    const channel = supabase.channel(`lecture-sync-${lectureId}`, {
      config: { broadcast: { self: false } },
    });

    channel.subscribe((status) => {
      console.log('[Present] Slide sync channel status:', status);
      slideSyncReadyRef.current = status === 'SUBSCRIBED';
      if (status === 'SUBSCRIBED' && pendingBroadcastRef.current) {
        const pending = pendingBroadcastRef.current;
        pendingBroadcastRef.current = null;
        channel.send({
          type: 'broadcast',
          event: 'slide_changed',
          payload: { lectureId: pending.lectureId, currentSlideIndex: pending.currentSlideIndex, ts: pending.ts },
        });
      }
    });

    slideSyncChannelRef.current = channel;

    return () => {
      pendingBroadcastRef.current = null;
      if (slideSyncChannelRef.current) {
        supabase.removeChannel(slideSyncChannelRef.current);
        slideSyncChannelRef.current = null;
      }
      slideSyncReadyRef.current = false;
    };
  }, [lectureId]);

  const sendSlideBroadcast = useCallback((lectureId: string, newIndex: number) => {
    const payload = { lectureId, currentSlideIndex: newIndex, ts: Date.now() };
    if (slideSyncReadyRef.current && slideSyncChannelRef.current) {
      slideSyncChannelRef.current.send({
        type: 'broadcast',
        event: 'slide_changed',
        payload,
      });
      setTimeout(() => {
        if (slideSyncChannelRef.current) {
          slideSyncChannelRef.current.send({
            type: 'broadcast',
            event: 'slide_changed',
            payload: { ...payload, ts: Date.now() },
          });
        }
      }, 180);
    } else {
      pendingBroadcastRef.current = payload;
    }
  }, []);

  const currentSlide = slides[currentSlideIndex];
  const unansweredQuestionsCount = questions.filter(q => !q.is_answered).length;

  // Load lecture data + set status to active immediately so students can join via QR
  useEffect(() => {
    if (!lectureId) return;

    const loadLecture = async () => {
      try {
        const data = await getLecture(lectureId);
        if (data) {
          setLecture(data);
          setSlides((data.slides as unknown as Slide[]) || []);
          setCurrentSlideIndex(data.current_slide_index || 0);
          setLectureCode(data.lecture_code);
          const wasActive = data.status === 'active';
          setIsLive(wasActive);
          // Open lecture for students as soon as presenter enters Present view
          if (data.status !== 'active' && data.status !== 'ended') {
            await startLecture(lectureId);
            setIsLive(true);
          }
        }
      } catch (error) {
        console.error('Error loading lecture:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLecture();
  }, [lectureId]);

  // Load students
  useEffect(() => {
    if (!lectureId) return;

    const loadStudents = async () => {
      try {
        const data = await getStudents(lectureId);
        setStudents(data);
      } catch (error) {
        console.error('Error loading students:', error);
      }
    };

    loadStudents();

    // Subscribe to student updates
    const channel = subscribeStudents(lectureId, (newStudents) => {
      setStudents(newStudents as any[]);
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lectureId]);

  // Load and subscribe to responses for current slide
  useEffect(() => {
    if (!lectureId || !currentSlide) return;

    const loadResponses = async () => {
      try {
        const data = await getResponses(lectureId, currentSlideIndex);
        setResponses(data);
      } catch (error) {
        console.error('Error loading responses:', error);
      }
    };

    loadResponses();

    // Subscribe to response updates
    const channel = subscribeResponses(lectureId, currentSlideIndex, (newResponses) => {
      setResponses(newResponses as any[]);
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lectureId, currentSlideIndex, currentSlide]);

  // Subscribe to emoji reactions via broadcast
  useEffect(() => {
    if (!lectureId) return;

    const channel = supabase.channel(`reactions-${lectureId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'emoji_reaction' }, ({ payload }) => {
        const { emoji } = payload as { emoji: string };
        const id = Date.now() + Math.random();
        const x = 10 + Math.random() * 80; // Random x position 10-90%
        setFloatingReactions(prev => [...prev, { id, emoji, x }]);
        // Remove after animation
        setTimeout(() => {
          setFloatingReactions(prev => prev.filter(r => r.id !== id));
        }, 3000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lectureId]);

  // Load and subscribe to questions
  useEffect(() => {
    if (!lectureId) return;

    const loadQuestions = async () => {
      const { data } = await supabase
        .from('questions')
        .select('*')
        .eq('lecture_id', lectureId)
        .order('created_at', { ascending: false });
      if (data) setQuestions(data as Question[]);
    };

    loadQuestions();

    const channel = supabase
      .channel(`questions-${lectureId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'questions',
          filter: `lecture_id=eq.${lectureId}`,
        },
        () => {
          loadQuestions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lectureId]);

  // Mark question as answered
  const handleMarkAnswered = async (questionId: string) => {
    await supabase
      .from('questions')
      .update({ is_answered: true, answered_at: new Date().toISOString() })
      .eq('id', questionId);
  };

  // Fullscreen API
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(console.error);
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(console.error);
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Auto-enter fullscreen when lecture is loaded
  const autoFullscreenRequestedRef = useRef(false);
  useEffect(() => {
    if (!loading && slides.length > 0 && !document.fullscreenElement && !autoFullscreenRequestedRef.current) {
      autoFullscreenRequestedRef.current = true;
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(console.error);
    }
  }, [loading, slides.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        handleNextSlide();
      } else if (e.key === "ArrowLeft") {
        handlePrevSlide();
      } else if (e.key === "Escape") {
        if (isFullscreen) {
          document.exitFullscreen();
        } else {
          navigate(`/editor/${lectureId}`);
        }
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [slides.length, navigate, lectureId, currentSlideIndex, isFullscreen, toggleFullscreen]);

  const handleNextSlide = async () => {
    if (currentSlideIndex < slides.length - 1) {
      const newIndex = currentSlideIndex + 1;
      setCurrentSlideIndex(newIndex);
      setShowCorrectAnswer(false);
      if (lectureId) {
        sendSlideBroadcast(lectureId, newIndex);
        await updateLecture(lectureId, { current_slide_index: newIndex });
      }
    }
  };

  const handlePrevSlide = async () => {
    if (currentSlideIndex > 0) {
      const newIndex = currentSlideIndex - 1;
      setCurrentSlideIndex(newIndex);
      setShowCorrectAnswer(false);
      if (lectureId) {
        sendSlideBroadcast(lectureId, newIndex);
        await updateLecture(lectureId, { current_slide_index: newIndex });
      }
    }
  };

  // Wheel-based slide navigation: scroll within slide first, then advance
  const WHEEL_THRESHOLD = 20;
  const handleNextRef = useRef(handleNextSlide);
  const handlePrevRef = useRef(handlePrevSlide);
  handleNextRef.current = handleNextSlide;
  handlePrevRef.current = handlePrevSlide;
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const container = slideContainerRef.current;
      if (!container || slides.length === 0) return;
      const scrollEl = container.querySelector<HTMLElement>('[data-slide-scroll]');
      const isScrollable = scrollEl && scrollEl.scrollHeight > scrollEl.clientHeight;

      if (isScrollable && scrollEl) {
        const atBottom = scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - WHEEL_THRESHOLD;
        const atTop = scrollEl.scrollTop <= WHEEL_THRESHOLD;
        if (e.deltaY > 0) {
          if (atBottom && currentSlideIndex < slides.length - 1) {
            e.preventDefault();
            handleNextRef.current();
          }
        } else if (e.deltaY < 0) {
          if (atTop && currentSlideIndex > 0) {
            e.preventDefault();
            handlePrevRef.current();
          }
        }
      } else {
        if (e.deltaY > 0 && currentSlideIndex < slides.length - 1) {
          e.preventDefault();
          handleNextRef.current();
        } else if (e.deltaY < 0 && currentSlideIndex > 0) {
          e.preventDefault();
          handlePrevRef.current();
        }
      }
    };
    const mainContent = document.querySelector('[data-present-main-content]');
    if (mainContent) {
      mainContent.addEventListener('wheel', handleWheel, { passive: false });
      return () => mainContent.removeEventListener('wheel', handleWheel);
    }
  }, [slides.length, currentSlideIndex]);

  const handleStartLecture = async () => {
    if (lectureId) {
      await startLecture(lectureId);
      setIsLive(true);
      setShowQRCode(false);
    }
  };

  const handleEndLecture = async () => {
    if (!lectureId || isEnding) return;
    setIsEnding(true);
    try {
      await endLecture(lectureId);
      navigate(`/lecture/${lectureId}/analytics`, { replace: true });
    } catch (e) {
      console.error(e);
      setIsEnding(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(lectureCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Get join URL for QR code
  const joinUrl = `${window.location.origin}/join?code=${lectureCode}`;

  // Calculate aggregated results for display
  const getAggregatedResults = () => {
    if (!currentSlide) return null;
    
    switch (currentSlide.type) {
      case 'quiz':
        const quizContent = currentSlide.content as any;
        return {
          type: 'quiz',
          results: aggregateQuizResponses(responses, quizContent.options || []),
          options: quizContent.options || [],
          correctAnswer: quizContent.correctAnswer,
        };
      case 'poll':
        const pollContent = currentSlide.content as any;
        return {
          type: 'poll',
          results: aggregatePollResponses(responses, pollContent.options || []),
          options: pollContent.options || [],
        };
      case 'yesno':
        return {
          type: 'yesno',
          results: aggregateYesNoResponses(responses),
        };
      case 'wordcloud':
        return {
          type: 'wordcloud',
          words: aggregateWordCloudResponses(responses),
        };
      case 'scale':
        return {
          type: 'scale',
          results: aggregateScaleResponses(responses),
        };
      case 'guess_number':
        const guessContent = currentSlide.content as any;
        return {
          type: 'guess_number',
          results: aggregateGuessResponses(responses, guessContent.correctNumber || 0),
        };
      case 'ranking':
        const rankingContent = currentSlide.content as any;
        return {
          type: 'ranking',
          rankings: aggregateRankingResponses(responses, rankingContent.items || []),
        };
      case 'sentiment_meter': {
        const { average, distribution } = aggregateSentimentResponses(responses);
        return {
          type: 'sentiment_meter',
          average,
          distribution,
          results: { average, distribution },
        };
      }
      case 'agree_spectrum': {
        const { average, distribution } = aggregateSentimentResponses(responses);
        return {
          type: 'agree_spectrum',
          average,
          positions: distribution,
          distribution,
          results: { average, distribution },
        };
      }
      case 'finish_sentence':
        return {
          type: 'finish_sentence',
          results: aggregateFinishSentenceResponses(responses),
        };
      default:
        return null;
    }
  };

  const aggregatedResults = getAggregatedResults();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading presentation...</p>
        </motion.div>
      </div>
    );
  }

  if (!lecture || slides.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Lecture not found</h1>
          <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-foreground text-primary-foreground flex flex-col relative overflow-hidden">
      {/* Background particles */}
      <FloatingParticles count={30} color="rgba(255, 255, 255, 0.1)" />
      
      {/* Confetti effect */}
      <Confetti isActive={showConfetti} />

      {/* Floating Emoji Reactions */}
      <AnimatePresence>
        {floatingReactions.map((reaction) => (
          <motion.div
            key={reaction.id}
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 0, y: -300, scale: 1.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.5, ease: "easeOut" }}
            className="fixed text-5xl z-50 pointer-events-none"
            style={{ left: `${reaction.x}%`, bottom: "15%" }}
          >
            {reaction.emoji}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Mini Leaderboard */}
      <MiniLeaderboard students={students} isVisible={showMiniLeaderboard && isLive} />

      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 bg-background/10 backdrop-blur-sm z-10">
        <Button
          variant="ghost"
          size="sm"
          className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
          onClick={() => navigate(`/editor/${lectureId}`)}
        >
          <X className="w-4 h-4" />
          Exit
        </Button>

        <div className="flex items-center gap-4">
          {showCodeInQR && (
            <button
              onClick={copyCode}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
            >
              <span className="font-display font-bold tracking-wider text-xl">{lectureCode}</span>
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          )}
          <div className="flex items-center gap-2 text-primary-foreground/80">
            <Users className="w-4 h-4" />
            <span className="font-medium">{students.length}</span>
          </div>
          {isLive && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-medium">LIVE</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Questions button with badge */}
          <Button
            variant="ghost"
            size="sm"
            className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 relative"
            onClick={() => setShowQuestionsPanel(true)}
            title="View student questions"
          >
            <HelpCircle className="w-4 h-4" />
            {unansweredQuestionsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center animate-pulse">
                {unansweredQuestionsCount}
              </span>
            )}
          </Button>
          {/* QR Code button */}
          <Button
            variant="ghost"
            size="sm"
            className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => setShowQRCode(true)}
            title="Show QR code"
          >
            <QrCode className="w-4 h-4" />
          </Button>
          {/* Leaderboard (Top 5) toggle */}
          {isLive && students.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => setShowMiniLeaderboard(!showMiniLeaderboard)}
              title={showMiniLeaderboard ? "Hide leaderboard" : "Show leaderboard"}
            >
              {showMiniLeaderboard ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span className="ml-1 text-xs">{showMiniLeaderboard ? "Hide" : "Show"} Top 5</span>
            </Button>
          )}
          {/* Fullscreen toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit fullscreen (F)" : "Fullscreen (F)"}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </Button>
          {/* Game button */}
          <Button
            variant="ghost"
            size="sm"
            className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => setShowGame(true)}
            title="Start Fruit Catch game"
          >
            <Gamepad2 className="w-4 h-4" />
          </Button>
          {/* Reveal Answer button - for all quiz slides */}
          {currentSlide && isQuizSlide(currentSlide.type) && (
            <Button
              variant={showCorrectAnswer ? "default" : "ghost"}
              size="sm"
              className={showCorrectAnswer 
                ? "bg-green-500 hover:bg-green-600 text-white" 
                : "text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
              }
              onClick={() => {
                setShowCorrectAnswer(!showCorrectAnswer);
                if (!showCorrectAnswer) {
                  setShowConfetti(true);
                  setTimeout(() => setShowConfetti(false), 3000);
                }
              }}
              disabled={responses.length === 0}
              title={responses.length === 0 ? "Wait for responses before revealing" : showCorrectAnswer ? "Hide correct answer" : "Reveal correct answer"}
            >
              <Check className="w-4 h-4" />
              <span className="ml-1 text-xs">{showCorrectAnswer ? "Hide" : "Reveal"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Content - LARGER presentation */}
      <div data-present-main-content className="flex-1 flex items-center justify-center p-2 md:p-4 relative">
        {/* Left Navigation Arrow - Always visible */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-2 md:left-4 z-20 h-16 w-16 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all"
          onClick={handlePrevSlide}
          disabled={currentSlideIndex === 0}
        >
          <ChevronLeft className="w-10 h-10" />
        </Button>

        <AnimatePresence mode="wait">
          <motion.div
            ref={slideContainerRef}
            key={currentSlide?.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full max-w-[min(95vw,1200px)] max-h-[85vh] aspect-video mx-4 md:mx-8 lg:mx-16"
          >
            {currentSlide && (
              <BuilderPreviewProvider allowContentScroll={true}>
              <SlideRenderer
                slide={currentSlide}
                isEditing={false}
                showResults={isQuizSlide(currentSlide.type) ? showCorrectAnswer : true}
                liveResults={aggregatedResults}
                totalResponses={responses.length}
                hideFooter={true}
                showCorrectAnswer={showCorrectAnswer}
              />
              </BuilderPreviewProvider>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Right Navigation Arrow - Always visible */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 md:right-4 z-20 h-16 w-16 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all"
          onClick={handleNextSlide}
          disabled={currentSlideIndex === slides.length - 1}
        >
          <ChevronRight className="w-10 h-10" />
        </Button>
      </div>

      {/* End lecture – prominent when on last slide */}
      <AnimatePresence>
        {currentSlideIndex === slides.length - 1 && slides.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-24 left-0 right-0 z-30 flex flex-col items-center justify-center gap-2"
          >
            <Button
              size="default"
              className="w-fit bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm md:text-base shadow-lg shadow-amber-900/30 px-5 py-2.5 rounded-xl border border-amber-400/50"
              onClick={handleEndLecture}
              disabled={isEnding}
            >
              {isEnding ? (
                <>
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Ending...
                </>
              ) : (
                <>
                  <Flag className="w-5 h-5 mr-2" />
                  End lecture & view analytics
                </>
              )}
            </Button>
            <span className="text-xs text-primary-foreground/70">You're on the last slide</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation - Dots */}
      <div className="flex flex-col items-center justify-center p-4 bg-background/10 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={async () => {
                setCurrentSlideIndex(index);
                setShowCorrectAnswer(false);
                if (lectureId) {
                  sendSlideBroadcast(lectureId, index);
                  await updateLecture(lectureId, { current_slide_index: index });
                }
              }}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentSlideIndex
                  ? "w-8 bg-primary-foreground"
                  : "bg-primary-foreground/30 hover:bg-primary-foreground/50"
              }`}
            />
          ))}
        </div>
      </div>

      {/* QR Code Overlay - CENTERED on screen */}
      <AnimatePresence>
        {showQRCode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => isLive && setShowQRCode(false)}
          >
            <motion.div
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              exit={{ y: 20 }}
              className="bg-card/95 backdrop-blur-md rounded-3xl shadow-2xl border border-border/40 max-w-[min(95vw,480px)] max-h-[90vh] overflow-y-auto flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 pb-0 flex-shrink-0 sticky top-0 z-10 bg-card/95 backdrop-blur-md">
                <h3 className="font-display font-bold text-xl md:text-2xl text-card-foreground">Join the Lecture</h3>
                {isLive && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-muted-foreground hover:text-foreground flex-shrink-0"
                    onClick={() => setShowQRCode(false)}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                )}
              </div>
              
              <div className="flex flex-col items-center gap-6 p-6 md:gap-8 md:p-10">
                {/* QR Code - LARGE and centered */}
                <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-lg">
                  <QRCodeSVG
                    value={joinUrl}
                    size={240}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                
                {/* Info */}
                <div className="text-center space-y-4">
                  <div>
                    <p className="text-base text-muted-foreground mb-1">Go to</p>
                    <p className="font-bold text-2xl text-card-foreground">clasly.app/join</p>
                  </div>
                  
                  <button
                    onClick={copyCode}
                    className="flex items-center justify-center gap-4 px-8 py-4 rounded-2xl bg-muted hover:bg-muted/80 transition-colors w-full"
                  >
                    <span className="text-4xl font-display font-bold tracking-[0.3em] text-card-foreground">{lectureCode}</span>
                    {copied ? <Check className="w-6 h-6 text-green-500" /> : <Copy className="w-6 h-6 text-muted-foreground" />}
                  </button>
                  
                  <div className="flex items-center justify-center gap-2 text-lg">
                    <Users className="w-6 h-6 text-muted-foreground" />
                    <span>
                      <span className="font-bold text-card-foreground">{students.length}</span>
                      <span className="text-muted-foreground"> joined</span>
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Start button when not live */}
              {!isLive && (
                <Button
                  variant="hero"
                  size="lg"
                  className="w-full mt-8 h-14 text-lg"
                  onClick={handleStartLecture}
                >
                  <Play className="w-6 h-6" />
                  Start Presentation
                </Button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Questions Panel Modal */}
      <AnimatePresence>
        {showQuestionsPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center z-50"
            onClick={() => setShowQuestionsPanel(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-card text-card-foreground rounded-2xl w-full max-w-[min(95vw,28rem)] max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 md:p-6 pb-4 flex-shrink-0 sticky top-0 z-10 bg-card">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-display font-bold">Student Questions</h2>
                  {unansweredQuestionsCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-500 text-xs font-bold">
                      {unansweredQuestionsCount} new
                    </span>
                  )}
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowQuestionsPanel(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-3 p-4 md:p-6 pt-0 md:pt-0">
                {questions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No questions yet</p>
                    <p className="text-sm">Questions from students will appear here</p>
                  </div>
                ) : (
                  questions.map((q) => (
                    <motion.div
                      key={q.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-4 rounded-xl border ${
                        q.is_answered 
                          ? 'bg-muted/50 border-border/50 opacity-60' 
                          : 'bg-card border-primary/20'
                      }`}
                    >
                      <p className="text-foreground mb-2">{q.question}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {new Date(q.created_at).toLocaleTimeString()}
                        </span>
                        {!q.is_answered ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600 hover:text-green-700 hover:bg-green-100"
                            onClick={() => handleMarkAnswered(q.id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Mark Answered
                          </Button>
                        ) : (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Answered
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leaderboard Modal */}
      <Leaderboard
        students={students}
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
      />

      {/* Fruit Catch Game */}
      <AnimatePresence>
        {showGame && lectureId && (
          <FruitCatchGame
            lectureId={lectureId}
            students={students}
            onClose={() => setShowGame(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Present;
