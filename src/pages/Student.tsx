import React, { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Presentation, Send, MessageCircle, X, CheckCircle, Trophy, Loader2, ThumbsUp, ThumbsDown, GripVertical, RefreshCw, Clock } from "lucide-react";
import { Confetti } from "@/components/effects/Confetti";
import {
  getLectureByCode,
  subscribeLecture,
  submitResponse,
  getResponses,
  subscribeResponses,
  setStudentActive,
} from "@/lib/lectureService";
import {
  createLectureSyncChannel,
  createReactionsChannel,
  createGameChannel,
  createStudentPresenceChannel,
} from "@/lib/liveChannels";
import { buildLiveResultsPayload } from "@/lib/responseAggregation";
import { SlideRenderer } from "@/components/editor/SlideRenderer";
import { SlideFrame } from "@/components/editor/SlideFrame";
import { BuilderPreviewProvider } from "@/contexts/BuilderPreviewContext";
import { SlideLayoutProvider } from "@/contexts/SlideLayoutContext";
import { DesignStyleId } from "@/types/designStyles";
import { supabase } from "@/integrations/supabase/client";
import {
  Slide,
  SLIDE_TYPES,
  FinishSentenceSlideContent,
  SentimentMeterSlideContent,
  AgreeSpectrumSlideContent,
  isParticipativeSlide,
  isQuizSlide,
  getResolvedActivitySettings,
  DEFAULT_POINTS_CORRECT,
  DEFAULT_POINTS_PARTICIPATION,
} from "@/types/slides";
import { Json } from "@/integrations/supabase/types";
import { StudentGameControls } from "@/components/game";
import { ThemeId, getTheme, getSafeOptionColor } from "@/types/themes";

const REALTIME_RESUBSCRIBE_DELAY_MS = 2500;

// Error boundary so one render error does not crash the whole student view
class StudentErrorBoundary extends React.Component<
  { children: React.ReactNode; onBackToJoin?: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[Student] Error boundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex-1 p-4 overflow-auto flex flex-col items-center justify-center min-h-[50vh] text-center">
          <p className="text-muted-foreground mb-4">
            Something went wrong. Try refreshing or re-joining the lecture.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => window.location.reload()}>
              Refresh
            </Button>
            {this.props.onBackToJoin && (
              <Button onClick={this.props.onBackToJoin}>Back to Join</Button>
            )}
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}

