import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Presentation, Send, MessageCircle, X, CheckCircle, Check, Trophy, Loader2, ThumbsUp, ThumbsDown, GripVertical, RefreshCw, Clock, Sparkles, ExternalLink } from "lucide-react";
import { Confetti } from "@/components/effects/Confetti";
import { toast } from "sonner";
import {
  decodeJoinUrlFragment,
  getLectureByCode,
  normalizeLectureJoinCode,
  subscribeLecture,
  submitResponse,
  setStudentActive,
} from "@/lib/lectureService";
import {
  createLectureSyncChannel,
  createStudentPresenceChannel,
} from "@/lib/liveChannels";
import { supabase, removeAllChannels } from "@/integrations/supabase/client";
import {
  Slide,
  SentimentMeterSlideContent,
  AgreeSpectrumSlideContent,
  getResolvedActivitySettings,
  DEFAULT_POINTS_CORRECT,
  DEFAULT_POINTS_PARTICIPATION,
} from "@/types/slides";
import { Json } from "@/integrations/supabase/types";
import { StudentGameControls } from "@/components/game";
import { ThemeId, getTheme, getSafeOptionColor } from "@/types/themes";
import { darkenHex, getPresentationLogoUrl } from "@/lib/presentationBranding";
import {
  DEFAULT_WEBINAR_PRIMARY_COLOR,
  mergeWebinarRegistrationFromSettings,
} from "@/types/webinarRegistration";
import { SlideChromeProvider } from "@/contexts/SlideChromeContext";
import { ensureSlidesDesignDefaults } from "@/lib/designDefaults";
import { getActivityPhaseState } from "@/lib/activityPhase";

const REALTIME_RESUBSCRIBE_DELAY_MS = 1000;
const BROADCAST_REFETCH_DEBOUNCE_MS = 280;

