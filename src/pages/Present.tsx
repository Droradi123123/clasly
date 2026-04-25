import { useState, useEffect, useLayoutEffect, useCallback, useRef, startTransition, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
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
  Clock,
  Link2,
  Sparkles,
} from "lucide-react";
import { SlideRenderer } from "@/components/editor/SlideRenderer";
import { SlideFrame } from "@/components/editor/SlideFrame";
import {
  Slide,
  SLIDE_TYPES,
  isQuizSlide,
  isInteractiveSlide,
  isParticipativeSlide,
  getResolvedActivitySettings,
} from "@/types/slides";
import { buildLiveResultsPayload } from "@/lib/responseAggregation";
import { getActivityPhaseState } from "@/lib/activityPhase";
import { ensureSlidesDesignDefaults } from "@/lib/designDefaults";
import { ThemeId } from "@/types/themes";
import { DesignStyleId } from "@/types/designStyles";
import { Confetti } from "@/components/effects/Confetti";
import { FloatingParticles } from "@/components/effects/FloatingParticles";
import { BuilderPreviewProvider } from "@/contexts/BuilderPreviewContext";
import { SlideLayoutProvider } from "@/contexts/SlideLayoutContext";
import { Leaderboard } from "@/components/present/Leaderboard";
import { MiniLeaderboard } from "@/components/present/MiniLeaderboard";
import { RaffleWheelOverlay } from "@/components/present/RaffleWheelOverlay";
import { FruitCatchGame } from "@/components/game";
import {
  getLecture,
  getStudents,
  getResponses,
  updateLecture,
  startLecture,
  endLecture,
  duplicateLecture,
  subscribeStudents,
  subscribeResponses,
} from "@/lib/lectureService";
import { supabase, removeAllChannels } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { logProductEvent } from "@/lib/productEvents";
import {
  createLectureSyncChannel,
  createPresenterPresenceChannel,
  countPresenceOnline,
  presenceNamesList,
} from "@/lib/liveChannels";

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