const emojis = ["👍", "❤️", "🎉", "🤔", "💡", "👏"];

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
  const [, setTick] = useState(0);
  const [slideResponses, setSlideResponses] = useState<unknown[]>([]);
  const [rankingOrder, setRankingOrder] = useState<string[]>([]);
  // For new slide types
  const [sentimentValue, setSentimentValue] = useState([50]);
  const [agreeValue, setAgreeValue] = useState([50]);
  const [sentenceInput, setSentenceInput] = useState("");
  const [pointsEarnedAnimation, setPointsEarnedAnimation] = useState<number | null>(null);
  const [realtimeReconnectKey, setRealtimeReconnectKey] = useState(0);
  const [ctaOverlay, setCtaOverlay] = useState<{ label: string; url: string } | null>(null);
  const [studentRaffleName, setStudentRaffleName] = useState<string | null>(null);
  const previousPointsRef = React.useRef<number>(0);
  const lastBroadcastSlideIndexRef = React.useRef<number | null>(null);
  const lastBroadcastTsRef = React.useRef<number>(0);
  const broadcastRefetchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lectureSyncChannelRef = React.useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastAppliedUpdatedAtRef = React.useRef<string | null>(null);

  const currentSlide = slides[currentSlideIndex];
  const participativeSlide = currentSlide ? isParticipativeSlide(currentSlide.type) : false;
  const activityResolved =
    participativeSlide && currentSlide ? getResolvedActivitySettings(currentSlide) : null;
  const hasTimer = !!(activityResolved?.hasTimer);
  const startedAtMs = lecture?.activity_started_at
    ? Date.parse(lecture.activity_started_at as string)
    : NaN;
  const elapsedMs =
    participativeSlide && activityResolved && !Number.isNaN(startedAtMs)
      ? Date.now() - startedAtMs
      : 0;
  const durationSeconds = activityResolved?.durationSeconds ?? 0;
  const inVotingPhase =
    participativeSlide &&
    activityResolved &&
    hasTimer &&
    (Number.isNaN(startedAtMs) || elapsedMs < durationSeconds * 1000);
  const inResultsPhase =
    participativeSlide &&
    activityResolved &&
    hasTimer &&
    !Number.isNaN(startedAtMs) &&
    elapsedMs >= durationSeconds * 1000;
  const remainingSec =
    participativeSlide && activityResolved && hasTimer && !Number.isNaN(startedAtMs)
      ? Math.max(0, Math.ceil(durationSeconds - elapsedMs / 1000))
      : 0;

  useEffect(() => {
    if (!lecture?.id) return;
    const id = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [lecture?.id]);

  useEffect(() => {
    if (!lecture?.id || !currentSlide || !participativeSlide) {
      setSlideResponses([]);
      return;
    }
    const load = async () => {
      try {
        const data = await getResponses(lecture.id, currentSlideIndex);
        setSlideResponses(data);
      } catch (e) {
        console.error("[Student] load responses:", e);
      }
    };
    load();
    const channel = subscribeResponses(lecture.id, currentSlideIndex, (rows) => {
      setSlideResponses(rows as unknown[]);
    });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [lecture?.id, currentSlideIndex, currentSlide?.id, participativeSlide]);

  const aggregatedLiveResults = useMemo(
    () => buildLiveResultsPayload(currentSlide, slideResponses as { response_data?: unknown }[]),
    [currentSlide, slideResponses]
  );

  // Theme from current slide design first, then lecture settings, so option colors match presenter
  const themeId: ThemeId = (currentSlide?.design?.themeId as ThemeId) ?? (lecture?.settings?.themeId as ThemeId) ?? 'academic-pro';
  const theme = getTheme(themeId);
  const getOptionColor = (index: number) => getSafeOptionColor(theme, index);

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
  // When fromRefetch is true (scheduled refetch after broadcast), always apply newSlides so student gets latest. Otherwise during broadcast window avoid overwriting slides with stale poll/postgres data.
  // Versioning: skip apply from poll/postgres if updated_at is not newer than last applied (prevents stale winning).
  const applyLectureUpdate = React.useCallback((updatedLecture: any, fromRefetch?: boolean) => {
    const incomingUpdatedAt = updatedLecture?.updated_at ?? null;
    if (!fromRefetch && incomingUpdatedAt) {
      const last = lastAppliedUpdatedAtRef.current;
      if (last != null) {
        const incomingMs = new Date(incomingUpdatedAt).getTime();
        const lastMs = new Date(last).getTime();
        if (incomingMs <= lastMs) return; // Stale update, skip
      }
    }
    if (incomingUpdatedAt) lastAppliedUpdatedAtRef.current = incomingUpdatedAt;

    const newSlideIndex = updatedLecture.current_slide_index;
    const newSlides = (updatedLecture.slides as unknown as Slide[]) || [];
    const now = Date.now();
    const recentlyFromBroadcast =
      lastBroadcastTsRef.current > 0 &&
      now - lastBroadcastTsRef.current < 3500 &&
      lastBroadcastSlideIndexRef.current !== null;
    const b = lastBroadcastSlideIndexRef.current;
    // During broadcast window: DB ahead of last broadcast → trust DB (missed a forward broadcast).
    // DB behind broadcast → keep broadcast index (write lag). DB lower than broadcast → presenter went back; trust DB.
    const indexToApply =
      recentlyFromBroadcast && b !== null
        ? newSlideIndex > b
          ? newSlideIndex
          : newSlideIndex < b
            ? newSlideIndex
            : b
        : newSlideIndex;

    // Reset answer state when slide changes
    setCurrentSlideIndex((prevIndex: number) => {
      if (indexToApply !== prevIndex) {
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
      return indexToApply;
    });

    // Always apply slides when this update is from our scheduled refetch (after broadcast); otherwise during broadcast window skip to avoid stale poll/postgres overwriting
    if (newSlides.length > 0 && (fromRefetch || !recentlyFromBroadcast)) {
      setSlides(newSlides);
    }
    setLecture(updatedLecture);

    // After post-broadcast refetch, exit "broadcast merge" mode so postgres/poll use DB index only.
    if (fromRefetch) {
      lastBroadcastTsRef.current = 0;
    }
  }, []);

  // Hard refetch lecture state (used for guaranteed instant sync)
  const refetchLectureState = React.useCallback(async (lectureId: string, fromRefetch = false) => {
    const { data, error } = await supabase
      .from('lectures')
      .select('*')
      .eq('id', lectureId)
      .single();

    if (!error && data) {
      applyLectureUpdate(data, fromRefetch);
      return data;
    }
    if (error) {
      console.error('[Student] Refetch lecture error:', error);
    }
    return null;
  }, [applyLectureUpdate]);

  // 3-layer sync: (1) Broadcast lecture-sync-${id} – fastest; (2) postgres_changes on lectures; (3) polling fallback with backoff
  useEffect(() => {
    if (!lecture?.id) return;

    console.log('[Student] Subscribing to lecture updates:', lecture.id);
    setIsConnected(false);

    let pollIntervalMs = 1000; // Layer 3: start 1s, exponential backoff on success up to 3s
    let pollTimeoutId: NodeJS.Timeout | null = null;
    let lastUpdatedAt = lecture.updated_at;
    let lastSlideIndex = lecture.current_slide_index;
    let lastActivityStartedAt = lecture.activity_started_at ?? null;
    let isRealtimeActive = false;

    // Fetch immediately on mount
    refetchLectureState(lecture.id).then((data) => {
      if (data) {
        lastUpdatedAt = data.updated_at;
        lastSlideIndex = data.current_slide_index;
        lastActivityStartedAt = data.activity_started_at ?? null;
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
          const nextActivityAt = data.activity_started_at ?? null;
          // Include activity_started_at so "End question" / timer phase sync is never missed when index unchanged
          if (
            data.current_slide_index !== lastSlideIndex ||
            data.updated_at !== lastUpdatedAt ||
            nextActivityAt !== lastActivityStartedAt
          ) {
            console.log('[Student] Poll detected change - slide:', data.current_slide_index);
            lastUpdatedAt = data.updated_at;
            lastSlideIndex = data.current_slide_index;
            lastActivityStartedAt = nextActivityAt;
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

    // Layer 3: start polling immediately
    pollTimeoutId = setTimeout(pollForUpdates, pollIntervalMs);

    // Layer 2: postgres_changes on lectures (updated_at + current_slide_index)
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
            const nextActivityAt = payload.new.activity_started_at ?? null;
            if (
              payload.new.current_slide_index !== lastSlideIndex ||
              payload.new.updated_at !== lastUpdatedAt ||
              nextActivityAt !== lastActivityStartedAt
            ) {
              lastUpdatedAt = payload.new.updated_at;
              lastSlideIndex = payload.new.current_slide_index;
              lastActivityStartedAt = nextActivityAt;
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
          console.warn('[Student] Realtime channel error, relying on polling; will re-subscribe after delay');
          pollIntervalMs = 1000; // Speed up polling if realtime fails
          setTimeout(() => setRealtimeReconnectKey((k) => k + 1), REALTIME_RESUBSCRIBE_DELAY_MS);
        }
      });

    return () => {
      console.log('[Student] Unsubscribing from lecture');
      if (pollTimeoutId) clearTimeout(pollTimeoutId);
      supabase.removeChannel(channel);
    };
  }, [lecture?.id, applyLectureUpdate, refetchLectureState, realtimeReconnectKey]);

  // Layer 1: broadcast – presenter sends slide_changed on lecture-sync-${id}; apply immediately, then delayed debounced refetch. Channel ref used to send response_changed after submit.
  useEffect(() => {
    if (!lecture?.id) return;

    const channel = supabase.channel(`lecture-sync-${lecture.id}`, {
      config: { broadcast: { self: false } },
    });
    lectureSyncChannelRef.current = channel;

    channel
      .on("broadcast", { event: "cta_show" }, ({ payload }) => {
        const p = payload as { label?: string; url?: string };
        if (p?.label && p?.url) setCtaOverlay({ label: p.label, url: p.url });
      })
      .on("broadcast", { event: "raffle_winner" }, ({ payload }) => {
        const p = payload as { name?: string };
        if (p?.name) {
          setStudentRaffleName(p.name);
          setShowConfetti(true);
          window.setTimeout(() => {
            setStudentRaffleName(null);
            setShowConfetti(false);
          }, 4000);
        }
      })
      .on('broadcast', { event: 'slide_changed' }, ({ payload }) => {
        const p = payload as {
          currentSlideIndex?: number;
          lectureId?: string;
          ts?: number;
          activityStartedAt?: string | null;
        };
        const newIndex = p.currentSlideIndex;
        if (typeof newIndex === 'number') {
          lastBroadcastSlideIndexRef.current = newIndex;
          lastBroadcastTsRef.current = Date.now();
          // Apply immediately so student sees the right slide without waiting for refetch
          setCurrentSlideIndex(newIndex);
          if (p.activityStartedAt !== undefined) {
            setLecture((prev: any) =>
              prev ? { ...prev, activity_started_at: p.activityStartedAt } : prev
            );
          }
          setHasAnswered(false);
          setSelectedOption(null);
          setWordInput('');
          setNumberInput('');
          setScaleValue([3]);
          setRankingOrder([]);
          setSentimentValue([50]);
          setAgreeValue([50]);
          setSentenceInput('');
          // Debounced refetch: cancel any pending, schedule after 800ms so DB write has completed (avoids stale data flicker)
          if (broadcastRefetchTimeoutRef.current) clearTimeout(broadcastRefetchTimeoutRef.current);
          const lid = lecture.id;
          broadcastRefetchTimeoutRef.current = setTimeout(() => {
            broadcastRefetchTimeoutRef.current = null;
            refetchLectureState(lid, true);
          }, 1100);
        }
      })
      .subscribe((status) => {
        console.log('[Student] Slide sync channel status:', status);
      });

    return () => {
      lectureSyncChannelRef.current = null;
      if (broadcastRefetchTimeoutRef.current) clearTimeout(broadcastRefetchTimeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [lecture?.id, refetchLectureState]);

  // Subscribe to game events
  useEffect(() => {
    if (!lecture?.id) return;

    const channel = createGameChannel(lecture.id);

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
        previousPointsRef.current = (data as any).points ?? 0;
      }
    };

    loadStudent();

    // Subscribe to student updates (for points) and show +N animation when points increase
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
          const newData = payload.new as any;
          const newPoints = newData?.points ?? 0;
          const prev = previousPointsRef.current;
          setStudent(newData);
          previousPointsRef.current = newPoints;
          if (newPoints > prev && prev >= 0) {
            setPointsEarnedAnimation(newPoints - prev);
            setTimeout(() => setPointsEarnedAnimation(null), 2200);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [studentId]);

  const PRESENCE_HEARTBEAT_MS = 60_000;
  useEffect(() => {
    if (!lecture?.id || !studentId || !student?.name) return;

    const ch = createStudentPresenceChannel(lecture.id, studentId);
    const meta = {
      studentId,
      name: student.name as string,
      emoji: String((student as { emoji?: string }).emoji || "👤"),
      joinedAt: new Date().toISOString(),
    };

    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await setStudentActive(studentId, true);
        const err = await ch.track(meta);
        if (err) console.warn("[Student] presence track:", err);
      }
    });

    const hb = window.setInterval(() => {
      void setStudentActive(studentId, true);
    }, PRESENCE_HEARTBEAT_MS);

    const onUnload = () => {
      void setStudentActive(studentId, false);
    };
    window.addEventListener("beforeunload", onUnload);

    return () => {
      window.removeEventListener("beforeunload", onUnload);
      window.clearInterval(hb);
      void setStudentActive(studentId, false);
      void ch.untrack();
      supabase.removeChannel(ch);
    };
  }, [lecture?.id, studentId, student?.name, student?.emoji]);

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
    if (!lecture?.id || !studentId || hasAnswered || inResultsPhase) return;

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
      // Broadcast so presenter gets instant update (fallback if postgres_changes delays)
      const ch = lectureSyncChannelRef.current;
      const responsePayload = { lectureId: lecture.id, slideIndex: currentSlideIndex };
      if (ch) {
        ch.send({ type: 'broadcast', event: 'response_changed', payload: responsePayload });
        // Redundant send — presenter may subscribe milliseconds later; improves perceived latency
        setTimeout(() => {
          lectureSyncChannelRef.current?.send({
            type: 'broadcast',
            event: 'response_changed',
            payload: responsePayload,
          });
        }, 220);
      }
    } catch (error) {
      console.error('Error submitting response:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const pts = currentSlide
    ? getResolvedActivitySettings(currentSlide)
    : {
        hasTimer: true,
        durationSeconds: 20,
        pointsForCorrect: DEFAULT_POINTS_CORRECT,
        pointsForParticipation: DEFAULT_POINTS_PARTICIPATION,
      };

  const handleQuizAnswer = (index: number) => {
    if (hasAnswered || inResultsPhase) return;
    setSelectedOption(index);
    const content = currentSlide?.content as any;
    const isCorrect = content?.correctAnswer === index;
    const points = isCorrect ? pts.pointsForCorrect : pts.pointsForParticipation;
    handleSubmitResponse({ answer: index }, isCorrect, points);
  };

  const handlePollAnswer = (index: number) => {
    if (hasAnswered || inResultsPhase) return;
    setSelectedOption(index);
    handleSubmitResponse({ answer: index }, undefined, pts.pointsForParticipation);
  };

  const handleYesNo = (answer: boolean) => {
    if (hasAnswered || inResultsPhase) return;
    setSelectedOption(answer ? 0 : 1);
    const content = currentSlide?.content as any;
    const isCorrect =
      typeof content?.correctAnswer === "boolean" ? content.correctAnswer === answer : undefined;
    const points =
      isCorrect === true ? pts.pointsForCorrect : isCorrect === false ? pts.pointsForParticipation : pts.pointsForParticipation;
    handleSubmitResponse({ answer }, isCorrect, points);
  };

  const handleWordSubmit = () => {
    if (!wordInput.trim() || hasAnswered || inResultsPhase) return;
    handleSubmitResponse({ word: wordInput.trim() }, undefined, pts.pointsForParticipation);
    setWordInput("");
  };

  const handleNumberSubmit = () => {
    const num = parseInt(numberInput);
    if (isNaN(num) || hasAnswered || inResultsPhase) return;
    const content = currentSlide?.content as any;
    const isCorrect = content?.correctNumber === num;
    const points = isCorrect ? pts.pointsForCorrect : pts.pointsForParticipation;
    handleSubmitResponse({ guess: num }, isCorrect, points);
  };

  const handleScaleSubmit = () => {
    if (hasAnswered || inResultsPhase) return;
    handleSubmitResponse({ value: scaleValue[0] }, undefined, pts.pointsForParticipation);
  };

  const handleSentimentSubmit = () => {
    if (hasAnswered || inResultsPhase) return;
    handleSubmitResponse({ value: sentimentValue[0] }, undefined, pts.pointsForParticipation);
  };

  const handleAgreeSubmit = () => {
    if (hasAnswered || inResultsPhase) return;
    handleSubmitResponse({ value: agreeValue[0] }, undefined, pts.pointsForParticipation);
  };

  const handleSentenceSubmit = () => {
    if (!sentenceInput.trim() || hasAnswered || inResultsPhase) return;
    handleSubmitResponse({ text: sentenceInput.trim() }, undefined, pts.pointsForParticipation);
    setSentenceInput("");
  };

  const handleRankingSubmit = () => {
    if (hasAnswered || inResultsPhase) return;
    const items = rankingOrder.length > 0 ? rankingOrder : ((currentSlide?.content as any).items || []);
    handleSubmitResponse({ ranking: items }, undefined, pts.pointsForParticipation);
  };

  // Ref for the persistent emoji reaction channel
  const reactionChannelRef = React.useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Initialize reaction channel once
  useEffect(() => {
    if (!lecture?.id) return;

    const channel = createReactionsChannel(lecture.id);
    
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

  // Redirect to join if studentId is missing (e.g. direct link without joining)
  if (lecture && !studentId && lectureCode) {
    navigate(`/join?code=${lectureCode}`, { replace: true });
    return null;
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

  const handleCtaOpen = async (url: string) => {
    if (lecture?.id) {
      try {
        const lid = sessionStorage.getItem(`clasly_lead_${lecture.id}`);
        if (lid) {
          await supabase
            .from("lecture_leads")
            .update({ cta_clicked_at: new Date().toISOString() })
            .eq("id", lid);
        }
      } catch {
        /* ignore */
      }
    }
    setCtaOverlay(null);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Confetti isActive={showConfetti} />

      {ctaOverlay && (
        <div className="fixed inset-0 z-[95] flex flex-col justify-end bg-black/50 p-4 pb-10">
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setCtaOverlay(null)}
            className="absolute top-4 right-4 rounded-full bg-background/90 px-4 py-2 text-sm font-medium shadow"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => void handleCtaOpen(ctaOverlay.url)}
            className="w-full min-h-[4.5rem] rounded-2xl bg-primary text-primary-foreground text-xl font-bold shadow-lg active:scale-[0.99] transition-transform"
          >
            {ctaOverlay.label}
          </button>
        </div>
      )}

      {studentRaffleName && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 px-4 pointer-events-none">
          <div className="rounded-2xl bg-card border px-8 py-10 text-center shadow-xl pointer-events-auto max-w-sm w-full">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Winner</p>
            <p className="text-3xl font-display font-bold">{studentRaffleName}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-gradient-primary text-primary-foreground p-4 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center text-xl">
              {student?.emoji || "😊"}
            </div>
            <div className="relative">
              <p className="font-medium">{student?.name || "Student"}</p>
              <div className="flex items-center gap-1 text-sm text-primary-foreground/80">
                <Trophy className="w-3 h-3" />
                <span>{student?.points ?? 0} points</span>
              </div>
              <AnimatePresence>
                {pointsEarnedAnimation != null && (
                  <motion.div
                    key={pointsEarnedAnimation}
                    initial={{ opacity: 0, y: 0, scale: 0.5 }}
                    animate={{ opacity: 1, y: -12, scale: 1.2 }}
                    exit={{ opacity: 0, y: -24, scale: 1.5 }}
                    transition={{ duration: 0.4 }}
                    className="absolute -top-1 -right-2 px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 font-bold text-sm shadow-lg"
                  >
                    +{pointsEarnedAnimation}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/20"
              onClick={() => lecture?.id && refetchLectureState(lecture.id)}
              title="Refresh to see latest"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-400" : "bg-red-400"}`} />
            <span className="text-sm text-primary-foreground/80">
              {isConnected ? "Connected" : "Reconnecting..."}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content - wrapped in Error Boundary so one render error does not crash the view */}
      <StudentErrorBoundary onBackToJoin={() => navigate('/join')}>
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
        ) : currentSlide && participativeSlide ? (
          hasTimer && inResultsPhase ? (
          <motion.div
            key={`${currentSlide.id}-results`}
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="w-full max-w-4xl mx-auto rounded-2xl overflow-hidden border border-border/50 shadow-xl bg-card"
          >
            <div className="px-4 py-3 border-b border-border/50 bg-gradient-to-r from-primary/10 via-muted/30 to-teal-500/10 text-sm font-semibold text-center text-foreground">
              Results are in
            </div>
            <div className="aspect-video w-full max-h-[70vh] min-h-[240px]">
              <SlideFrame>
                <BuilderPreviewProvider allowContentScroll>
                  <SlideLayoutProvider slide={currentSlide}>
                    <SlideRenderer
                      slide={currentSlide}
                      isEditing={false}
                      showResults
                      showCorrectAnswer={isQuizSlide(currentSlide.type)}
                      liveResults={aggregatedLiveResults}
                      totalResponses={slideResponses.length}
                      hideFooter
                      forceShowStats
                      themeId={themeId}
                      designStyleId={
                        ((currentSlide.design as { designStyleId?: string } | undefined)?.designStyleId ??
                          (lecture?.settings as Record<string, unknown> | undefined)?.designStyleId ??
                          "dynamic") as DesignStyleId
                      }
                    />
                  </SlideLayoutProvider>
                </BuilderPreviewProvider>
              </SlideFrame>
            </div>
          </motion.div>
          ) : hasTimer && inVotingPhase && hasAnswered ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto mt-12 rounded-2xl border border-border/60 bg-card/80 backdrop-blur px-8 py-12 text-center shadow-lg"
          >
            <CheckCircle className="w-14 h-14 text-teal-500 mx-auto mb-4" />
            <p className="text-lg font-semibold text-foreground mb-2">Answer received</p>
            <p className="text-muted-foreground">Waiting for the presenter to continue.</p>
          </motion.div>
          ) : (
          <motion.div
            key={currentSlide.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl shadow-lg border border-border/50 p-6"
          >
            {participativeSlide && hasTimer && !Number.isNaN(startedAtMs) && (
              <div className="flex items-center justify-between gap-3 mb-4 p-3 rounded-xl bg-violet-500/10 border border-violet-500/25">
                <div className="flex items-center gap-2 text-violet-700 dark:text-violet-200">
                  <Clock className="w-5 h-5" />
                  <span className="text-sm font-medium">Time left</span>
                </div>
                <span className="text-2xl font-bold tabular-nums text-violet-700 dark:text-violet-100">
                  {remainingSec}s
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-primary font-medium mb-4">
              <Presentation className="w-4 h-4" />
              {SLIDE_TYPES.find(t => t.type === currentSlide.type)?.label || currentSlide.type}
            </div>

            <h2 className="text-xl font-display font-bold text-foreground mb-6">
              {(currentSlide.content as any).question || (currentSlide.content as any).statement || (currentSlide.content as any).sentenceStart || (currentSlide.content as any).title}
            </h2>

            {/* Quiz/Poll/Poll_quiz Options - 2x2 grid for 4 options */}
            {(currentSlide.type === 'quiz' || currentSlide.type === 'poll' || currentSlide.type === 'poll_quiz') && (
              <div className={((currentSlide.content as any).options || []).length === 4
                ? "grid grid-cols-2 gap-4"
                : "space-y-3"
              }>
                {((currentSlide.content as any).options || []).map((option: string, index: number) => (
                  <motion.button
                    key={index}
                    onClick={() => (currentSlide.type === 'quiz' || currentSlide.type === 'poll_quiz') ? handleQuizAnswer(index) : handlePollAnswer(index)}
                    disabled={hasAnswered || isSubmitting}
                    whileHover={{ scale: hasAnswered ? 1 : 1.02 }}
                    whileTap={{ scale: hasAnswered ? 1 : 0.98 }}
                    className={`w-full min-h-[4.5rem] p-5 sm:p-6 rounded-xl text-left transition-all text-white font-semibold text-lg sm:text-xl shadow-lg ${
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
                  className={`min-h-[5rem] p-8 sm:p-10 rounded-2xl text-center text-lg sm:text-xl font-semibold transition-all shadow-xl ${
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
                  className={`min-h-[5rem] p-8 sm:p-10 rounded-2xl text-center text-lg sm:text-xl font-semibold transition-all shadow-xl ${
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

            {/* Live results (no timer — same slide as voting) */}
            {!hasTimer && (
              <div className="mt-6 rounded-2xl border border-border/50 overflow-hidden bg-card/80">
                <div className="px-3 py-2 border-b border-border/50 bg-muted/30 text-xs font-medium text-center text-muted-foreground">
                  Live results
                </div>
                <div className="max-h-[min(50vh,420px)] min-h-[180px] overflow-y-auto">
                  <SlideFrame>
                    <BuilderPreviewProvider allowContentScroll>
                      <SlideLayoutProvider slide={currentSlide}>
                        <SlideRenderer
                          slide={currentSlide}
                          isEditing={false}
                          showResults
                          showCorrectAnswer={isQuizSlide(currentSlide.type)}
                          liveResults={aggregatedLiveResults}
                          totalResponses={slideResponses.length}
                          hideFooter
                          forceShowStats
                          themeId={themeId}
                          designStyleId={
                            ((currentSlide.design as { designStyleId?: string } | undefined)?.designStyleId ??
                              (lecture?.settings as Record<string, unknown> | undefined)?.designStyleId ??
                              "dynamic") as DesignStyleId
                          }
                        />
                      </SlideLayoutProvider>
                    </BuilderPreviewProvider>
                  </SlideFrame>
                </div>
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
                <p className="text-sm text-muted-foreground mt-2">
                  {hasTimer ? "Waiting for results..." : "Your response is in — results update live below."}
                </p>
              </motion.div>
            )}
          </motion.div>
          )
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
      </StudentErrorBoundary>

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