/** Ensure CTA opens on mobile (many browsers require a sync navigation from the tap). */
function normalizeCtaUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  const lower = t.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:")) return "";
  if (/^https?:\/\//i.test(t) || /^mailto:/i.test(t) || /^tel:/i.test(t)) return t;
  return `https://${t}`;
}

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
  const rawLectureCodeParam = useParams().lectureCode ?? "";
  const lectureJoinCode =
    normalizeLectureJoinCode(decodeJoinUrlFragment(rawLectureCodeParam)) ?? "";
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const studentId = searchParams.get("studentId") || "";

  // Cleanup ALL channels when unmounting to prevent orphan subscriptions.
  useEffect(() => {
    return () => {
      removeAllChannels();
    };
  }, []);

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
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false);
  const [lastReaction, setLastReaction] = useState<string | null>(null);
  /** postgres_changes on lectures */
  const [isDbRealtimeConnected, setIsDbRealtimeConnected] = useState(true);
  /** lecture-sync broadcast channel (slide_changed) */
  const [isBroadcastConnected, setIsBroadcastConnected] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isGameActive, setIsGameActive] = useState(false);
  const [tick, setTick] = useState(0);
  const [rankingOrder, setRankingOrder] = useState<string[]>([]);
  // For new slide types
  const [sentimentValue, setSentimentValue] = useState([50]);
  const [agreeValue, setAgreeValue] = useState([50]);
  const [pointsEarnedAnimation, setPointsEarnedAnimation] = useState<number | null>(null);
  const [realtimeReconnectKey, setRealtimeReconnectKey] = useState(0);
  const realtimeReconnectAttemptsRef = useRef(0);
  const [ctaOverlay, setCtaOverlay] = useState<{ label: string; url: string } | null>(null);
  const [studentRaffleName, setStudentRaffleName] = useState<string | null>(null);
  const previousPointsRef = React.useRef<number>(0);
  /** Prevents double / rapid taps from submitting multiple responses before React state updates. */
  const responseSubmitLockRef = useRef(false);
  const lastBroadcastSlideIndexRef = React.useRef<number | null>(null);
  const lastBroadcastTsRef = React.useRef<number>(0);
  const broadcastRefetchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lectureSyncChannelRef = React.useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastAppliedUpdatedAtRef = React.useRef<string | null>(null);
  const slidesRef = React.useRef<Slide[]>([]);
  /** presenterWallClockMs - Date.now() at receive => skew vs local clock for timer alignment */
  const clockOffsetMsRef = React.useRef(0);

  React.useEffect(() => {
    slidesRef.current = slides;
  }, [slides]);

  const awaitingSlidePayload =
    slides.length > 0 && currentSlideIndex >= slides.length;
  const effectiveSlideIndex = useMemo(() => {
    if (!slides.length) return 0;
    return Math.min(Math.max(0, currentSlideIndex), slides.length - 1);
  }, [slides.length, currentSlideIndex]);

  const currentSlide = awaitingSlidePayload ? undefined : slides[effectiveSlideIndex];
  const wordDraftKey = useMemo(() => {
    if (!lecture?.id) return null;
    return `clasly_worddraft_${lecture.id}_${currentSlideIndex}`;
  }, [lecture?.id, currentSlideIndex]);

  useEffect(() => {
    if (!wordDraftKey || currentSlide?.type !== "wordcloud") return;
    try {
      const saved = sessionStorage.getItem(wordDraftKey);
      if (saved && !wordInput) setWordInput(saved);
    } catch {
      // sessionStorage can be unavailable in private browsing.
    }
    // Only hydrate when the slide/draft key changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordDraftKey, currentSlide?.type]);

  useEffect(() => {
    if (!wordDraftKey || currentSlide?.type !== "wordcloud") return;
    try {
      sessionStorage.setItem(wordDraftKey, wordInput);
    } catch {
      // sessionStorage can be unavailable in private browsing.
    }
  }, [wordDraftKey, wordInput, currentSlide?.type]);

  const activityPhase = useMemo(
    () =>
      getActivityPhaseState(currentSlide ?? null, lecture?.activity_started_at as string | undefined, {
        nowMs: Date.now(),
        clockOffsetMs: clockOffsetMsRef.current,
      }),
    [currentSlide, lecture?.activity_started_at, tick]
  );
  const participativeSlide = activityPhase.participative;
  const hasTimer = activityPhase.hasTimer;
  const inVotingPhase = activityPhase.inVotingPhase;
  const inResultsPhase = activityPhase.inResultsPhase;
  const remainingSec = activityPhase.remainingSec;
  const startedAtMs = activityPhase.startedAtMs;

  useEffect(() => {
    if (!lecture?.id) return;
    const id = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [lecture?.id]);

  const presentationLogoUrl = useMemo(() => getPresentationLogoUrl(slides), [slides]);

  const webinarReg = useMemo(
    () => mergeWebinarRegistrationFromSettings(lecture?.settings),
    [lecture?.settings],
  );
  const webinarLogoUrl = webinarReg.branding?.logoUrl?.trim();
  const webinarPrimary =
    webinarReg.branding?.primaryColor && /^#[0-9A-Fa-f]{6}$/.test(webinarReg.branding.primaryColor)
      ? webinarReg.branding.primaryColor
      : DEFAULT_WEBINAR_PRIMARY_COLOR;
  /** Slide logo wins; else logo from webinar registration settings (same as join form). */
  const headerLogoUrl = presentationLogoUrl ?? webinarLogoUrl;
  const isWebinarLecture = lecture?.lecture_mode === "webinar";
  const isLectureLive = lecture?.status === "active";
  const headerSurfaceStyle = useMemo((): React.CSSProperties | undefined => {
    if (!isWebinarLecture) return undefined;
    const deep = darkenHex(webinarPrimary, 0.32);
    return {
      background: `linear-gradient(145deg, ${webinarPrimary} 0%, ${deep} 52%, #0a0f18 100%)`,
    };
  }, [isWebinarLecture, webinarPrimary]);

  // After a successful submit the lock stays true until the slide changes; broadcast slide_changed
  // used to reset hasAnswered but not the lock — taps were ignored on the next slide.
  useEffect(() => {
    responseSubmitLockRef.current = false;
  }, [effectiveSlideIndex, currentSlide?.id]);

  // Theme from current slide design first, then lecture settings, so option colors match presenter
  const themeId: ThemeId = (currentSlide?.design?.themeId as ThemeId) ?? (lecture?.settings?.themeId as ThemeId) ?? 'academic-pro';
  const theme = getTheme(themeId);
  const getOptionColor = (index: number) => getSafeOptionColor(theme, index);

  // Load lecture and subscribe to updates
  useEffect(() => {
    if (!lectureJoinCode) {
      setLoading(false);
      return;
    }

    const loadLecture = async () => {
      try {
        const data = await getLectureByCode(lectureJoinCode);
        if (data) {
          setLecture(data);
          setSlides(ensureSlidesDesignDefaults((data.slides as unknown as Slide[]) || []));
          setCurrentSlideIndex(data.current_slide_index || 0);
        }
      } catch (error) {
        console.error('Error loading lecture:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLecture();
  }, [lectureJoinCode]);

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
    const newSlides = ensureSlidesDesignDefaults((updatedLecture.slides as unknown as Slide[]) || []);
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
        responseSubmitLockRef.current = false;
        setHasAnswered(false);
        setSelectedOption(null);
        setWordInput("");
        setNumberInput("");
        setScaleValue([3]);
        setRankingOrder([]);
        setSentimentValue([50]);
        setAgreeValue([50]);
      }
      return indexToApply;
    });

    const localLen = slidesRef.current.length;
    const needMoreSlides =
      localLen > 0 && indexToApply >= localLen;
    const broadcastMergeHold = recentlyFromBroadcast && !fromRefetch;
    const applySlides =
      newSlides.length > 0 &&
      (fromRefetch ||
        !broadcastMergeHold ||
        (needMoreSlides && newSlides.length > localLen));
    if (applySlides) {
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
    setIsDbRealtimeConnected(false);

    let pollIntervalMs = 2500; // Layer 3: start 2.5s, backoff up to 8s when realtime is healthy
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

    // Lightweight poll: fetch only sync-relevant columns, NOT the full slides JSONB.
    // Full slides are fetched only when updated_at changes (via refetchLectureState).
    const pollForUpdates = async () => {
      try {
        const { data, error } = await supabase
          .from('lectures')
          .select('current_slide_index, updated_at, activity_started_at, status')
          .eq('id', lecture.id)
          .single();

        if (error) {
          console.error('[Student] Poll error:', error);
          pollIntervalMs = Math.min(pollIntervalMs * 1.3, 10000);
        } else if (data) {
          const nextActivityAt = data.activity_started_at ?? null;
          if (
            data.current_slide_index !== lastSlideIndex ||
            data.updated_at !== lastUpdatedAt ||
            nextActivityAt !== lastActivityStartedAt
          ) {
            console.log('[Student] Poll detected change - slide:', data.current_slide_index);
            lastSlideIndex = data.current_slide_index;
            lastActivityStartedAt = nextActivityAt;
            if (data.updated_at !== lastUpdatedAt) {
              lastUpdatedAt = data.updated_at;
              void refetchLectureState(lecture.id, false);
            } else {
              applyLectureUpdate({ ...lecture, ...data });
            }
            pollIntervalMs = 2500;
          } else if (isRealtimeActive) {
            pollIntervalMs = Math.min(pollIntervalMs * 1.15, 8000);
          }
        }
      } catch (err) {
        console.error('[Student] Poll exception:', err);
        pollIntervalMs = Math.min(pollIntervalMs * 1.3, 10000);
      }

      const nextDelay = !isRealtimeActive
        ? Math.min(pollIntervalMs, 1500)
        : pollIntervalMs;
      pollTimeoutId = setTimeout(pollForUpdates, nextDelay);
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
            pollIntervalMs = 5000;
          }
        }
      )
      .subscribe((status, err) => {
        console.log('[Student] Subscription status:', status, err);
        isRealtimeActive = status === 'SUBSCRIBED';
        setIsDbRealtimeConnected(status === 'SUBSCRIBED');

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          const attempts = realtimeReconnectAttemptsRef.current;
          if (attempts < 8) {
            const delay = Math.min(REALTIME_RESUBSCRIBE_DELAY_MS * Math.pow(2, attempts), 30000);
            console.warn(`[Student] Realtime error, retry #${attempts + 1} in ${delay}ms`);
            realtimeReconnectAttemptsRef.current = attempts + 1;
            pollIntervalMs = 1500;
            setTimeout(() => setRealtimeReconnectKey((k) => k + 1), delay);
          } else {
            console.warn('[Student] Realtime max retries reached, relying on polling only');
            pollIntervalMs = 2000;
          }
        }
        if (status === 'SUBSCRIBED') {
          realtimeReconnectAttemptsRef.current = 0;
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
      .on("broadcast", { event: "game_active" }, ({ payload }) => {
        const p = payload as { active?: boolean };
        setIsGameActive(!!p?.active);
      })
      .on('broadcast', { event: 'slide_changed' }, ({ payload }) => {
        const p = payload as {
          currentSlideIndex?: number;
          lectureId?: string;
          ts?: number;
          activityStartedAt?: string | null;
          presenterWallClockMs?: number;
        };
        const newIndex = p.currentSlideIndex;
        if (typeof newIndex === 'number') {
          const wall =
            typeof p.presenterWallClockMs === 'number'
              ? p.presenterWallClockMs
              : typeof p.ts === 'number'
                ? p.ts
                : undefined;
          if (wall !== undefined) {
            clockOffsetMsRef.current = wall - Date.now();
          }
          lastBroadcastSlideIndexRef.current = newIndex;
          lastBroadcastTsRef.current = Date.now();
          // Apply immediately so student sees the right slide without waiting for refetch
          setCurrentSlideIndex(newIndex);
          if (p.activityStartedAt !== undefined) {
            setLecture((prev: any) =>
              prev ? { ...prev, activity_started_at: p.activityStartedAt } : prev
            );
          }
          responseSubmitLockRef.current = false;
          setHasAnswered(false);
          setSelectedOption(null);
          setWordInput('');
          setNumberInput('');
          setScaleValue([3]);
          setRankingOrder([]);
          setSentimentValue([50]);
          setAgreeValue([50]);
          const lid = lecture.id;
          void refetchLectureState(lid, true);
          if (broadcastRefetchTimeoutRef.current) clearTimeout(broadcastRefetchTimeoutRef.current);
          broadcastRefetchTimeoutRef.current = setTimeout(() => {
            broadcastRefetchTimeoutRef.current = null;
            void refetchLectureState(lid, true);
          }, BROADCAST_REFETCH_DEBOUNCE_MS);
        }
      })
      .subscribe((status) => {
        console.log('[Student] Slide sync channel status:', status);
        setIsBroadcastConnected(status === 'SUBSCRIBED');
      });

    return () => {
      lectureSyncChannelRef.current = null;
      if (broadcastRefetchTimeoutRef.current) clearTimeout(broadcastRefetchTimeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [lecture?.id, refetchLectureState]);

  // Game activation is detected via the lecture-sync channel (game_active event).
  // The actual game channel (game-${id}) is only created when StudentGameControls mounts,
  // avoiding an eager channel allocation for every student.

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

  const PRESENCE_HEARTBEAT_MS = 25_000;
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
        const rd = data.response_data as { answer?: unknown } | null;
        if (rd && typeof rd.answer === "number") {
          setSelectedOption(rd.answer);
        } else if (rd && typeof rd.answer === "boolean") {
          setSelectedOption(rd.answer ? 0 : 1);
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

  const handleSubmitResponse = async (
    responseData: any,
    isCorrect?: boolean,
    points?: number
  ): Promise<boolean> => {
    if (!lecture?.id || !studentId || hasAnswered || inResultsPhase) return false;
    if (!isLectureLive) {
      toast.message("This session isn't live right now.");
      return false;
    }
    if (responseSubmitLockRef.current) return false;
    responseSubmitLockRef.current = true;

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
      toast.success("Answer recorded successfully", {
        description: "Your response was saved. You can’t change it now.",
        duration: 4000,
      });
      if (isCorrect) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
      const ch = lectureSyncChannelRef.current;
      const responsePayload = { lectureId: lecture.id, slideIndex: currentSlideIndex };
      if (ch) {
        ch.send({ type: 'broadcast', event: 'response_changed', payload: responsePayload });
        setTimeout(() => {
          lectureSyncChannelRef.current?.send({
            type: 'broadcast',
            event: 'response_changed',
            payload: responsePayload,
          });
        }, 220);
      }
      return true;
    } catch (error) {
      console.error('Error submitting response:', error);
      toast.error("Couldn't save your answer. Try again.");
      responseSubmitLockRef.current = false;
      return false;
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
    if (hasAnswered || inResultsPhase || isSubmitting || responseSubmitLockRef.current) return;
    setSelectedOption(index);
    const content = currentSlide?.content as any;
    const isCorrect = content?.correctAnswer === index;
    const points = isCorrect ? pts.pointsForCorrect : pts.pointsForParticipation;
    handleSubmitResponse({ answer: index }, isCorrect, points);
  };

  const handlePollAnswer = (index: number) => {
    if (hasAnswered || inResultsPhase || isSubmitting || responseSubmitLockRef.current) return;
    setSelectedOption(index);
    handleSubmitResponse({ answer: index }, undefined, pts.pointsForParticipation);
  };

  const handleYesNo = (answer: boolean) => {
    if (hasAnswered || inResultsPhase || isSubmitting || responseSubmitLockRef.current) return;
    setSelectedOption(answer ? 0 : 1);
    const content = currentSlide?.content as {
      correctAnswer?: boolean;
      correctIsYes?: boolean;
    };
    const correctYes =
      typeof content?.correctAnswer === "boolean"
        ? content.correctAnswer
        : typeof content?.correctIsYes === "boolean"
          ? content.correctIsYes
          : undefined;
    const isCorrect =
      typeof correctYes === "boolean" ? correctYes === answer : undefined;
    const points =
      isCorrect === true ? pts.pointsForCorrect : isCorrect === false ? pts.pointsForParticipation : pts.pointsForParticipation;
    handleSubmitResponse({ answer }, isCorrect, points);
  };

  const handleWordSubmit = async () => {
    const trimmed = wordInput.trim();
    if (!trimmed || hasAnswered || inResultsPhase || isSubmitting || responseSubmitLockRef.current) return;
    const ok = await handleSubmitResponse({ word: trimmed }, undefined, pts.pointsForParticipation);
    if (ok) {
      setWordInput("");
      if (wordDraftKey) {
        try {
          sessionStorage.removeItem(wordDraftKey);
        } catch {
          // sessionStorage can be unavailable in private browsing.
        }
      }
    }
  };

  const handleNumberSubmit = () => {
    const num = parseInt(numberInput);
    if (isNaN(num) || hasAnswered || inResultsPhase || isSubmitting || responseSubmitLockRef.current) return;
    const content = currentSlide?.content as any;
    const isCorrect = content?.correctNumber === num;
    const points = isCorrect ? pts.pointsForCorrect : pts.pointsForParticipation;
    handleSubmitResponse({ guess: num }, isCorrect, points);
  };

  const handleScaleSubmit = () => {
    if (hasAnswered || inResultsPhase || isSubmitting || responseSubmitLockRef.current) return;
    handleSubmitResponse({ value: scaleValue[0] }, undefined, pts.pointsForParticipation);
  };

  const handleSentimentSubmit = () => {
    if (hasAnswered || inResultsPhase || isSubmitting || responseSubmitLockRef.current) return;
    handleSubmitResponse({ value: sentimentValue[0] }, undefined, pts.pointsForParticipation);
  };

  const handleAgreeSubmit = () => {
    if (hasAnswered || inResultsPhase || isSubmitting || responseSubmitLockRef.current) return;
    handleSubmitResponse({ value: agreeValue[0] }, undefined, pts.pointsForParticipation);
  };

  const handleRankingSubmit = () => {
    if (hasAnswered || inResultsPhase || isSubmitting || responseSubmitLockRef.current) return;
    const items = rankingOrder.length > 0 ? rankingOrder : ((currentSlide?.content as any).items || []);
    handleSubmitResponse({ ranking: items }, undefined, pts.pointsForParticipation);
  };

  // Send emoji reaction via the existing lecture-sync broadcast channel (no separate channel needed)
  const handleSendReaction = (emoji: string) => {
    if (!isLectureLive) {
      toast.message("This session isn't live right now.");
      return;
    }
    setLastReaction(emoji);
    setTimeout(() => setLastReaction(null), 1000);

    if (lectureSyncChannelRef.current) {
      lectureSyncChannelRef.current.send({
        type: 'broadcast',
        event: 'emoji_reaction',
        payload: {
          emoji,
          studentId,
          studentName: student?.name,
          timestamp: Date.now(),
        }
      }).catch((err) => {
        console.error('[Student] Failed to send emoji:', err);
      });
    }
  };

  // Submit question to database
  const handleSubmitQuestion = async () => {
    if (!questionText.trim() || !lecture?.id || isSubmittingQuestion) return;
    if (!isLectureLive) {
      setQuestionError("This session isn't live right now.");
      return;
    }

    try {
      setIsSubmittingQuestion(true);
      setQuestionError(null);
      const { error } = await supabase.from('questions').insert({
        lecture_id: lecture.id,
        student_id: studentId || null,
        question: questionText.trim(),
      });
      if (error) throw error;
      // Broadcast hint so presenter UI updates instantly even if postgres_changes is delayed.
      lectureSyncChannelRef.current?.send({
        type: "broadcast",
        event: "question_new",
        payload: { lectureId: lecture.id },
      }).catch(() => {});
      toast.success("Question sent", {
        description: "The presenter can see it in their queue.",
        duration: 2200,
      });
      setQuestionText("");
      setShowQuestionForm(false);
    } catch (error) {
      console.error('Error submitting question:', error);
      setQuestionError("Couldn’t send your question. Check your connection and try again.");
    } finally {
      setIsSubmittingQuestion(false);
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
  if (lecture && !studentId && (lectureJoinCode || rawLectureCodeParam)) {
    navigate(
      `/join?code=${encodeURIComponent(lectureJoinCode || rawLectureCodeParam)}`,
      { replace: true },
    );
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

  const recordCtaLeadClick = () => {
    if (lecture?.id) {
      const leadId = sessionStorage.getItem(`clasly_lead_${lecture.id}`);
      if (leadId) {
        void supabase
          .from("lecture_leads")
          .update({ cta_clicked_at: new Date().toISOString() })
          .eq("id", leadId);
      }
    }
  };

  return (
    <SlideChromeProvider hideCornerLogo={!!headerLogoUrl}>
    <div className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-background">
      <Confetti isActive={showConfetti} />

      <AnimatePresence>
        {ctaOverlay && (() => {
          const ctaHref = normalizeCtaUrl(ctaOverlay.url);
          return (
          <motion.div
            key="cta"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[95] flex flex-col justify-end bg-black/60 backdrop-blur-[2px] p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          >
            <motion.div
              initial={{ y: 48, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 32, opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className="w-full max-w-lg mx-auto rounded-3xl border border-white/10 p-5 shadow-2xl shadow-black/40"
              style={{
                background: `linear-gradient(to bottom, ${webinarPrimary}f2, ${darkenHex(webinarPrimary, 0.25)} 45%, #0f172a 100%)`,
              }}
            >
              <div className="flex items-center gap-2 text-violet-100/90 text-xs font-semibold uppercase tracking-wider mb-3">
                <Sparkles className="w-4 h-4 text-amber-300 shrink-0" aria-hidden />
                From the host
              </div>
              <p className="text-sm text-violet-100/80 mb-4 leading-snug">
                Opens in a new tab. You can close this card anytime.
              </p>
              {ctaHref ? (
                <>
                  <button
                    type="button"
                    className="w-full min-h-[3.75rem] rounded-2xl bg-white text-violet-950 text-lg font-bold shadow-lg shadow-black/25 flex items-center justify-center gap-2 active:scale-[0.99] transition-transform hover:bg-violet-50"
                    onClick={() => {
                      recordCtaLeadClick();
                      window.open(ctaHref, "_blank", "noopener,noreferrer");
                      window.setTimeout(() => setCtaOverlay(null), 0);
                    }}
                  >
                    {ctaOverlay.label}
                    <ExternalLink className="w-5 h-5 opacity-80 shrink-0" aria-hidden />
                  </button>
                  <p className="mt-3 text-[11px] text-violet-200/80 break-all font-mono leading-snug text-center">
                    {ctaHref}
                  </p>
                </>
              ) : (
                <p className="text-sm text-amber-200/90 text-center py-2">Invalid link from host. Ask them to check the URL in editor.</p>
              )}
              <button
                type="button"
                onClick={() => setCtaOverlay(null)}
                className="mt-6 w-full py-2.5 text-sm font-medium text-violet-200/90 hover:text-white transition-colors"
              >
                Not now
              </button>
            </motion.div>
          </motion.div>
          );
        })()}
      </AnimatePresence>

      {studentRaffleName && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 px-4 pointer-events-none">
          <div className="rounded-2xl bg-card border px-8 py-10 text-center shadow-xl pointer-events-auto max-w-sm w-full">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Winner</p>
            <p className="text-3xl font-display font-bold">{studentRaffleName}</p>
          </div>
        </div>
      )}

      {/* Header: session title + logo first, then participant row */}
      <header
        className={`relative shrink-0 px-3 sm:px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-primary-foreground ${
          headerSurfaceStyle ? "" : "bg-gradient-primary"
        }`}
        style={headerSurfaceStyle}
      >
        <div className="border-b border-primary-foreground/15 pb-3 mb-3 text-center w-full min-w-0">
          {headerLogoUrl ? (
            <div className="flex justify-center mb-2 shrink-0">
              <img
                src={headerLogoUrl}
                alt="Host logo"
                className="max-h-12 sm:max-h-16 w-auto max-w-[min(100%,320px)] object-contain object-center opacity-95 drop-shadow-md"
              />
            </div>
          ) : null}
          <h1 className="font-display font-semibold text-[15px] sm:text-base leading-snug text-primary-foreground px-1 break-words hyphens-auto max-w-full mx-auto line-clamp-4">
            {(lecture?.title && String(lecture.title).trim()) || "Live session"}
          </h1>
        </div>
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-full bg-primary-foreground/20 flex items-center justify-center text-lg sm:text-xl">
              {student?.emoji || "😊"}
            </div>
            <div className="relative min-w-0 flex-1">
              <p className="font-medium truncate">{student?.name || "Student"}</p>
              <div className="flex items-center gap-1 text-sm text-primary-foreground/80">
                <Trophy className="w-3 h-3 shrink-0" />
                <span className="tabular-nums">{student?.points ?? 0} points</span>
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
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/20"
              onClick={() => lecture?.id && refetchLectureState(lecture.id)}
              title="Refresh to see latest"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <span
              className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-sm text-primary-foreground/80 shrink-0"
              title="DB = postgres realtime on lectures. Live = slide broadcast channel."
            >
              <span className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${isDbRealtimeConnected ? "bg-green-400" : "bg-amber-400"}`} />
                <span className="text-xs opacity-90">DB</span>
              </span>
              <span className="text-primary-foreground/50">·</span>
              <span className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${isBroadcastConnected ? "bg-green-400" : "bg-amber-400"}`} />
                <span className="text-xs opacity-90">Live</span>
              </span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Content - wrapped in Error Boundary so one render error does not crash the view */}
      <StudentErrorBoundary onBackToJoin={() => navigate('/join')}>
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-0">
        {lecture.status === 'draft' ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-6 text-center"
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
        ) : awaitingSlidePayload ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto px-4 py-6 text-center"
          >
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <h2 className="text-xl font-display font-bold text-foreground">
              Syncing with presenter…
            </h2>
            <p className="text-muted-foreground max-w-sm text-sm">
              Catching up to the current slide. This usually takes a moment.
            </p>
          </motion.div>
        ) : currentSlide && participativeSlide ? (
          hasTimer && inResultsPhase ? (
          !hasAnswered ? (
          <motion.div
            key={`${currentSlide.id}-timeup`}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="mx-auto flex min-h-0 w-full max-w-full flex-1 flex-col items-center justify-center px-4 py-8 text-center sm:max-w-lg"
          >
            <div className="w-full rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-muted/30 p-8 shadow-xl">
              <Clock className="mx-auto mb-4 h-12 w-12 text-amber-500" />
              <p className="mb-2 font-display text-lg font-bold text-foreground">Time’s up</p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                You didn’t submit an answer in time. Look at the main screen for the results and the correct answer.
              </p>
            </div>
          </motion.div>
          ) : (
          <motion.div
            key={`${currentSlide.id}-results`}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="mx-auto flex min-h-0 w-full max-w-full flex-1 flex-col items-center justify-center px-4 py-8 text-center sm:max-w-lg"
          >
            <div className="w-full rounded-2xl border border-border/60 bg-gradient-to-br from-teal-500/10 via-card to-violet-500/10 p-8 shadow-xl">
              <Sparkles className="mx-auto mb-4 h-12 w-12 text-teal-500" />
              <p className="mb-2 font-display text-lg font-bold text-foreground">Results are live</p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                The full breakdown stays on the presenter screen. Your phone is only the remote — you’re not missing slides here on purpose.
              </p>
            </div>
          </motion.div>
          )
          ) : hasAnswered ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto flex min-h-0 w-full max-w-full flex-1 flex-col items-center justify-center px-4 py-8 text-center sm:max-w-lg"
          >
            <div className="w-full rounded-2xl border border-border/60 bg-card/80 px-6 py-10 text-center shadow-lg backdrop-blur sm:px-8 sm:py-12">
              <CheckCircle className="mx-auto mb-4 h-14 w-14 text-teal-500" />
              <p className="mb-2 text-lg font-semibold text-foreground">Answer recorded successfully</p>
              <p className="text-muted-foreground">
                Your response was saved. You can’t change it now.
                {hasTimer && inVotingPhase ? (
                  <span className="block mt-2">Waiting for the presenter to continue.</span>
                ) : (
                  <span className="block mt-2">Your phone is the remote — follow the main screen.</span>
                )}
              </p>
            </div>
          </motion.div>
          ) : (
          <motion.div
            key={currentSlide.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            aria-busy={isSubmitting}
            className={`flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden bg-card px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:mx-auto md:max-w-3xl md:rounded-2xl md:border md:border-border/50 md:p-6 md:shadow-lg ${isSubmitting ? "opacity-[0.92]" : ""}`}
          >
            {/* Timer bar */}
            {participativeSlide && hasTimer && !Number.isNaN(startedAtMs) && (
              <div className="flex items-center justify-between gap-2 mb-3 px-3 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
                <div className="flex items-center gap-1.5 text-violet-700 dark:text-violet-200">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-medium">Time left</span>
                </div>
                <span className="text-lg font-bold tabular-nums text-violet-700 dark:text-violet-100">
                  {remainingSec}s
                </span>
              </div>
            )}

            <div className="mb-3 rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2 font-medium text-primary">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving your answer…
                </span>
              ) : hasTimer && inVotingPhase ? (
                <span>Answer now. The timer is synced with the presenter.</span>
              ) : (
                <span>Answer when ready. Your response is saved only after confirmation.</span>
              )}
            </div>

            {/* Question */}
            <h2 className="text-lg sm:text-xl font-display font-bold text-foreground mb-3 leading-snug">
              {(currentSlide.content as any).question || (currentSlide.content as any).statement || (currentSlide.content as any).sentenceStart || (currentSlide.content as any).title}
            </h2>

            {/* ─── Quiz / Poll / Poll_quiz ─── */}
            {(currentSlide.type === 'quiz' || currentSlide.type === 'poll' || currentSlide.type === 'poll_quiz') && (() => {
              const options: string[] = (currentSlide.content as any).options || [];
              const isGrid = options.length >= 4;
              if (options.length === 0) {
                return (
                  <div className="flex flex-1 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-center">
                    <div>
                      <p className="font-semibold text-foreground">Question is not ready</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        The presenter screen is still syncing the answer options. Tap refresh or wait a moment.
                      </p>
                    </div>
                  </div>
                );
              }
              return (
                <div className={isGrid ? "grid grid-cols-2 gap-2.5 flex-1" : "flex flex-col gap-2.5 flex-1"}>
                  {options.map((option: string, index: number) => (
                    <motion.button
                      type="button"
                      key={index}
                      onClick={() => (currentSlide.type === 'quiz' || currentSlide.type === 'poll_quiz') ? handleQuizAnswer(index) : handlePollAnswer(index)}
                      disabled={hasAnswered || isSubmitting}
                      whileTap={{ scale: hasAnswered ? 1 : 0.97 }}
                      className={`w-full rounded-2xl text-left transition-all text-white font-semibold shadow-md active:shadow-inner touch-manipulation ${
                        isGrid
                          ? "px-3.5 py-4 text-[15px] leading-snug min-h-[3.5rem]"
                          : "px-4 py-4 text-base sm:text-lg min-h-[3.25rem]"
                      } ${
                        selectedOption === index
                          ? "ring-[3px] ring-white ring-offset-2 ring-offset-background scale-[1.02]"
                          : hasAnswered
                          ? "opacity-40"
                          : ""
                      } ${getOptionColor(index)}`}
                    >
                      {option}
                    </motion.button>
                  ))}
                </div>
              );
            })()}

            {/* ─── Yes / No ─── */}
            {(currentSlide.type === 'yesno' || currentSlide.type === 'yesno_interactive') && (
              <div className="grid grid-cols-2 gap-3 flex-1 content-center touch-manipulation">
                <motion.button
                  type="button"
                  onClick={() => handleYesNo(true)}
                  disabled={hasAnswered || isSubmitting}
                  whileTap={{ scale: hasAnswered ? 1 : 0.95 }}
                  className={`flex flex-col items-center justify-center gap-2 rounded-2xl py-6 transition-all shadow-lg active:shadow-inner ${
                    hasAnswered && selectedOption === 0
                      ? "ring-[3px] ring-white scale-[1.02]"
                      : hasAnswered
                      ? "opacity-40"
                      : ""
                  } bg-gradient-to-br from-emerald-500 to-green-600 text-white`}
                >
                  <ThumbsUp className="w-8 h-8" />
                  <span className="text-lg font-bold">{(currentSlide.content as any).yesLabel || 'Yes'}</span>
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => handleYesNo(false)}
                  disabled={hasAnswered || isSubmitting}
                  whileTap={{ scale: hasAnswered ? 1 : 0.95 }}
                  className={`flex flex-col items-center justify-center gap-2 rounded-2xl py-6 transition-all shadow-lg active:shadow-inner ${
                    hasAnswered && selectedOption === 1
                      ? "ring-[3px] ring-white scale-[1.02]"
                      : hasAnswered
                      ? "opacity-40"
                      : ""
                  } bg-gradient-to-br from-rose-500 to-red-600 text-white`}
                >
                  <ThumbsDown className="w-8 h-8" />
                  <span className="text-lg font-bold">{(currentSlide.content as any).noLabel || 'No'}</span>
                </motion.button>
              </div>
            )}

            {/* ─── Word Cloud ─── */}
            {currentSlide.type === 'wordcloud' && (
              <div className="flex flex-col gap-3 flex-1 justify-center">
                <Input
                  value={wordInput}
                  onChange={(e) => setWordInput(e.target.value)}
                  placeholder="Type your word…"
                  className="h-14 rounded-xl text-lg px-4 border-2 border-border focus-visible:border-primary"
                  disabled={hasAnswered || isSubmitting}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !hasAnswered && !isSubmitting) void handleWordSubmit();
                  }}
                />
                <Button
                  variant="hero"
                  size="lg"
                  className="w-full h-12 rounded-xl text-base font-semibold"
                  onClick={() => void handleWordSubmit()}
                  disabled={!wordInput.trim() || hasAnswered || isSubmitting}
                >
                  {hasAnswered ? (
                    <><Check className="w-5 h-5" /> Recorded</>
                  ) : isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <><Send className="w-5 h-5" /> Submit</>
                  )}
                </Button>
              </div>
            )}

            {/* ─── Guess Number ─── */}
            {(currentSlide.type === 'guess_number' || currentSlide.type === 'guess_number_interactive') && (
              <div className="flex flex-col gap-3 flex-1 justify-center">
                <div className="flex items-center justify-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-sm font-medium text-muted-foreground">
                    Range: {(currentSlide.content as any).minRange || 1} – {(currentSlide.content as any).maxRange || 100}
                  </span>
                </div>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={numberInput}
                  onChange={(e) => setNumberInput(e.target.value)}
                  placeholder="Your guess…"
                  className="h-16 rounded-xl text-2xl text-center font-bold border-2 border-border focus-visible:border-primary tabular-nums"
                  disabled={hasAnswered || isSubmitting}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !hasAnswered && !isSubmitting) handleNumberSubmit();
                  }}
                />
                <Button
                  variant="hero"
                  size="lg"
                  className="w-full h-12 rounded-xl text-base font-semibold"
                  onClick={handleNumberSubmit}
                  disabled={!numberInput || hasAnswered || isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  Submit Guess
                </Button>
              </div>
            )}

            {/* ─── Scale ─── */}
            {currentSlide.type === 'scale' && (
              <div className="flex flex-col gap-4 flex-1 justify-center">
                <div className="text-center">
                  <span className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-3xl font-bold text-primary tabular-nums">
                    {scaleValue[0]}
                  </span>
                </div>
                <div className="px-1">
                  <Slider
                    value={scaleValue}
                    onValueChange={setScaleValue}
                    min={1}
                    max={(currentSlide.content as any).scaleOptions?.steps || 5}
                    step={1}
                    disabled={hasAnswered || isSubmitting}
                    className="py-3"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{(currentSlide.content as any).scaleOptions?.minLabel || 'Low'}</span>
                    <span>{(currentSlide.content as any).scaleOptions?.maxLabel || 'High'}</span>
                  </div>
                </div>
                <Button
                  variant="hero"
                  size="lg"
                  className="w-full h-12 rounded-xl text-base font-semibold"
                  onClick={handleScaleSubmit}
                  disabled={hasAnswered || isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  Submit Rating
                </Button>
              </div>
            )}

            {/* ─── Sentiment Meter ─── */}
            {currentSlide.type === 'sentiment_meter' && (
              <div className="flex flex-col gap-4 flex-1 justify-center">
                <div className="flex items-end justify-between px-1">
                  <span className="text-4xl">{(currentSlide.content as SentimentMeterSlideContent).leftEmoji || '😡'}</span>
                  <span className="text-2xl font-bold text-primary tabular-nums">{sentimentValue[0]}%</span>
                  <span className="text-4xl">{(currentSlide.content as SentimentMeterSlideContent).rightEmoji || '😍'}</span>
                </div>
                <div className="px-1">
                  <Slider
                    value={sentimentValue}
                    onValueChange={setSentimentValue}
                    min={0}
                    max={100}
                    step={1}
                    disabled={hasAnswered || isSubmitting}
                    className="py-3"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{(currentSlide.content as SentimentMeterSlideContent).leftLabel || 'Not great'}</span>
                    <span>{(currentSlide.content as SentimentMeterSlideContent).rightLabel || 'Amazing'}</span>
                  </div>
                </div>
                <Button
                  variant="hero"
                  size="lg"
                  className="w-full h-12 rounded-xl text-base font-semibold"
                  onClick={handleSentimentSubmit}
                  disabled={hasAnswered || isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  Submit
                </Button>
              </div>
            )}

            {/* ─── Agree / Disagree Spectrum ─── */}
            {currentSlide.type === 'agree_spectrum' && (
              <div className="flex flex-col gap-4 flex-1 justify-center">
                <div className="text-center">
                  <span className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-2xl font-bold text-primary tabular-nums">
                    {agreeValue[0]}%
                  </span>
                </div>
                <div className="px-1">
                  <Slider
                    value={agreeValue}
                    onValueChange={setAgreeValue}
                    min={0}
                    max={100}
                    step={1}
                    disabled={hasAnswered || isSubmitting}
                    className="py-3"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span className="max-w-[45%]">{(currentSlide.content as AgreeSpectrumSlideContent).leftLabel || 'Strongly Disagree'}</span>
                    <span className="max-w-[45%] text-right">{(currentSlide.content as AgreeSpectrumSlideContent).rightLabel || 'Strongly Agree'}</span>
                  </div>
                </div>
                <Button
                  variant="hero"
                  size="lg"
                  className="w-full h-12 rounded-xl text-base font-semibold"
                  onClick={handleAgreeSubmit}
                  disabled={hasAnswered || isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  Submit
                </Button>
              </div>
            )}

            {/* ─── Ranking (drag-and-drop) ─── */}
            {currentSlide.type === 'ranking' && (
              <div className="flex flex-col gap-2.5 flex-1 min-h-0">
                <Reorder.Group
                  axis="y"
                  values={rankingOrder.length > 0 ? rankingOrder : ((currentSlide.content as any).items || [])}
                  onReorder={setRankingOrder}
                  className="flex flex-col gap-2 flex-1 min-h-0"
                >
                  {(rankingOrder.length > 0 ? rankingOrder : ((currentSlide.content as any).items || [])).map((item: string, index: number) => (
                    <Reorder.Item
                      key={item}
                      value={item}
                      className={`flex items-center gap-2.5 px-3 py-3 rounded-xl text-white shadow-md touch-manipulation ${
                        hasAnswered ? 'opacity-50 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
                      } ${getOptionColor(index)}`}
                      drag={!hasAnswered ? "y" : false}
                      whileDrag={{ scale: 1.03, boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }}
                    >
                      <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold shrink-0">
                        {index + 1}
                      </span>
                      <span className="font-medium flex-1 text-[15px] leading-snug">{item}</span>
                      <GripVertical className="w-4 h-4 text-white/50 shrink-0" />
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
                <Button
                  variant="hero"
                  size="lg"
                  className="w-full h-12 rounded-xl text-base font-semibold shrink-0"
                  onClick={handleRankingSubmit}
                  disabled={hasAnswered || isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  Submit Ranking
                </Button>
              </div>
            )}
          </motion.div>
          )
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto flex min-h-0 w-full max-w-full flex-1 flex-col space-y-4 overflow-y-auto px-4 py-4 sm:max-w-3xl"
          >
            <div className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur p-5 text-center shadow-lg">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                <Presentation className="w-4 h-4" />
                {lecture.status === "active" ? "Live now" : "Session ended"}
              </div>
              <h2 className="mt-3 text-2xl font-display font-bold text-foreground">
                {lecture.status === "active" ? "You’re in." : "Thanks for joining"}
              </h2>
              <p className="mt-1 text-muted-foreground">
                {lecture.status === "active"
                  ? "Follow along here. When the host launches an interactive question, it’ll appear instantly."
                  : "The live session has finished."}
              </p>
            </div>

          </motion.div>
        )}
      </main>
      </StudentErrorBoundary>

      {/* Reaction Bar */}
      <div className="shrink-0 border-t border-border/50 bg-card/50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
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

      {/* Question form: bottom sheet, lifted above safe area (not centered) — stays visible above home indicator / keyboard */}
      <AnimatePresence>
        {showQuestionForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 px-4 pt-10 backdrop-blur-sm"
            onClick={() => setShowQuestionForm(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 340 }}
              className="w-full max-w-lg rounded-t-2xl border border-border/60 bg-card p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl max-h-[min(78vh,30rem)] overflow-y-auto mb-[max(3.5rem,env(safe-area-inset-bottom))]"
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
                {questionError && (
                  <p className="text-sm text-destructive">{questionError}</p>
                )}
                <Button
                  variant="hero"
                  className="w-full"
                  onClick={handleSubmitQuestion}
                  disabled={!questionText.trim() || isSubmittingQuestion}
                >
                  {isSubmittingQuestion ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Send Question
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </SlideChromeProvider>
  );
};

export default Student;