/** QR and share links should use production URL when set (Vercel env), not preview/local origin. */
function getJoinPageOrigin(): string {
  const raw = import.meta.env?.VITE_PUBLIC_APP_URL as string | undefined;
  if (raw && /^https?:\/\//i.test(raw.trim())) {
    return raw.trim().replace(/\/$/, "");
  }
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

const PRESENT_PG_REALTIME_RESUBSCRIBE_DELAY_MS = 1000;

const Present = () => {
  const { lectureId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Cleanup ALL channels when unmounting the present view to prevent orphan subscriptions.
  useEffect(() => {
    return () => {
      removeAllChannels();
    };
  }, []);

  const [lecture, setLecture] = useState<any>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [showQRCode, setShowQRCode] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showMiniLeaderboard, setShowMiniLeaderboard] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSlideSyncConnected, setIsSlideSyncConnected] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [responses, setResponses] = useState<any[]>([]);
  /** Cache responses per slide so accidental navigation never looks like data loss. */
  const responsesBySlideRef = useRef<Map<number, any[]>>(new Map());
  const [lectureCode, setLectureCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<{ id: number; emoji: string; x: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGame, setShowGame] = useState(false);
  const [tick, setTick] = useState(0);
  const prevActivityPhaseRef = useRef<"voting" | "results" | "idle">("idle");
  // Questions state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showQuestionsPanel, setShowQuestionsPanel] = useState(false);
  const reloadQuestionsRef = useRef<() => void>(() => {});
  const [isEnding, setIsEnding] = useState(false);
  const [isStartingLecture, setIsStartingLecture] = useState(false);
  const [showWrapUp, setShowWrapUp] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [presenceOnlineCount, setPresenceOnlineCount] = useState(0);
  const presenceStateRef = useRef<Record<string, unknown[]>>({});
  const [raffleWinnerName, setRaffleWinnerName] = useState<string | null>(null);
  /** Names for the wheel-of-fortune spin (null = idle). */
  const [raffleWheelNames, setRaffleWheelNames] = useState<string[] | null>(null);
  /** Bumps to tear down and recreate postgres_changes subscriptions after Realtime errors. */
  const [presentPgReconnectKey, setPresentPgReconnectKey] = useState(0);
  const pgReconnectAttemptsRef = useRef(0);

  const schedulePresentPgReconnect = useCallback(() => {
    const attempts = pgReconnectAttemptsRef.current;
    if (attempts >= 8) {
      console.warn('[Present] Realtime max retries reached, relying on polling only');
      return;
    }
    const delay = Math.min(PRESENT_PG_REALTIME_RESUBSCRIBE_DELAY_MS * Math.pow(2, attempts), 30000);
    pgReconnectAttemptsRef.current = attempts + 1;
    window.setTimeout(() => {
      setPresentPgReconnectKey((k) => k + 1);
    }, delay);
  }, []);

  // Layer 1 – Broadcast (fastest): channel lecture-sync-${lectureId} for instant slide sync to students
  const slideSyncChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const slideSyncReadyRef = useRef(false);
  const pendingBroadcastRef = useRef<{
    lectureId: string;
    currentSlideIndex: number;
    ts: number;
    activityStartedAt: string | null;
    presenterWallClockMs: number;
  } | null>(null);
  const slideContainerRef = useRef<HTMLDivElement | null>(null);
  const currentSlideIndexRef = useRef(currentSlideIndex);

  const setResponsesForSlide = useCallback((slideIndex: number, rows: any[]) => {
    responsesBySlideRef.current.set(slideIndex, rows);
    if (slideIndex === currentSlideIndexRef.current) {
      setResponses(rows);
    }
  }, []);

  useEffect(() => {
    if (!lectureId) return;

    slideSyncReadyRef.current = false;
    const channel = createLectureSyncChannel(lectureId);

    channel
      .on('broadcast', { event: 'response_changed' }, async ({ payload }) => {
        const p = payload as { lectureId?: string; slideIndex?: number };
        if (p.lectureId === lectureId && typeof p.slideIndex === 'number' && p.slideIndex === currentSlideIndexRef.current) {
          try {
            const data = await getResponses(lectureId, p.slideIndex);
            setResponsesForSlide(p.slideIndex, data);
          } catch (e) {
            console.error('[Present] response_changed getResponses:', e);
          }
        }
      })
      .on('broadcast', { event: 'question_new' }, () => {
        try {
          reloadQuestionsRef.current();
        } catch (e) {
          console.warn('[Present] question_new reload:', e);
        }
      })
      .on('broadcast', { event: 'emoji_reaction' }, ({ payload }) => {
        const { emoji } = payload as { emoji: string };
        const id = Date.now() + Math.random();
        const x = 10 + Math.random() * 80;
        setFloatingReactions(prev => {
          const next = [...prev, { id, emoji, x }];
          return next.length > 20 ? next.slice(-20) : next;
        });
        setTimeout(() => {
          setFloatingReactions(prev => prev.filter(r => r.id !== id));
        }, 3000);
      })
      .subscribe((status) => {
      console.log('[Present] Slide sync channel status:', status);
      slideSyncReadyRef.current = status === 'SUBSCRIBED';
      setIsSlideSyncConnected(status === 'SUBSCRIBED');
      if (status === 'SUBSCRIBED' && pendingBroadcastRef.current) {
        const pending = pendingBroadcastRef.current;
        pendingBroadcastRef.current = null;
        channel.send({
          type: 'broadcast',
          event: 'slide_changed',
          payload: {
            lectureId: pending.lectureId,
            currentSlideIndex: pending.currentSlideIndex,
            ts: pending.ts,
            activityStartedAt: pending.activityStartedAt,
            presenterWallClockMs: pending.presenterWallClockMs,
          },
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
      setIsSlideSyncConnected(false);
    };
  }, [lectureId, setResponsesForSlide]);

  const webinarCta = (lecture?.settings as { webinarCta?: { label?: string; url?: string } } | null | undefined)
    ?.webinarCta;

  const broadcastWebinarCta = useCallback(() => {
    const ch = slideSyncChannelRef.current;
    if (!ch || !lectureId) return;
    const label = webinarCta?.label?.trim();
    const url = webinarCta?.url?.trim();
    if (!label || !url) {
      toast.error("Set CTA label and URL in the editor (Webinar section).");
      return;
    }
    void ch.send({
      type: "broadcast",
      event: "cta_show",
      payload: { label, url },
    });
    toast.success("CTA sent to attendees");
  }, [lectureId, webinarCta?.label, webinarCta?.url]);

  const finishRaffleWithWinner = useCallback((winnerName: string) => {
    const ch = slideSyncChannelRef.current;
    setRaffleWheelNames(null);
    setRaffleWinnerName(winnerName);
    setShowConfetti(true);
    if (ch) {
      void ch.send({
        type: "broadcast",
        event: "raffle_winner",
        payload: { name: winnerName },
      });
    }
    window.setTimeout(() => {
      setRaffleWinnerName(null);
      setShowConfetti(false);
    }, 4500);
  }, []);

  const pickRaffleWinner = useCallback(() => {
    const names = presenceNamesList(presenceStateRef.current);
    if (names.length === 0) {
      toast.error("No participants online.");
      return;
    }
    setRaffleWheelNames(names.map((n) => n.name));
  }, []);

  const exitToEditor = useCallback(() => {
    if (!lectureId || !lecture) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    const editorPath =
      lecture.lecture_mode === "webinar"
        ? `/webinar/editor/${lectureId}`
        : `/editor/${lectureId}`;
    startTransition(() =>
      navigate(editorPath, {
        state: {
          preloadedLecture: {
            id: lecture.id,
            title: lecture.title,
            lecture_code: lectureCode,
            slides,
            settings: lecture.settings,
            lecture_mode: lecture.lecture_mode,
          },
        },
      }),
    );
  }, [lectureId, lecture, lectureCode, slides, navigate]);

  const sendSlideBroadcast = useCallback(
    (lectureId: string, newIndex: number, activityStartedAt: string | null) => {
      const presenterWallClockMs = Date.now();
      const payload = {
        lectureId,
        currentSlideIndex: newIndex,
        ts: presenterWallClockMs,
        activityStartedAt,
        presenterWallClockMs,
      };
      if (slideSyncReadyRef.current && slideSyncChannelRef.current) {
        slideSyncChannelRef.current.send({
          type: 'broadcast',
          event: 'slide_changed',
          payload,
        });
        setTimeout(() => {
          if (slideSyncChannelRef.current) {
            const t = Date.now();
            slideSyncChannelRef.current.send({
              type: 'broadcast',
              event: 'slide_changed',
              payload: { ...payload, ts: t, presenterWallClockMs: t },
            });
          }
        }, 90);
      } else {
        pendingBroadcastRef.current = payload;
      }
    },
    []
  );

  const effectiveSlideIndex =
    slides.length > 0
      ? Math.min(Math.max(0, currentSlideIndex), slides.length - 1)
      : 0;

  useLayoutEffect(() => {
    if (slides.length === 0) return;
    const clamped = Math.min(Math.max(0, currentSlideIndex), slides.length - 1);
    if (currentSlideIndex !== clamped) setCurrentSlideIndex(clamped);
  }, [slides.length, currentSlideIndex, slides]);

  currentSlideIndexRef.current = effectiveSlideIndex;
  const currentSlide = slides.length > 0 ? slides[effectiveSlideIndex] : undefined;
  const unansweredQuestionsCount = questions.filter(q => !q.is_answered).length;

  useEffect(() => {
    if (!lectureId) return;
    const id = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [lectureId]);

  const activityPhase = useMemo(
    () =>
      getActivityPhaseState(currentSlide ?? null, lecture?.activity_started_at as string | undefined, {
        nowMs: Date.now(),
        clockOffsetMs: 0,
      }),
    [currentSlide, lecture?.activity_started_at, tick]
  );

  const {
    participative,
    hasTimer,
    durationSeconds: durationSec,
    inVotingPhase,
    inResultsPhase,
    showLiveResults,
    showCorrectAnswer: showCorrectAnswerEffective,
    remainingSec,
    startedAtMs,
  } = activityPhase;

  useEffect(() => {
    if (!participative || !currentSlide || !hasTimer) {
      prevActivityPhaseRef.current = "idle";
      return;
    }
    const phase: "voting" | "results" = inResultsPhase ? "results" : "voting";
    const prev = prevActivityPhaseRef.current;
    if (phase === "results" && prev === "voting" && isQuizSlide(currentSlide.type)) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
    prevActivityPhaseRef.current = phase;
  }, [inResultsPhase, participative, currentSlide?.id, currentSlide, hasTimer]);

  const handleSkipToResults = useCallback(async () => {
    if (!lectureId || !currentSlide || !isParticipativeSlide(currentSlide.type)) return;
    const { hasTimer: ht, durationSeconds } = getResolvedActivitySettings(currentSlide);
    if (!ht) return;
    const dur = durationSeconds;
    const started = new Date(Date.now() - dur * 1000).toISOString();
    // Optimistic: presenter + students switch to results immediately.
    setLecture((prev: any) => (prev ? { ...prev, activity_started_at: started } : prev));
    sendSlideBroadcast(lectureId, currentSlideIndex, started);
    try {
      const updated = await updateLecture(lectureId, { activity_started_at: started });
      if (updated) setLecture(updated);
    } catch (e) {
      console.error("[Present] skip to results:", e);
    }
  }, [lectureId, currentSlide, currentSlideIndex, sendSlideBroadcast]);

  // Unified slide navigation: broadcast first (instant to students), then update DB
  const goToSlide = useCallback(
    async (index: number) => {
      if (index < 0 || index >= slides.length) return;
      setCurrentSlideIndex(index);
      prevActivityPhaseRef.current = "idle";
      if (lectureId) {
        const targetSlide = slides[index];
        const activityStartedAt = isParticipativeSlide(targetSlide.type)
          ? new Date().toISOString()
          : null;
        // Optimistic: start countdown immediately on presenter even if DB write is slow/fails.
        setLecture((prev: any) =>
          prev ? { ...prev, current_slide_index: index, activity_started_at: activityStartedAt } : prev
        );
        sendSlideBroadcast(lectureId, index, activityStartedAt);
        try {
          const updated = await updateLecture(lectureId, {
            current_slide_index: index,
            activity_started_at: activityStartedAt,
          });
          if (updated) setLecture(updated);
        } catch (e) {
          console.error("[Present] goToSlide:", e);
        }
      }
    },
    [lectureId, slides, sendSlideBroadcast]
  );

  const handleNextSlide = useCallback(async () => {
    if (currentSlideIndex < slides.length - 1) {
      await goToSlide(currentSlideIndex + 1);
    }
  }, [currentSlideIndex, slides.length, goToSlide]);

  const handlePrevSlide = useCallback(async () => {
    if (currentSlideIndex > 0) {
      await goToSlide(currentSlideIndex - 1);
    }
  }, [currentSlideIndex, goToSlide]);

  // Load lecture: use optimistic state from Editor for instant render, then sync from DB in background
  useEffect(() => {
    if (!lectureId) {
      setLoading(false);
      return;
    }

    const state = location.state as { optimisticSlides?: Slide[]; optimisticLecture?: { id: string; title?: string; lecture_code?: string; slides?: unknown; current_slide_index?: number; settings?: Record<string, unknown> } } | null;
    const optimistic = state?.optimisticSlides?.length && state?.optimisticLecture?.id === lectureId;
    const initialSlideIndex = state?.optimisticLecture?.current_slide_index ?? 0;

    if (optimistic && state?.optimisticSlides && state?.optimisticLecture) {
      setSlides(state.optimisticSlides);
      setLecture(state.optimisticLecture);
      setLectureCode(state.optimisticLecture.lecture_code || '');
      setCurrentSlideIndex(initialSlideIndex);
      setLoading(false);
    }

    const loadLecture = async () => {
      try {
        const data = await getLecture(lectureId);
        if (data) {
          // Deep-merge settings: optimistic nav from Editor may omit webinarCta; DB must not be replaced wholesale.
          const dbSettings =
            data.settings && typeof data.settings === "object"
              ? (data.settings as Record<string, unknown>)
              : {};
          const optSettings =
            optimistic && state?.optimisticLecture?.settings && typeof state.optimisticLecture.settings === "object"
              ? (state.optimisticLecture.settings as Record<string, unknown>)
              : {};
          const mergedSettings = { ...dbSettings, ...optSettings };
          // Editor may send webinarCta: null to clear unsaved CTA vs stale DB after navigate-to-present.
          if (
            optimistic &&
            optSettings &&
            Object.prototype.hasOwnProperty.call(optSettings, "webinarCta") &&
            optSettings.webinarCta === null
          ) {
            delete mergedSettings.webinarCta;
          }
          const mergedLecture = { ...data, settings: mergedSettings };
          setLecture(mergedLecture);
          if (!optimistic) {
            const rawSlides = (data.slides as unknown as Slide[]) || [];
            setSlides(ensureSlidesDesignDefaults(rawSlides));
            setCurrentSlideIndex(data.current_slide_index ?? 0);
          }
          setLectureCode(data.lecture_code);
          setIsLive(data.status === 'active');
        }
      } catch (error) {
        console.error('Error loading lecture:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLecture();
  }, [lectureId, location.state]);

  // Load students and subscribe - only after loading completes to reduce initial load
  useEffect(() => {
    if (!lectureId || loading) return;

    const loadStudents = async () => {
      try {
        const data = await getStudents(lectureId);
        setStudents(data);
      } catch (error) {
        console.error('Error loading students:', error);
      }
    };

    loadStudents();

    const { channel, dispose } = subscribeStudents(
      lectureId,
      (newStudents) => {
        setStudents(newStudents as any[]);
      },
      {
        onChannelStatus: (status) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.warn("[Present] students postgres realtime:", status);
            schedulePresentPgReconnect();
          }
        },
      }
    );

    return () => {
      dispose();
      supabase.removeChannel(channel);
    };
  }, [lectureId, loading, presentPgReconnectKey, schedulePresentPgReconnect]);

  // Stable response subscription: one channel for ALL responses in this lecture (avoids channel churn per slide).
  useEffect(() => {
    if (!lectureId) return;

    const channel = supabase
      .channel(`responses-${lectureId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "responses",
          filter: `lecture_id=eq.${lectureId}`,
        },
        (payload) => {
          const newRow = payload.new as Record<string, unknown> | undefined;
          const rowSlideIndex = newRow && typeof newRow.slide_index === "number" ? newRow.slide_index : null;
          if (rowSlideIndex === null || !newRow) return;
          const existing = responsesBySlideRef.current.get(rowSlideIndex) ?? [];
          setResponsesForSlide(rowSlideIndex, [...existing, newRow]);
        }
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("[Present] responses postgres realtime:", status, err?.message);
          schedulePresentPgReconnect();
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lectureId, presentPgReconnectKey, schedulePresentPgReconnect, setResponsesForSlide]);

  // Fetch responses on slide change (no channel churn — the subscription above is stable)
  useEffect(() => {
    if (!lectureId || !currentSlide) return;

    const loadResponses = async () => {
      try {
        const cached = responsesBySlideRef.current.get(currentSlideIndex);
        setResponses(cached ?? []);
        const data = await getResponses(lectureId, currentSlideIndex);
        setResponsesForSlide(currentSlideIndex, data);
      } catch (error) {
        console.error('Error loading responses:', error);
      }
    };

    loadResponses();
  }, [lectureId, currentSlideIndex, currentSlide]);

  // Polling backup for responses when realtime may lag (only during live presentation on interactive/quiz slides)
  const RESPONSE_POLL_INTERVAL_MS = 3000;
  useEffect(() => {
    if (!lectureId || !currentSlide || !isLive) return;
    const slideInfo = SLIDE_TYPES.find(t => t.type === currentSlide.type);
    const acceptsResponses = slideInfo?.category === 'interactive' || slideInfo?.category === 'quiz';
    if (!acceptsResponses) return;

    const poll = async () => {
      try {
        const data = await getResponses(lectureId!, currentSlideIndex);
        setResponsesForSlide(currentSlideIndex, data);
      } catch (e) {
        console.error('[Present] Response poll error:', e);
      }
    };

    const id = setInterval(poll, RESPONSE_POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [lectureId, currentSlideIndex, currentSlide, isLive, setResponsesForSlide]);

  // Supabase Presence: live online count (students track on lecture-presence channel)
  useEffect(() => {
    if (!lectureId || loading) return;

    const channel = createPresenterPresenceChannel(lectureId);
    const applyPresence = () => {
      const state = channel.presenceState();
      presenceStateRef.current = state;
      setPresenceOnlineCount(countPresenceOnline(state));
    };

    channel
      .on("presence", { event: "sync" }, applyPresence)
      .on("presence", { event: "join" }, applyPresence)
      .on("presence", { event: "leave" }, applyPresence)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") applyPresence();
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lectureId, loading]);

  // Reactions now handled on the lecture-sync channel above (emoji_reaction event).

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

    reloadQuestionsRef.current = () => {
      void loadQuestions();
    };

    loadQuestions();

    let questionsDebounceId: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase
      .channel(`questions-${lectureId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "questions",
          filter: `lecture_id=eq.${lectureId}`,
        },
        () => {
          if (questionsDebounceId) clearTimeout(questionsDebounceId);
          questionsDebounceId = setTimeout(() => {
            questionsDebounceId = null;
            void loadQuestions();
          }, 250);
        }
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("[Present] questions postgres realtime:", status, err?.message);
          schedulePresentPgReconnect();
        }
      });

    return () => {
      if (questionsDebounceId) clearTimeout(questionsDebounceId);
      supabase.removeChannel(channel);
    };
  }, [lectureId, presentPgReconnectKey, schedulePresentPgReconnect]);

  // Safety net while the presenter watches Q&A: Realtime can lag under classroom load.
  useEffect(() => {
    if (!lectureId || !showQuestionsPanel) return;
    const id = window.setInterval(() => {
      try {
        reloadQuestionsRef.current();
      } catch (e) {
        console.warn("[Present] questions poll reload:", e);
      }
    }, 2000);
    return () => window.clearInterval(id);
  }, [lectureId, showQuestionsPanel]);

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

  // Keyboard navigation — placed after toggleFullscreen / isFullscreen exist (avoids TDZ)
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
          exitToEditor();
        }
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [slides.length, navigate, lectureId, isFullscreen, toggleFullscreen, handleNextSlide, handlePrevSlide, exitToEditor]);

  // Fullscreen is not auto-requested; user can click fullscreen button or press F.
  // Auto-fullscreen was removed to avoid blocking the Start button and improve responsiveness.

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
    if (!lectureId || isStartingLecture || slides.length === 0) return;
    setIsStartingLecture(true);
    try {
      void logProductEvent({
        userId: lecture?.user_id,
        event: "present_started",
        lectureId,
        metadata: { lecture_mode: lecture?.lecture_mode, slides_count: slides.length },
      });
      const idx = effectiveSlideIndex;
      const targetSlide = slides[idx];
      const activityStartedAt =
        targetSlide && isParticipativeSlide(targetSlide.type)
          ? new Date().toISOString()
          : null;
      setLecture((prev: any) =>
        prev
          ? {
              ...prev,
              status: "active",
              current_slide_index: idx,
              activity_started_at: activityStartedAt,
            }
          : prev,
      );
      sendSlideBroadcast(lectureId, idx, activityStartedAt);
      const updated = await startLecture(lectureId, {
        current_slide_index: idx,
        activity_started_at: activityStartedAt,
      });
      if (updated) setLecture(updated);
      setIsLive(true);
      setShowQRCode(false);
      toast.success("Presentation started");
    } catch (e) {
      console.error("[Present] startLecture:", e);
      toast.error(e instanceof Error ? e.message : "Failed to start presentation");
    } finally {
      setIsStartingLecture(false);
    }
  };

  const handleEndLecture = async () => {
    if (!lectureId || isEnding) return;
    setIsEnding(true);
    setShowWrapUp(true);
    void logProductEvent({
      userId: lecture?.user_id,
      event: "lecture_ended",
      lectureId,
      metadata: { lecture_mode: lecture?.lecture_mode, students: students.length, responses: responses.length },
    });
    endLecture(lectureId).catch((e) => {
      console.error(e);
      toast.error('Failed to end lecture');
    });
    setIsEnding(false);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(lectureCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const joinUrl =
    lectureCode.length === 6
      ? `${getJoinPageOrigin()}/join?code=${lectureCode}`
      : `${getJoinPageOrigin()}/join`;
  const joinUrlDisplay = joinUrl.replace(/^https?:\/\//i, "").split("?")[0] || "join";

  const aggregatedResults = useMemo(
    () => buildLiveResultsPayload(currentSlide, responses),
    [currentSlide, responses],
  );

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
    <div className="h-screen max-h-screen bg-foreground text-primary-foreground flex flex-col relative overflow-hidden">
      {/* Background particles */}
      <FloatingParticles count={30} color="rgba(255, 255, 255, 0.1)" />
      
      {/* Confetti effect */}
      <Confetti isActive={showConfetti} />

      {raffleWheelNames && raffleWheelNames.length > 0 && (
        <RaffleWheelOverlay
          key={raffleWheelNames.join("\u0000")}
          names={raffleWheelNames}
          onSpinComplete={finishRaffleWithWinner}
        />
      )}

      {raffleWinnerName && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 pointer-events-none px-4">
          <div className="rounded-3xl bg-card border border-border px-10 py-12 text-center shadow-2xl max-w-lg pointer-events-auto">
            <p className="text-sm uppercase tracking-wider text-muted-foreground mb-2">Winner</p>
            <p className="font-display text-4xl sm:text-5xl font-bold text-foreground">{raffleWinnerName}</p>
          </div>
        </div>
      )}

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

      {/* Top bar — minimal: exit, compact stats, tools (QR via floating button) */}
      <div className="flex-shrink-0 flex items-center justify-between gap-2 py-2 px-3 sm:px-4 bg-background/10 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2 min-w-0 shrink">
        <Button
          variant="ghost"
          size="sm"
          className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 shrink-0 h-9"
          onClick={exitToEditor}
        >
          <X className="w-4 h-4" />
          <span className="hidden sm:inline">Exit</span>
        </Button>
        </div>

        <div className="flex items-center justify-center gap-2 sm:gap-3 min-w-0 flex-1 overflow-hidden">
          <div
            className="flex items-center gap-1.5 text-primary-foreground/85 text-sm tabular-nums shrink-0"
            title={
              isLive
                ? `${presenceOnlineCount} online · ${students.length} joined total`
                : `${students.length} joined`
            }
          >
            <Users className="w-4 h-4 shrink-0 opacity-80" />
            <span className="font-medium">{isLive ? presenceOnlineCount : students.length}</span>
            <span className="hidden md:inline text-xs text-primary-foreground/55">online</span>
          </div>
          <div
            className="hidden sm:flex items-center gap-1.5 text-primary-foreground/75 text-xs shrink-0"
            title={isSlideSyncConnected ? "Live slide broadcast is connected" : "Using database and polling fallback if live broadcast is delayed"}
          >
            <span className={`h-2 w-2 rounded-full ${isSlideSyncConnected ? "bg-green-400" : "bg-amber-400"}`} />
            <span>{isSlideSyncConnected ? "Live sync" : "Sync fallback"}</span>
          </div>
          {currentSlide && (isInteractiveSlide(currentSlide.type) || isQuizSlide(currentSlide.type)) && (
            <div
              className="flex items-center gap-1 text-primary-foreground/85 text-xs sm:text-sm shrink min-w-0"
              title="Total responses"
            >
              <span className="hidden sm:inline">Total responses:</span>
              <span className="font-bold tabular-nums">{responses.length}</span>
            </div>
          )}
          {participative && hasTimer && inVotingPhase && !Number.isNaN(startedAtMs) && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-violet-500/25 text-violet-50 border border-violet-400/25 shrink-0">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs font-bold tabular-nums">{remainingSec}s</span>
            </div>
          )}
          {participative && hasTimer && inResultsPhase && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-500/25 text-teal-50 text-[10px] sm:text-xs font-medium shrink-0">
              Results
            </div>
          )}
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          {/* Questions button with badge */}
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 sm:w-auto sm:px-2 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 relative p-0 sm:p-2"
            onClick={() => setShowQuestionsPanel(true)}
            title="View student questions"
          >
            <HelpCircle className="w-4 h-4" />
            {unansweredQuestionsCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[1.125rem] h-[1.125rem] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unansweredQuestionsCount}
              </span>
            )}
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
              <span className="ml-1 text-xs hidden lg:inline">{showMiniLeaderboard ? "Hide" : "Show"} Top 5</span>
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
            onClick={() => {
              setShowGame(true);
              slideSyncChannelRef.current?.send({
                type: "broadcast",
                event: "game_active",
                payload: { active: true },
              });
            }}
            title="Start Fruit Catch game"
          >
            <Gamepad2 className="w-4 h-4" />
          </Button>
          {isLive && lecture?.lecture_mode === "webinar" && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className={
                  webinarCta?.label?.trim() && webinarCta?.url?.trim()
                    ? "text-primary-foreground hover:text-primary-foreground bg-primary-foreground/15 ring-1 ring-amber-400/40 shadow-inner"
                    : "text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
                }
                onClick={() => broadcastWebinarCta()}
                title={
                  webinarCta?.label?.trim() && webinarCta?.url?.trim()
                    ? `Send “${webinarCta.label.trim()}” to every phone (opens in a new tab)`
                    : "Configure label + URL in Editor → Webinar settings, then Save"
                }
              >
                <Link2 className="w-4 h-4" />
                <span className="ml-1 text-xs hidden sm:inline">CTA</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => pickRaffleWinner()}
                title="Pick a random online participant"
              >
                <Sparkles className="w-4 h-4" />
                <span className="ml-1 text-xs hidden sm:inline">Raffle</span>
              </Button>
            </>
          )}
          {/* End question early (participative slides with timer) */}
          {currentSlide && participative && hasTimer && inVotingPhase && (
            <Button
              variant="default"
              size="sm"
              className="bg-teal-600 hover:bg-teal-700 text-white"
              onClick={() => void handleSkipToResults()}
              title="Show results now (skip remaining time)"
            >
              <Check className="w-4 h-4" />
              <span className="ml-1 text-xs">End question</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Content - flex-1 min-h-0 so it shrinks and fits viewport */}
      <div data-present-main-content className="flex-1 min-h-0 flex items-center justify-center p-0.5 md:p-1 relative">
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
            className="relative w-full max-w-full h-full max-h-full min-h-0 min-w-0 flex items-center justify-center mx-0.5 md:mx-2 lg:mx-3"
          >
            {participative &&
              hasTimer &&
              inVotingPhase &&
              currentSlide &&
              isQuizSlide(currentSlide.type) && (
                <div
                  className="pointer-events-none absolute top-0 left-1/2 z-30 -translate-x-1/2 px-3 py-1.5 rounded-b-lg bg-black/55 text-white/95 text-xs sm:text-sm font-medium tabular-nums border border-white/15 border-t-0 shadow-lg backdrop-blur-sm max-w-[min(100%,28rem)] text-center"
                  title="Participation while vote breakdown is hidden"
                >
                  {students.length > 0
                    ? `${responses.length} / ${students.length} answered`
                    : `${responses.length} answered`}
                </div>
              )}
            {currentSlide && (
              <div className="aspect-video w-full max-w-full max-h-full overflow-hidden rounded-xl">
              <SlideFrame>
                <BuilderPreviewProvider allowContentScroll={true}>
                  <SlideLayoutProvider slide={currentSlide}>
                    <SlideRenderer
                      slide={currentSlide}
                      isEditing={false}
                      showResults={showLiveResults}
                      liveResults={aggregatedResults}
                      totalResponses={responses.length}
                      hideFooter={true}
                      showCorrectAnswer={showCorrectAnswerEffective}
                      forceShowStats={true}
                      themeId={(currentSlide?.design?.themeId as ThemeId) ?? "academic-pro"}
                      designStyleId={(currentSlide?.design?.designStyleId as DesignStyleId) ?? "dynamic"}
                    />
                  </SlideLayoutProvider>
                </BuilderPreviewProvider>
              </SlideFrame>
              </div>
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

      {/* Join QR — always one tap; stays above slide dots */}
      <Button
        type="button"
        onClick={() => setShowQRCode(true)}
        title="Show join link & QR code"
        className="fixed bottom-[4.5rem] right-4 z-[35] h-12 sm:h-14 gap-2 rounded-full pl-3 pr-4 sm:pl-4 sm:pr-5 shadow-xl bg-white text-foreground hover:bg-white/95 font-semibold text-sm border border-white/40 pointer-events-auto"
        size="lg"
      >
        <QrCode className="w-6 h-6 shrink-0 text-violet-700" />
        <span className="hidden sm:inline">Join QR</span>
      </Button>

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
                  End lecture
                </>
              )}
            </Button>
            <span className="text-xs text-primary-foreground/70">You're on the last slide</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation - Dots */}
      <div className="flex-shrink-0 flex flex-col items-center justify-center py-2 px-4 bg-background/10 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentSlideIndex
                  ? "w-8 bg-primary-foreground"
                  : "bg-primary-foreground/30 hover:bg-primary-foreground/50"
              }`}
            />
          ))}
        </div>
      </div>

      {/* QR Code Overlay - fast open/close, always closeable */}
      <AnimatePresence>
        {showQRCode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]"
            onClick={() => setShowQRCode(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="relative z-[101] bg-card/95 backdrop-blur-md rounded-3xl shadow-2xl border border-border/40 max-w-[min(95vw,480px)] max-h-[90vh] overflow-y-auto flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 pb-0 flex-shrink-0 sticky top-0 z-10 bg-card/95 backdrop-blur-md">
                <h3 className="font-display font-bold text-xl md:text-2xl text-card-foreground">Join the Lecture</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 text-muted-foreground hover:text-foreground flex-shrink-0"
                  onClick={() => setShowQRCode(false)}
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </Button>
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
                    <p className="font-bold text-2xl text-card-foreground break-all">{joinUrlDisplay}</p>
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
                <div className="px-6 pb-6 flex-shrink-0">
                  <Button
                    variant="hero"
                    size="lg"
                    className="w-full h-14 text-lg"
                    onClick={handleStartLecture}
                    disabled={isStartingLecture || !lectureId}
                  >
                    {isStartingLecture ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        Starting…
                      </span>
                    ) : (
                      <>
                        <Play className="w-6 h-6" />
                        Start Presentation
                      </>
                    )}
                  </Button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wrap-up Overlay: encourage duplicate + next lesson */}
      <AnimatePresence>
        {showWrapUp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110]"
            onClick={() => setShowWrapUp(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              transition={{ duration: 0.15 }}
              className="relative z-[111] bg-card/95 backdrop-blur-md rounded-3xl shadow-2xl border border-border/40 w-full max-w-[min(95vw,520px)] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <h3 className="font-display font-bold text-xl md:text-2xl text-card-foreground">
                  Session finished
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  If you’d like, you can duplicate this lesson and adjust it for next time.
                </p>
                {(students.length > 0 || responses.length > 0) && (
                  <div className="mt-4 rounded-2xl border border-border/60 bg-muted/30 p-3">
                    <p className="text-sm font-semibold text-card-foreground">
                      Want a little more detail?
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Plans unlock richer analytics and export-ready reporting.
                    </p>
                    <div className="mt-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          const pricingPath =
                            lecture?.lecture_mode === "webinar" ? "/webinar/pricing" : "/pricing";
                          navigate(pricingPath);
                        }}
                      >
                        See plans
                      </Button>
                    </div>
                  </div>
                )}
                <div className="mt-5 grid gap-2">
                  <Button
                    variant="secondary"
                    size="lg"
                    disabled={isDuplicating || !lectureId}
                    onClick={async () => {
                      if (!lectureId) return;
                      setIsDuplicating(true);
                      try {
                        const newLecture = await duplicateLecture(lectureId);
                        const isWebinar = lecture?.lecture_mode === "webinar";
                        toast.success("Duplicated.");
                        navigate(isWebinar ? `/webinar/editor/${newLecture.id}` : `/editor/${newLecture.id}`, {
                          state: { preloadedLecture: newLecture },
                        });
                      } catch (e) {
                        console.error(e);
                        toast.error("Failed to duplicate");
                      } finally {
                        setIsDuplicating(false);
                        setShowWrapUp(false);
                      }
                    }}
                  >
                    {isDuplicating ? (
                      <>
                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Duplicating…
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5 mr-2" />
                        Duplicate to edit
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => {
                      const analyticsQs = lecture?.lecture_mode === "webinar" ? "?track=webinar" : "";
                      navigate(`/lecture/${lectureId}/analytics${analyticsQs}`, {
                        replace: true,
                        state: { fromPresent: { lecture, slides, students } },
                      });
                    }}
                  >
                    View analytics
                  </Button>
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={() => {
                      setShowWrapUp(false);
                      navigate(lecture?.lecture_mode === "webinar" ? "/webinar/dashboard" : "/dashboard", { replace: true });
                    }}
                  >
                    Back to dashboard
                  </Button>
                </div>
              </div>
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
            onClose={() => {
              setShowGame(false);
              slideSyncChannelRef.current?.send({
                type: "broadcast",
                event: "game_active",
                payload: { active: false },
              });
            }}
          />
        )}
      </AnimatePresence>

    </div>
  );
};

export default Present;
