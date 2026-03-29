import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EditorTopToolbar } from "@/components/editor/EditorTopToolbar";
import { SlideRenderer } from "@/components/editor/SlideRenderer";
import { SlideFrame } from "@/components/editor/SlideFrame";
import { ImportPresentationDialog } from "@/components/editor/ImportPresentationDialog";
import { AddSlidePickerDialog } from "@/components/editor/AddSlidePickerDialog";
import { SortableSlideItem } from "@/components/editor/SortableSlideItem";
import { AnimateButton } from "@/components/editor/AnimateButton";
import { ThemeId } from "@/types/themes";
import { DesignStyleId } from "@/types/designStyles";
import {
  Slide,
  SlideType,
  SlideContent,
  SlideDesign,
  SLIDE_TYPES,
  createNewSlide,
  isQuizSlide,
  isParticipativeSlide,
  ActivitySettings,
} from "@/types/slides";
import {
  Play,
  Plus,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Type,
  FileText,
  Image,
  HelpCircle,
  BarChart3,
  Cloud,
  CheckCircle,
  ListOrdered,
  Hash,
  Sliders,
  Save,
  Loader2,
  Wand2,
  Sparkles,
  Upload,
  MessageSquare,
  Heart,
  ArrowLeftRight,
  Eye,
  Columns,
  List,
  Clock,
  BarChart,
  Home,
} from "lucide-react";
import { getLecture, updateLecture, createLecture } from "@/lib/lectureService";
import { hydratePendingSlideImages, type PendingSlideImage } from "@/lib/hydrateSlideImages";
import { toast } from "sonner";
import { useSubscriptionContext } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useConstrainedViewport } from "@/hooks/use-constrained-viewport";
import { UpgradeModal, useUpgradeModal } from "@/components/billing/UpgradeModal";
import ChatPanel from "@/components/builder/ChatPanel";
import { useConversationalBuilder } from "@/hooks/useConversationalBuilder";
import { useBuilderConversationPersistence } from "@/hooks/useBuilderConversationPersistence";
import { supabase } from "@/integrations/supabase/client";
import { getEdgeFunctionErrorMessage, getEdgeFunctionStatus, withTimeout } from "@/lib/supabaseFunctions";
import { ensureSlidesDesignDefaults } from "@/lib/designDefaults";
import { BuilderPreviewProvider } from "@/contexts/BuilderPreviewContext";
import { SlideLayoutProvider } from "@/contexts/SlideLayoutContext";
import { OutOfCreditsModal } from "@/components/credits/OutOfCreditsModal";
import { motion, AnimatePresence } from "framer-motion";

function isCreateFromScratchRequest(msg: string): boolean {
  const t = msg.trim().toLowerCase();
  const hePatterns = /תכין|תבנה|תעשה|תיצור|תכינו|בנה לי|עשה לי|יצור (לי )?(הרצאה|מצגת|מצגות|פרזנטציה)/i;
  const enPatterns = /^(create|build|make|generate)\s+(a\s+)?(presentation|lecture|deck)/i;
  return hePatterns.test(t) || enPatterns.test(t) || /הרצאה על|lecture about|presentation about/i.test(t);
}

function arePlaceholderOrEmptySlides(slides: Slide[]): boolean {
  if (!slides?.length) return true;
  const first = slides[0]?.content as { title?: string };
  const isPlaceholder =
    first?.title === "Generating your presentation..." ||
    first?.title?.includes("Building...") ||
    (slides.some((s) => {
      const c = s.content as { title?: string; text?: string };
      return c?.text === "Building..." || c?.title === "Building...";
    }));
  return !!isPlaceholder;
}

const AI_PROGRESS_MESSAGES = [
  "Analyzing your topic…",
  "Planning slide flow…",
  "Writing slides…",
  "Finishing up…",
];

const BUILDER_TIPS = [
  'Students join with a QR code—no app download needed.',
  'Add quizzes and polls to boost engagement during your lecture.',
  'Change slide themes anytime—each presentation can have its own style.',
  'AI can refine your slides—describe changes in the chat to apply them instantly.',
  'Export your presentation to images or PDF when you\'re done.',
  'Present live—students answer in real time on their phones.',
  'Try the mobile preview to see how your slides look on small screens.',
];

// Icon mapping for slide types
const SLIDE_ICONS: Record<SlideType, React.ElementType> = {
  title: Type,
  content: FileText,
  image: Image,
  split_content: Columns,
  before_after: ArrowLeftRight,
  bullet_points: List,
  timeline: Clock,
  bar_chart: BarChart,
  quiz: HelpCircle,
  poll: BarChart3,
  wordcloud: Cloud,
  yesno: CheckCircle,
  ranking: ListOrdered,
  guess_number: Hash,
  scale: Sliders,
  finish_sentence: MessageSquare,
  sentiment_meter: Heart,
  agree_spectrum: ArrowLeftRight,
};

const Editor = () => {
  const { lectureId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, isLoading: isAuthLoading } = useAuth();
  const isMobile = useIsMobile();
  const [lectureTitle, setLectureTitle] = useState("Untitled Lecture");
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [lectureDbId, setLectureDbId] = useState<string | null>(null);
  const [lectureCode, setLectureCode] = useState<string>("");
  const [lectureMode, setLectureMode] = useState<"education" | "webinar">(() =>
    lectureId === "new" &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("track") === "webinar"
      ? "webinar"
      : "education",
  );
  const [webinarCtaLabel, setWebinarCtaLabel] = useState("");
  const [webinarCtaUrl, setWebinarCtaUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showAddSlidePicker, setShowAddSlidePicker] = useState(false);
  const [selectedThemeId, setSelectedThemeId] = useState<ThemeId>('academic-pro');
  const [selectedDesignStyleId, setSelectedDesignStyleId] = useState<DesignStyleId>('dynamic');
  const [simulationData, setSimulationData] = useState<any>(null);
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [showOutOfCreditsModal, setShowOutOfCreditsModal] = useState(false);
  const [isInitialGenerating, setIsInitialGenerating] = useState(false);
  const [aiGenTipIndex, setAiGenTipIndex] = useState(0);
  const [aiProgressStage, setAiProgressStage] = useState(0);
  const hasTriggeredInitialGen = useRef(false);
  /** Where to send the user if lecture load fails (matches track / loaded lecture_mode). */
  const editorErrorHomeRef = useRef<"/dashboard" | "/webinar/dashboard">("/dashboard");
  // Start with logical size so no layout shift when ResizeObserver runs
  const [slideSize, setSlideSize] = useState<{ width: number; height: number; scale?: number } | null>({ width: 960, height: 540, scale: 1 });

  // Subscription & upgrade modal
  const { isFree, maxSlides, isPro, hasAITokens, isLoading: isSubLoading } = useSubscriptionContext();
  const { showUpgradeModal, UpgradeModal: UpgradeModalComponent } = useUpgradeModal();

  // Initialize with proper Slide objects
  const [slides, setSlides] = useState<Slide[]>([
    createNewSlide('title', 0),
  ]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // AI Panel (useConversationalBuilder) — MUST run before displaySlides (sandboxSlides)
  const {
    sandboxSlides,
    sessionLectureId,
    setSandboxSlides,
    setCurrentPreviewIndex,
    addMessage,
    updateLastMessage,
    setIsGenerating,
    isGenerating,
    messages,
    originalPrompt,
    targetAudience,
    setOriginalPrompt,
    setGeneratedTheme,
    reset: resetConversationalBuilder,
    ensureSessionForLecture,
  } = useConversationalBuilder();

  // Prefer sandbox only when AI panel is open for this lecture (avoids stale global sandbox breaking editor)
  const effectiveLectureId = String(lectureDbId || lectureId);
  const useSandbox =
    sandboxSlides.length > 0 &&
    isAIPanelOpen &&
    effectiveLectureId === String(sessionLectureId);
  const displaySlides = useSandbox ? sandboxSlides : slides;
  const safeIndex = Math.min(currentSlideIndex, Math.max(0, displaySlides.length - 1));
  const currentSlide = displaySlides[safeIndex];
  const slidesGenerationLocked = isGenerating || isInitialGenerating;
  const slidePreviewRef = useRef<HTMLDivElement>(null);
  const isConstrainedViewport = useConstrainedViewport();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const skipScrollSyncRef = useRef(false);
  const saveInProgressRef = useRef(false);

  useBuilderConversationPersistence({
    userId: user?.id,
    messages,
    lectureId: lectureDbId || null,
    originalPrompt: originalPrompt || undefined,
    targetAudience: targetAudience || undefined,
  });

  const dashboardHome = lectureMode === "webinar" ? "/webinar/dashboard" : "/dashboard";

  // New deck: lecture mode follows URL (?track=webinar) only — no in-editor toggle.
  useEffect(() => {
    if (lectureId !== "new") return;
    setLectureMode(searchParams.get("track") === "webinar" ? "webinar" : "education");
    editorErrorHomeRef.current =
      searchParams.get("track") === "webinar" ? "/webinar/dashboard" : "/dashboard";
  }, [lectureId, searchParams]);

  // When entering /editor/new with prompt+ai=1 (from Dashboard "Generate with AI"), reset all state so we always create a fresh presentation
  useEffect(() => {
    const prompt = searchParams.get('prompt');
    const ai = searchParams.get('ai');
    if (lectureId !== 'new' || !prompt || ai !== '1') return;
    resetConversationalBuilder();
    hasTriggeredInitialGen.current = false;
    setLectureDbId(null);
    setLectureCode('');
    setSlides([createNewSlide('title', 0)]);
    setLectureTitle('Untitled Lecture');
    setCurrentSlideIndex(0);
    setHasChanges(false);
  }, [lectureId, searchParams, resetConversationalBuilder]);

  // Scope / clear sandbox whenever lecture route changes (not only when AI panel is open)
  useEffect(() => {
    if (!lectureId) return;
    ensureSessionForLecture(lectureDbId || lectureId);
  }, [lectureId, lectureDbId, ensureSessionForLecture]);

  // /editor/new without AI prompt — empty deck, no stale sandbox
  useEffect(() => {
    if (lectureId !== 'new' || searchParams.get('prompt')) return;
    resetConversationalBuilder();
    setLectureDbId(null);
    setLectureCode('');
    setSlides([createNewSlide('title', 0)]);
    setLectureTitle('Untitled Lecture');
    setCurrentSlideIndex(0);
    setHasChanges(false);
  }, [lectureId, searchParams, resetConversationalBuilder]);

  // When landing with ?ai=1, open AI panel
  useEffect(() => {
    if (searchParams.get('ai') === '1') setIsAIPanelOpen(true);
  }, []);

  // On entering AI mode: scope chat, then init sandbox from Editor slides only when sandbox is empty or stale (e.g. after lecture load), so we never overwrite good slides with stale sandbox
  useEffect(() => {
    if (!isAIPanelOpen) return;
    const effectiveId = lectureDbId || lectureId || 'new';
    ensureSessionForLecture(effectiveId);
    if (searchParams.get('prompt')) return; // Generating fresh from URL - don't overwrite sandbox
    if (slides.length > 0 && (sandboxSlides.length === 0 || sandboxSlides.length < slides.length)) {
      setSandboxSlides(ensureSlidesDesignDefaults(slides));
      setCurrentPreviewIndex(Math.min(currentSlideIndex, slides.length - 1));
    }
  }, [isAIPanelOpen, lectureDbId, lectureId, slides, sandboxSlides.length, currentSlideIndex]);

  // When AI updates sandboxSlides: push to Editor slides. Preserve existing design (textAlign, direction, etc.) so Editor and Present stay identical (no flicker).
  const prevSandboxRef = useRef<string>('');
  useEffect(() => {
    if (!isAIPanelOpen || sandboxSlides.length === 0) return;
    const key = JSON.stringify(sandboxSlides.map((s) => {
      const c = s.content as Record<string, unknown>;
      const img = c?.imageUrl;
      const ov = s.design?.overlayImageUrl;
      return {
        id: s.id,
        type: s.type,
        order: s.order,
        title: c?.title,
        subtitle: c?.subtitle,
        text: (c?.text as string)?.slice(0, 200),
        question: c?.question,
        bulletPoints: c?.bulletPoints,
        imageUrl: img != null ? String(img).length : 0,
        overlayImageUrl: ov != null ? String(ov).length : 0,
      };
    }));
    if (key === prevSandboxRef.current) return;
    prevSandboxRef.current = key;
    setSlides((prevSlides) =>
      sandboxSlides.map((sb) => {
        const existing = prevSlides.find((s) => s.id === sb.id);
        if (!existing) return sb;
        // Prefer sandbox direction/textAlign when set (AI design) so layout stays stable
        const mergedDesign = {
          ...existing.design,
          ...sb.design,
          direction: sb.design?.direction ?? existing.design?.direction,
          textAlign: sb.design?.textAlign ?? existing.design?.textAlign,
        };
        return { ...sb, design: mergedDesign };
      })
    );
    setHasChanges(true);
  }, [isAIPanelOpen, sandboxSlides]);

  const runGenerateSlides = useCallback(async (prompt: string, audience: string) => {
    const slideCount = Math.min(maxSlides ?? (isFree ? 5 : 8), 10);
    if (!hasAITokens(slideCount)) {
      addMessage({ role: 'assistant', content: 'אין לך מספיק קרדיטים. שדרג את התוכנית שלך או רכוש קרדיטים נוספים כדי להמשיך.\n\nYou don\'t have enough credits. Upgrade your plan or purchase more credits to continue.', isLoading: false });
      setShowOutOfCreditsModal(true);
      return;
    }
    setOriginalPrompt(prompt, audience);
    setIsInitialGenerating(true);
    setIsGenerating(true);
    addMessage({ role: 'assistant', content: `I'm building a presentation now:\n\n"${prompt}"`, isLoading: true });
    // Do not set 7 empty placeholders – slides will appear one by one (Pro) or all at once when ready
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      if (sessionError || !session) throw new Error("Please sign in to generate presentations");

      let planData: { interpretation?: string; plan?: string; slideTypes?: string[] } | null = null;
      if (isPro) {
        let planRes = await supabase.functions.invoke('generate-slides', {
          body: {
            description: prompt,
            contentType: 'interactive',
            targetAudience: audience,
            slideCount,
            phase: 'plan',
            lectureMode,
          },
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (planRes.error && getEdgeFunctionStatus(planRes.error) === 503) {
          await new Promise((r) => setTimeout(r, 2500));
          planRes = await supabase.functions.invoke('generate-slides', {
            body: {
              description: prompt,
              contentType: 'interactive',
              targetAudience: audience,
              slideCount,
              phase: 'plan',
              lectureMode,
            },
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
        }
        if (planRes.error) {
          if (getEdgeFunctionStatus(planRes.error) === 402) setShowOutOfCreditsModal(true);
          throw new Error(await getEdgeFunctionErrorMessage(planRes.error, 'Failed to plan presentation.'));
        }
        const planPayload = planRes.data as { interpretation?: string; plan?: string; slideTypes?: string[]; error?: string };
        if (planPayload?.error) throw new Error(planPayload.error);
        if (planPayload?.interpretation || planPayload?.plan) {
          planData = {
            interpretation: planPayload.interpretation,
            plan: planPayload.plan,
            slideTypes: planPayload.slideTypes || [],
          };
          let planMsg = '';
          if (planPayload.interpretation) planMsg += `**What I understood:** ${planPayload.interpretation}\n\n`;
          if (planPayload.plan) planMsg += `**My plan:** ${planPayload.plan}\n\n`;
          planMsg += 'Building your slides one by one...';
          updateLastMessage(planMsg);
          // Reasoning-first: brief delay so user sees reasoning before slides start appearing
          await new Promise((r) => setTimeout(r, 1500));
        }
      }

      let processedSlides: Slide[];
      let resData: {
        error?: string;
        slides?: unknown[];
        theme?: unknown;
        plan?: string;
        interpretation?: string;
        pendingSlideImages?: PendingSlideImage[];
        lectureTitle?: string;
      };

      if (isPro && planData?.slideTypes?.length) {
        const accumulated: Slide[] = [];
        let generatedTheme: unknown = null;
        for (let i = 0; i < planData.slideTypes.length; i++) {
          let progRes = await supabase.functions.invoke('generate-slides', {
            body: {
              lectureMode,
              progressiveSlide: {
                index: i,
                slideType: planData.slideTypes[i],
                description: prompt,
                plan: planData.plan,
                interpretation: planData.interpretation,
                contentType: 'interactive',
              },
            },
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (progRes.error && getEdgeFunctionStatus(progRes.error) === 503) {
            await new Promise((r) => setTimeout(r, 2500));
            progRes = await supabase.functions.invoke('generate-slides', {
              body: {
                lectureMode,
                progressiveSlide: {
                  index: i,
                  slideType: planData.slideTypes[i],
                  description: prompt,
                  plan: planData.plan,
                  interpretation: planData.interpretation,
                  contentType: 'interactive',
                },
              },
              headers: { Authorization: `Bearer ${session.access_token}` },
            });
          }
          if (progRes.error) {
            if (getEdgeFunctionStatus(progRes.error) === 402) setShowOutOfCreditsModal(true);
            throw new Error(await getEdgeFunctionErrorMessage(progRes.error, `Failed to generate slide ${i + 1}.`));
          }
          const progPayload = progRes.data as { slide?: unknown; theme?: unknown; error?: string; lectureTitle?: string };
          if (progPayload?.error) throw new Error(progPayload.error);
          if (progPayload?.slide) {
            const s = progPayload.slide as Record<string, unknown>;
            accumulated.push({
              ...s,
              id: (s.id as string) || `${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
              order: i,
            } as Slide);
            if (progPayload.theme) generatedTheme = progPayload.theme;
            if (i === 0 && typeof progPayload.lectureTitle === 'string' && progPayload.lectureTitle.trim()) {
              setLectureTitle(progPayload.lectureTitle.trim().slice(0, 200));
            } else if (i === 0) {
              const tit = (s.content as { title?: string } | undefined)?.title;
              if (typeof tit === 'string' && tit.trim()) setLectureTitle(tit.trim().slice(0, 200));
            }
            setSandboxSlides(ensureSlidesDesignDefaults(accumulated.map((slide, idx) => ({ ...slide, order: idx }))));
            updateLastMessage(
              (planData.interpretation ? `**What I understood:** ${planData.interpretation}\n\n**My plan:** ${planData.plan}\n\n` : '') +
              `Slide ${i + 1} of ${planData.slideTypes!.length} ready...`
            );
          }
        }
        processedSlides = accumulated;
        resData = { slides: accumulated, theme: generatedTheme, plan: planData.plan, interpretation: planData.interpretation };
      } else {
        let invokeResult = await supabase.functions.invoke('generate-slides', {
          body: {
            description: prompt,
            contentType: 'interactive',
            targetAudience: audience,
            difficulty: 'intermediate',
            slideCount,
            maxImages: isPro ? 6 : 3,
            lectureMode,
            ...(planData && planData.slideTypes?.length && {
              plan: planData.plan,
              interpretation: planData.interpretation,
              slideTypes: planData.slideTypes,
            }),
          },
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (invokeResult.error && getEdgeFunctionStatus(invokeResult.error) === 503) {
          await new Promise((r) => setTimeout(r, 2500));
          invokeResult = await supabase.functions.invoke('generate-slides', {
            body: {
              description: prompt,
              contentType: 'interactive',
              targetAudience: audience,
              difficulty: 'intermediate',
              slideCount,
              maxImages: isPro ? 6 : 3,
              lectureMode,
              ...(planData && planData.slideTypes?.length && {
                plan: planData.plan,
                interpretation: planData.interpretation,
                slideTypes: planData.slideTypes,
              }),
            },
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
        }
        const { data, error: fnError } = invokeResult;
        if (fnError) {
          if (getEdgeFunctionStatus(fnError) === 402) setShowOutOfCreditsModal(true);
          const msg = await getEdgeFunctionErrorMessage(fnError, 'Failed to generate presentation.');
          throw new Error(msg);
        }
        resData = data as {
          error?: string;
          slides?: unknown[];
          theme?: unknown;
          plan?: string;
          interpretation?: string;
          pendingSlideImages?: PendingSlideImage[];
          lectureTitle?: string;
        };
        if (resData.error) throw new Error(resData.error);
        if (!resData?.slides?.length) throw new Error('No slides returned');

        if (typeof resData.lectureTitle === 'string' && resData.lectureTitle.trim()) {
          setLectureTitle(resData.lectureTitle.trim().slice(0, 200));
        }

        processedSlides = (resData.slides as any[]).map((slide: any, index: number) => ({
          ...slide,
          id: slide.id || `${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
          order: index,
        }));
        if (!resData.lectureTitle?.trim() && processedSlides[0]?.type === 'title') {
          const tit = (processedSlides[0].content as { title?: string } | undefined)?.title;
          if (typeof tit === 'string' && tit.trim()) setLectureTitle(tit.trim().slice(0, 200));
        }
      }

      let normalizedSlides = ensureSlidesDesignDefaults(processedSlides);
      const pendingImgs = resData.pendingSlideImages;
      if (pendingImgs?.length) {
        const { data: sessHydrate } = await supabase.auth.getSession();
        const tok = sessHydrate?.session?.access_token;
        if (tok) {
          normalizedSlides = ensureSlidesDesignDefaults(
            await hydratePendingSlideImages(normalizedSlides, pendingImgs, tok, (upd) => {
              setSandboxSlides(ensureSlidesDesignDefaults(upd));
            }),
          );
        }
      }
      // Reasoning-first: show interpretation+plan in message before revealing slides (Free gets these from single invoke)
      if (resData.interpretation || resData.plan) {
        let reasoningMsg = '';
        if (resData.interpretation) reasoningMsg += `**What I understood:** ${resData.interpretation}\n\n`;
        if (resData.plan) reasoningMsg += `**My plan:** ${resData.plan}\n\n`;
        reasoningMsg += 'Creating your slides...';
        updateLastMessage(reasoningMsg);
        await new Promise((r) => setTimeout(r, 1200));
      }
      setSandboxSlides(normalizedSlides);
      setGeneratedTheme(resData.theme);

      const firstSlide = normalizedSlides[0];
      const aiThemeId = (firstSlide?.design as { themeId?: string } | undefined)?.themeId as ThemeId | undefined;
      const aiDesignStyleId = (firstSlide?.design as { designStyleId?: string } | undefined)?.designStyleId as DesignStyleId | undefined;
      if (aiThemeId) setSelectedThemeId(aiThemeId);
      if (aiDesignStyleId) setSelectedDesignStyleId(aiDesignStyleId);

      const aiTitle = firstSlide?.content && typeof (firstSlide.content as { title?: string }).title === 'string'
        ? (firstSlide.content as { title: string }).title.trim()
        : '';
      const draftTitle = aiTitle || (prompt.slice(0, 50) + (prompt.length > 50 ? '...' : '')) || 'Untitled Presentation';
      try {
        const newLecture = await createLecture(draftTitle, normalizedSlides, undefined, {
          lecture_mode: lectureMode,
        });
        setLectureDbId(newLecture.id);
        setLectureCode(newLecture.lecture_code);
        const settings = { themeId: aiThemeId ?? selectedThemeId, designStyleId: aiDesignStyleId ?? selectedDesignStyleId };
        await updateLecture(newLecture.id, { settings, lecture_mode: lectureMode });
        const aiQuery =
          lectureMode === "webinar" ? "?ai=1&track=webinar" : "?ai=1";
        navigate(`/editor/${newLecture.id}${aiQuery}`, {
          replace: true,
          state: { preloadedLecture: { ...newLecture, slides: normalizedSlides, settings } },
        });
      } catch (e) {
        console.warn('Failed to auto-save draft:', e);
      }

      let successMsg = '';
      if (resData.interpretation || resData.plan) {
        if (resData.interpretation) successMsg += `**What I understood:** ${resData.interpretation}\n\n`;
        if (resData.plan) successMsg += `**My plan:** ${resData.plan}\n\n`;
      }
      successMsg +=
        `I've created a ${processedSlides.length}-slide presentation about "${prompt}".\n\n` +
        `**What you can ask me:**\n` +
        `- "Change the text on slide 3"\n` +
        `- "Make the tone more professional"\n` +
        `- "Add a quiz after slide 2"\n` +
        `- "Delete the timeline slide"\n\n` +
        `Keep editing by typing in the box below.`;
      updateLastMessage(successMsg);
    } catch (error) {
      setSandboxSlides([]);
      const errorMessage = error instanceof Error
        ? (error.name === 'AbortError' ? 'Request timed out. Please try again.' : error.message)
        : 'Please try again.';
      const isLimitError = /credits?|limit|מגבלה|קרדיטים|שדרג|slide limit/i.test(errorMessage);
      updateLastMessage(
        isLimitError
          ? errorMessage
          : `Sorry, I couldn't generate the presentation. ${errorMessage}`
      );
      toast.error(isLimitError ? errorMessage : 'Failed to generate presentation');
    } finally {
      setIsInitialGenerating(false);
      setIsGenerating(false);
    }
  }, [
    isFree,
    maxSlides,
    isPro,
    hasAITokens,
    lectureMode,
    addMessage,
    updateLastMessage,
    setSandboxSlides,
    setOriginalPrompt,
    setGeneratedTheme,
    navigate,
    selectedThemeId,
    selectedDesignStyleId,
  ]);

  // Generate initial presentation when landing with ?prompt=...&ai=1 (from Dashboard)
  useEffect(() => {
    const prompt = searchParams.get('prompt') || '';
    const audience = searchParams.get('audience') || 'general';
    if (!prompt || searchParams.get('ai') !== '1') return;
    if (!user || isAuthLoading || isSubLoading) return;
    if (hasTriggeredInitialGen.current) return;
    if (sandboxSlides.length > 0 || originalPrompt) return;

    hasTriggeredInitialGen.current = true;
    addMessage({ role: 'user', content: prompt });
    runGenerateSlides(prompt, audience);
  }, [searchParams, user, isAuthLoading, isSubLoading, sandboxSlides.length, originalPrompt, runGenerateSlides, addMessage]);

  useEffect(() => {
    if (!isInitialGenerating) return;
    setAiProgressStage(0);
    const t = setInterval(() => {
      setAiGenTipIndex((i) => (i + 1) % BUILDER_TIPS.length);
      setAiProgressStage((s) => (s + 1) % AI_PROGRESS_MESSAGES.length);
    }, 2800);
    return () => clearInterval(t);
  }, [isInitialGenerating]);

  const handleSendAIMessage = useCallback(async (userMessage: string) => {
    if (!hasAITokens(1)) {
      setShowOutOfCreditsModal(true);
      return;
    }
    addMessage({ role: 'user', content: userMessage });
    const currentSlides = sandboxSlides.length > 0 ? sandboxSlides : slides;
    if (isCreateFromScratchRequest(userMessage) && arePlaceholderOrEmptySlides(currentSlides)) {
      runGenerateSlides(userMessage, targetAudience || 'general');
      return;
    }
    addMessage({ role: 'assistant', content: '', isLoading: true });
    setIsGenerating(true);

    const progressStages: { after: number; text: string }[] = [
      { after: 0, text: 'Starting...' },
      { after: 4, text: 'AI is thinking...' },
      { after: 12, text: 'Processing your request...' },
      { after: 30, text: 'This is taking longer than usual...' },
    ];
    const startTime = Date.now();
    const progressId = setInterval(() => {
      const elapsedSec = (Date.now() - startTime) / 1000;
      const stage = [...progressStages].reverse().find((s) => elapsedSec >= s.after);
      if (stage) updateLastMessage(stage.text);
    }, 3000);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      if (sessionError || !session) throw new Error("Please sign in to use AI editing");

      const currentSlides = sandboxSlides.length > 0 ? sandboxSlides : slides;
      const conversationHistory = messages
        .slice(0, -1)
        .filter((m) => (m.role === 'user' || m.role === 'assistant') && !m.isLoading)
        .slice(-20)
        .map((m) => ({ role: m.role, content: m.content }));

      const invokeFn = () =>
        supabase.functions.invoke('chat-builder', {
          body: {
            message: userMessage,
            conversationHistory,
            slides: currentSlides,
            currentSlideIndex,
            originalPrompt: originalPrompt || '',
            targetAudience: targetAudience || 'general',
            lectureMode,
          },
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

      let result = await withTimeout(invokeFn(), 90_000, 'Request timed out. Please try again.');
      if (result.error && getEdgeFunctionStatus(result.error) === 503) {
        await new Promise((r) => setTimeout(r, 2500));
        result = await withTimeout(invokeFn(), 90_000, 'Request timed out. Please try again.');
      }

      const { data, error: fnError } = result;

      if (fnError) {
        if (getEdgeFunctionStatus(fnError) === 402) setShowOutOfCreditsModal(true);
        const msg = await getEdgeFunctionErrorMessage(fnError, 'Failed to process message.');
        throw new Error(msg);
      }
      const resData = data as { error?: string; message?: string; updatedSlides?: unknown[] };
      if (resData?.error) throw new Error(resData.error);

      if (resData?.updatedSlides?.length) {
        const updated = ensureSlidesDesignDefaults(resData.updatedSlides as Slide[]);
        setSandboxSlides(updated);
        // Auto-focus first modified slide so user sees what AI changed
        const prevIds = new Set((sandboxSlides.length > 0 ? sandboxSlides : slides).map((s) => s.id));
        const firstModified = updated.findIndex((s) => !prevIds.has(s.id) || slides[currentSlideIndex]?.id !== s.id);
        const insertIdx = updated.findIndex((s) => !prevIds.has(s.id));
        const focusIdx = insertIdx >= 0 ? insertIdx : (firstModified >= 0 ? firstModified : 0);
        if (focusIdx >= 0) setCurrentSlideIndex(Math.min(focusIdx, updated.length - 1));
      }
      updateLastMessage(resData?.message || 'Done! Check the updated slides.');
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Please try again.';
      const isLimitError = /credits?|limit|מגבלה|קרדיטים|שדרג/i.test(errMsg);
      updateLastMessage(
        isLimitError
          ? errMsg
          : `Sorry, I couldn't process that. ${errMsg}`
      );
    } finally {
      clearInterval(progressId);
      setIsGenerating(false);
    }
  }, [
    sandboxSlides,
    slides,
    currentSlideIndex,
    originalPrompt,
    targetAudience,
    lectureMode,
    hasAITokens,
    addMessage,
    updateLastMessage,
    setIsGenerating,
    setSandboxSlides,
    setCurrentSlideIndex,
    messages,
    runGenerateSlides,
  ]);

  // Clamp currentSlideIndex when display slides count changes
  useEffect(() => {
    if (currentSlideIndex >= displaySlides.length) {
      setCurrentSlideIndex(Math.max(0, displaySlides.length - 1));
    }
  }, [displaySlides.length, currentSlideIndex]);

  // Scroll to selected slide when currentSlideIndex changes (arrows, sidebar click)
  useEffect(() => {
    if (!scrollContainerRef.current || slideRefs.current[safeIndex] == null) return;
    skipScrollSyncRef.current = true;
    slideRefs.current[safeIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const t = setTimeout(() => { skipScrollSyncRef.current = false; }, 400);
    return () => clearTimeout(t);
  }, [safeIndex]);

  // On scroll (debounced): update currentSlideIndex from scroll position - low sensitivity
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    let debounceId: ReturnType<typeof setTimeout> | null = null;
    const handleScroll = () => {
      if (debounceId) clearTimeout(debounceId);
      debounceId = setTimeout(() => {
        debounceId = null;
        if (skipScrollSyncRef.current) return;
        const h = el.clientHeight;
        const idx = Math.round(el.scrollTop / h);
        const clamped = Math.max(0, Math.min(idx, displaySlides.length - 1));
        if (clamped !== currentSlideIndex) setCurrentSlideIndex(clamped);
      }, 150);
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      if (debounceId) clearTimeout(debounceId);
      el.removeEventListener('scroll', handleScroll);
    };
  }, [displaySlides.length, currentSlideIndex]);

  // Redirect mobile users to continue-on-desktop (building is desktop-only)
  useEffect(() => {
    if (isMobile) {
      navigate("/continue-on-desktop", { replace: true });
    }
  }, [isMobile, navigate]);

  // Apply lecture data (shared logic for preloaded and fetched)
  const applyLectureData = useCallback((lecture: { id: string; title?: string; lecture_code?: string; slides?: unknown; settings?: unknown }) => {
    const lectureUserId = (lecture as { user_id?: string }).user_id;
    if (user && lectureUserId && lectureUserId !== user.id) {
      toast.error("You don't have access to this lecture");
      const lm = (lecture as { lecture_mode?: string }).lecture_mode;
      navigate(lm === "webinar" ? "/webinar/dashboard" : "/dashboard");
      return;
    }
    setLectureDbId(lecture.id);
    setLectureTitle(lecture.title ?? 'Untitled Lecture');
    setLectureCode(lecture.lecture_code ?? '');
    const raw = lecture.slides;
    const loadedSlides = Array.isArray(raw) ? (raw as unknown as Slide[]) : null;
    if (loadedSlides && loadedSlides.length > 0) {
      const valid = loadedSlides.every((s) => s && typeof s === 'object' && s.id && s.type);
      if (valid) setSlides(ensureSlidesDesignDefaults(loadedSlides));
    }
    const settings = lecture.settings as Record<string, unknown> | null;
    if (settings?.themeId) setSelectedThemeId(settings.themeId as ThemeId);
    if (settings?.designStyleId) setSelectedDesignStyleId(settings.designStyleId as DesignStyleId);
    const lm = (lecture as { lecture_mode?: string }).lecture_mode;
    setLectureMode(lm === "webinar" ? "webinar" : "education");
    editorErrorHomeRef.current = lm === "webinar" ? "/webinar/dashboard" : "/dashboard";
    const wc = settings?.webinarCta as { label?: string; url?: string } | undefined;
    setWebinarCtaLabel(typeof wc?.label === "string" ? wc.label : "");
    setWebinarCtaUrl(typeof wc?.url === "string" ? wc.url : "");
  }, [user?.id, navigate]);

  // Load lecture from database if it exists (only own lectures)
  // Use preloaded data when navigating after create to avoid race/fetch failure
  useEffect(() => {
    if (!lectureId || lectureId === 'new') {
      setIsLoading(false);
      return;
    }
    if (isAuthLoading) return;

    const preloaded = (location.state as { preloadedLecture?: { id: string } })?.preloadedLecture;
    if (preloaded && preloaded.id === lectureId) {
      applyLectureData(preloaded);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const loadLecture = async () => {
      try {
        const lecture = await getLecture(lectureId);
        if (cancelled) return;
        if (lecture) {
          applyLectureData(lecture);
        } else {
          toast.error('Lecture not found');
          navigate(editorErrorHomeRef.current, { replace: true });
        }
      } catch (error) {
        if (cancelled) return;
        console.error('Error loading lecture:', error);
        const msg = error instanceof Error && error.message.includes('timed out')
          ? 'Lecture load timed out. Please try again.'
          : 'Failed to load lecture';
        toast.error(msg);
        navigate(editorErrorHomeRef.current, { replace: true });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadLecture();
    return () => { cancelled = true; };
  }, [lectureId, user?.id, isAuthLoading, navigate, location.state, applyLectureData]);

  // Auto-save with optional silent mode (no spinner, subtle toast). Save what we display (displaySlides).
  const saveToDatabase = useCallback(async (silent = false) => {
    if (!hasChanges) return;
    
    if (!silent) setIsSaving(true);
    try {
      const settings: Record<string, unknown> = {
        themeId: selectedThemeId,
        designStyleId: selectedDesignStyleId,
      };
      if (lectureMode === "webinar" && webinarCtaLabel.trim() && webinarCtaUrl.trim()) {
        settings.webinarCta = { label: webinarCtaLabel.trim(), url: webinarCtaUrl.trim() };
      }
      const slidesToSave = sandboxSlides.length > 0 ? sandboxSlides : slides;
      const normalizedSlides = ensureSlidesDesignDefaults(slidesToSave);
      
      if (lectureDbId) {
        await updateLecture(lectureDbId, {
          slides: normalizedSlides,
          settings,
          lecture_mode: lectureMode,
        });
      } else {
        const newLecture = await createLecture(lectureTitle, normalizedSlides, undefined, {
          lecture_mode: lectureMode,
        });
        setLectureDbId(newLecture.id);
        setLectureCode(newLecture.lecture_code);
        window.history.replaceState(null, '', `/editor/${newLecture.id}`);
        await updateLecture(newLecture.id, { settings, lecture_mode: lectureMode });
      }
      setHasChanges(false);
      if (!silent) toast.success('Saved!');
    } catch (error) {
      console.error('Error saving:', error);
      toast.error(silent ? 'Auto-save failed' : 'Failed to save');
    } finally {
      if (!silent) setIsSaving(false);
    }
  }, [
    hasChanges,
    lectureDbId,
    lectureTitle,
    slides,
    sandboxSlides,
    selectedThemeId,
    selectedDesignStyleId,
    lectureMode,
    webinarCtaLabel,
    webinarCtaUrl,
  ]);

  // Save title changes (persist current display slides so title + slides stay in sync)
  const saveTitleToDatabase = useCallback(async () => {
    if (!lectureDbId) return;
    
    try {
      const slidesToSave = sandboxSlides.length > 0 ? sandboxSlides : slides;
      await updateLecture(lectureDbId, { slides: slidesToSave });
    } catch (error) {
      console.error('Error saving title:', error);
    }
  }, [lectureDbId, slides, sandboxSlides]);

  // Save only on milestones: AI complete, navigate away, Cmd+S. No auto-save debounce.

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveToDatabase();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveToDatabase]);

  // Handle drag end – reorder the list we're displaying (sandbox or slides)
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const items = sandboxSlides.length > 0 ? sandboxSlides : slides;
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const newSlides = arrayMove([...items], oldIndex, newIndex).map((slide, index) => ({
        ...slide,
        order: index,
      }));

      if (sandboxSlides.length > 0) {
        setSandboxSlides(newSlides);
      } else {
        setSlides(newSlides);
      }
      if (currentSlideIndex === oldIndex) {
        setCurrentSlideIndex(newIndex);
      } else if (oldIndex < currentSlideIndex && newIndex >= currentSlideIndex) {
        setCurrentSlideIndex(currentSlideIndex - 1);
      } else if (oldIndex > currentSlideIndex && newIndex <= currentSlideIndex) {
        setCurrentSlideIndex(currentSlideIndex + 1);
      }
      setHasChanges(true);
    }
  };

  const addSlide = useCallback((type: SlideType) => {
    // Check slide limit for free users
    const slideLimit = maxSlides ?? 5;
    if (isFree && slides.length >= slideLimit) {
      showUpgradeModal({
        feature: "more slides",
        title: "Slide limit reached",
        description: `Free plan allows up to ${slideLimit} slides. Upgrade to create unlimited presentations.`,
      });
      return;
    }

    // New slides are appended at the end; select the new slide so user sees it. Clear sandbox so display shows slides.
    const baseSlides = sandboxSlides.length > 0 ? sandboxSlides : slides;
    const newSlide = createNewSlide(type, baseSlides.length);
    const newSlides = [...baseSlides, newSlide].map((s, idx) => ({ ...s, order: idx }));
    setSlides(newSlides);
    setSandboxSlides([]);
    setCurrentSlideIndex(newSlides.length - 1);
    setHasChanges(true);
  }, [slides, sandboxSlides, isFree, maxSlides, showUpgradeModal]);

  // ResizeObserver (debounced): compute slide size from canvas - same logic for AI and Start from scratch
  const lastSlideSizeRef = useRef<{ w: number; h: number; scale: number } | null>(null);
  useEffect(() => {
    const container = slidePreviewRef.current;
    if (!container) return;

    let debounceId: ReturnType<typeof setTimeout> | null = null;
    let retryId: ReturnType<typeof setTimeout> | null = null;
    const DEBOUNCE_MS = 120;

    const computeSize = () => {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      if (cw <= 0 || ch <= 0) {
        // Layout may not be ready (e.g. Start from scratch first paint); retry after layout settles
        retryId = setTimeout(() => {
          retryId = null;
          computeSize();
        }, 150);
        return;
      }
      const reservedW = 0;
      const pad = isConstrainedViewport ? 8 : 16;
      const maxW = Math.max(200, cw - reservedW - pad);
      const maxH = Math.max(112, ch - pad);
      const LOGICAL_W = 960;
      const LOGICAL_H = 540;
      const maxScale = 1.6;
      const scaleFactor = Math.min(maxScale, maxW / LOGICAL_W, maxH / LOGICAL_H);
      const w = Math.round(LOGICAL_W * scaleFactor);
      const h = Math.round(LOGICAL_H * scaleFactor);
      // Skip update if size unchanged to avoid unnecessary re-renders
      const last = lastSlideSizeRef.current;
      if (last && last.w === w && last.h === h && last.scale === scaleFactor) return;
      lastSlideSizeRef.current = { w, h, scale: scaleFactor };
      setSlideSize({ width: w, height: h, scale: scaleFactor });
    };

    const scheduleUpdate = () => {
      if (debounceId) clearTimeout(debounceId);
      debounceId = setTimeout(() => {
        debounceId = null;
        computeSize();
      }, DEBOUNCE_MS);
    };

    computeSize();
    // Re-measure after layout settles (handles Start from scratch / initial load)
    const settleId = setTimeout(computeSize, 250);
    const ro = new ResizeObserver(scheduleUpdate);
    ro.observe(container);
    return () => {
      if (debounceId) clearTimeout(debounceId);
      if (retryId) clearTimeout(retryId);
      clearTimeout(settleId);
      ro.disconnect();
    };
  }, [isAIPanelOpen, slides.length, isConstrainedViewport]);

  const handleSlidesImported = (importedSlides: Slide[]) => {
    setSlides([...slides, ...importedSlides]);
    setCurrentSlideIndex(slides.length); // Select first imported slide
    setHasChanges(true);
  };

  const updateSlideContent = (content: SlideContent) => {
    setSlides(slides.map((slide, index) =>
      index === currentSlideIndex
        ? { ...slide, content }
        : slide
    ));
    setSandboxSlides([]); // so display uses slides (edited version)
    setHasChanges(true);
  };

  const updateSlideDesign = (design: SlideDesign) => {
    setSlides(slides.map((slide, index) =>
      index === currentSlideIndex
        ? { ...slide, design }
        : slide
    ));
    setSandboxSlides([]); // so display uses slides (edited version)
    setHasChanges(true);
  };

  const updateActivitySettings = (updates: Partial<ActivitySettings>) => {
    setSlides(
      slides.map((slide, index) =>
        index === currentSlideIndex
          ? {
              ...slide,
              activitySettings: { ...slide.activitySettings, ...updates },
            }
          : slide
      )
    );
    setSandboxSlides([]);
    setHasChanges(true);
  };

  const deleteSlide = () => {
    if (slides.length > 1) {
      const newSlides = slides.filter((_, index) => index !== currentSlideIndex);
      setSlides(newSlides);
      setSandboxSlides([]); // so display uses slides
      setCurrentSlideIndex(Math.min(currentSlideIndex, newSlides.length - 1));
      setHasChanges(true);
    }
  };

  const handlePresent = (startFromCurrent = false) => {
    const targetSlideIndex = startFromCurrent ? currentSlideIndex : 0;
    let normalizedSlides = ensureSlidesDesignDefaults(displaySlides);
    // So Present matches Editor: each slide carries theme/designStyleId (fallback to Editor selection when missing)
    normalizedSlides = normalizedSlides.map((s) => ({
      ...s,
      design: {
        ...s.design,
        themeId: (s.design?.themeId as ThemeId) ?? selectedThemeId,
        designStyleId: (s.design?.designStyleId as DesignStyleId) ?? selectedDesignStyleId,
      },
    }));
    const settings = { themeId: selectedThemeId, designStyleId: selectedDesignStyleId };

    if (lectureDbId) {
      // Navigate immediately – don't block on save. Save in background if there are changes.
      navigate(`/present/${lectureDbId}`, {
        state: {
          optimisticSlides: normalizedSlides,
          optimisticLecture: {
            id: lectureDbId,
            title: lectureTitle,
            lecture_code: lectureCode,
            slides: normalizedSlides,
            current_slide_index: targetSlideIndex,
            settings,
          },
          skipAutoFullscreen: startFromCurrent,
        },
      });
      if (hasChanges) {
        void saveToDatabase(true).catch(() => toast.error('Auto-save failed'));
      }
    } else {
      createLecture(lectureTitle, normalizedSlides, undefined, { lecture_mode: lectureMode })
        .then((newLecture) => {
          navigate(`/present/${newLecture.id}`, {
            state: {
              optimisticSlides: (newLecture.slides as unknown as Slide[]) ?? normalizedSlides,
              optimisticLecture: {
                ...newLecture,
                current_slide_index: targetSlideIndex,
                settings,
              },
              skipAutoFullscreen: startFromCurrent,
            },
          });
        })
        .catch(() => toast.error('Failed to start presentation'));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Compact Editor Header - No global nav */}
      <div className="flex-shrink-0 border-b border-border/50 bg-card/80 backdrop-blur-sm">
        <div className={`flex items-center justify-between ${isConstrainedViewport ? 'px-3 py-1.5' : 'px-4 py-2'}`}>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (hasChanges && lectureDbId) void saveToDatabase(true).catch(() => toast.error('Auto-save failed'));
                navigate(dashboardHome);
              }}
              className="gap-1.5"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Button>
            <div className="w-px h-5 bg-border/50" />
            <Input
              value={lectureTitle}
              onChange={(e) => {
                setLectureTitle(e.target.value);
                setHasChanges(true);
              }}
              onBlur={saveTitleToDatabase}
              className="font-display font-semibold text-base border-0 bg-transparent focus-visible:ring-0 w-auto min-w-[180px] h-8"
            />
            {lectureCode && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded hidden sm:inline-flex">
                Code: <span className="font-mono font-bold ml-1">{lectureCode}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <span className="text-xs text-muted-foreground hidden sm:inline">Unsaved</span>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => saveToDatabase()}
              disabled={isSaving || !hasChanges}
              className="h-8"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span className="hidden sm:inline ml-1">Save</span>
            </Button>
            <Button variant="hero" size="sm" onClick={() => handlePresent(false)} className="h-8">
              <Play className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Present</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Top Toolbar - Google Slides style */}
      <EditorTopToolbar
        slide={currentSlide}
        compact={isConstrainedViewport}
        onUpdateDesign={updateSlideDesign}
        onUpdateDesignForAllSlides={(u) => {
          setSlides(slides.map((s) => ({ ...s, design: { ...s.design, ...u } })));
          setSandboxSlides((prev) => (prev.length ? prev.map((s) => ({ ...s, design: { ...s.design, ...u } })) : prev));
          setHasChanges(true);
        }}
        selectedThemeId={selectedThemeId}
        onSelectTheme={(id) => { setSelectedThemeId(id); setHasChanges(true); }}
        onPremiumThemeBlocked={() => showUpgradeModal({
          feature: "premium themes",
          title: "Premium theme",
          description: "This theme is only available on the Pro plan. Upgrade to unlock all premium themes.",
        })}
        isPro={!!isPro}
        onPremiumLogoBlocked={() => showUpgradeModal({
          feature: "logo",
          title: "Logo upload",
          description: "Logo upload is available on the Pro plan. Upgrade to add your logo to slides.",
        })}
        onPremiumColorBlocked={() => showUpgradeModal({
          feature: "custom color",
          title: "Custom color picker",
          description: "Choosing any custom color is available on the Pro plan. Upgrade to unlock full color control.",
        })}
        onImportClick={() => setShowImportDialog(true)}
        onUpdateActivitySettings={isParticipativeSlide(currentSlide.type) ? updateActivitySettings : undefined}
      />

      {/* Import Dialog */}
      <ImportPresentationDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onSlidesImported={handleSlidesImported}
        existingSlideCount={displaySlides.length}
        onUpgradeRequired={() =>
          showUpgradeModal({
            feature: "import",
          title: "Import is a paid feature",
          description: "Upgrade to Standard or Pro to import PowerPoint and PDF presentations.",
          })
        }
      />

      {/* Upgrade Modal */}
      <UpgradeModalComponent />

      {/* Add Slide Picker Dialog - at root to avoid flicker when panel re-renders */}
      <AddSlidePickerDialog
        open={showAddSlidePicker}
        onOpenChange={setShowAddSlidePicker}
        onSelect={addSlide}
        onNavigateToBuilder={() => { setShowAddSlidePicker(false); setIsAIPanelOpen(true); }}
      />

      {/* Main Editor Area - Fill remaining height */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Panel - Slides list OR AI Chat (always visible, wider when AI) */}
        <div
          className={`flex-shrink-0 border-r border-border/50 bg-card/30 flex flex-col overflow-hidden transition-all duration-200 ${
            isAIPanelOpen
              ? isConstrainedViewport
                ? 'w-[min(320px,22vw)] opacity-100'
                : 'w-[min(360px,26vw)] opacity-100'
              : 'w-64 opacity-100'
          }`}
        >
          {/* Slides list vs AI chat */}
          <div className="flex-shrink-0 p-2.5 pb-2">
            <div
              className="flex rounded-xl bg-muted/70 p-1 gap-1 ring-1 ring-border/50 shadow-sm"
              role="radiogroup"
              aria-label="Choose slide list or AI assistant"
            >
              <button
                type="button"
                role="radio"
                aria-checked={!isAIPanelOpen}
                title="Slide list and add slide"
                onClick={() => setIsAIPanelOpen(false)}
                className={`flex flex-1 flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 px-1.5 sm:px-2 rounded-lg text-xs sm:text-sm font-semibold transition-all min-h-[44px] border ${
                  !isAIPanelOpen
                    ? "bg-background text-foreground shadow-sm border-border/60"
                    : "bg-muted/40 text-foreground/85 border-transparent hover:bg-muted/70 hover:border-border/40"
                }`}
              >
                <Plus className="w-4 h-4 shrink-0 opacity-90" aria-hidden />
                <span className="text-center leading-tight">Slides</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={isAIPanelOpen}
                title="AI Assistant"
                onClick={() => setIsAIPanelOpen(true)}
                className={`flex flex-1 flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 px-1.5 sm:px-2 rounded-lg text-xs sm:text-sm font-semibold transition-all min-h-[44px] border ${
                  isAIPanelOpen
                    ? "bg-background text-foreground shadow-sm border-border/60"
                    : "bg-muted/40 text-foreground/85 border-transparent hover:bg-muted/70 hover:border-border/40"
                }`}
              >
                <Sparkles className="w-4 h-4 shrink-0 text-primary opacity-90" aria-hidden />
                <span className="text-center leading-tight">AI</span>
              </button>
            </div>
          </div>

          <div className="flex-shrink-0 px-2.5 pb-2 space-y-2 border-b border-border/40">
          {lectureMode === "webinar" && (
            <>
              <p className="text-[11px] font-medium text-foreground/85 px-0.5 pt-1">Live CTA button</p>
              <Input
                placeholder="Button label (e.g. Get the course)"
                value={webinarCtaLabel}
                onChange={(e) => {
                  setWebinarCtaLabel(e.target.value);
                  setHasChanges(true);
                }}
                className="h-9 text-sm"
              />
              <Input
                placeholder="https://…"
                value={webinarCtaUrl}
                onChange={(e) => {
                  setWebinarCtaUrl(e.target.value);
                  setHasChanges(true);
                }}
                className="h-9 text-sm"
              />
            </>
          )}
          </div>

          {isAIPanelOpen ? (
            <div id="editor-ai-panel" className="flex-1 min-h-0 flex flex-col" role="region" aria-label="AI assistant chat">
              <ChatPanel
                onSendMessage={handleSendAIMessage}
                embeddedInEditor
              />
            </div>
          ) : (
            <>
              {/* Slides list - Scrollable */}
              <div
                id="editor-slides-panel"
                className="flex-1 overflow-y-auto p-2 min-h-0"
                role="region"
                aria-label="Slide list and add slide"
              >
                {/* Add Slide CTA - first item, prominent */}
                <button
                  type="button"
                  onClick={() => setShowAddSlidePicker(true)}
                  disabled={slidesGenerationLocked}
                  className="w-full flex items-center justify-center gap-2 p-4 mb-2 min-h-[44px] rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary/60 text-primary text-sm font-semibold transition-all disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Plus className="w-5 h-5 flex-shrink-0" />
                  Add slide
                </button>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={displaySlides.map(s => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-1.5">
                      {displaySlides.map((slide, index) => (
                        <SortableSlideItem
                          key={slide.id}
                          slide={slide}
                          index={index}
                          isSelected={index === currentSlideIndex}
                          onClick={() => setCurrentSlideIndex(index)}
                          dragDisabled={slidesGenerationLocked}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            </>
          )}
        </div>

        {/* Main Editor - Canvas + Fixed Bottom Toolbar */}
        <div className="flex-1 flex flex-col overflow-hidden bg-muted/50 relative">
          {slidesGenerationLocked && displaySlides.length > 0 && (
            <div
              className="flex-shrink-0 z-20 flex items-center justify-center gap-2 px-3 py-2.5 bg-amber-500/15 border-b border-amber-500/25 text-sm text-foreground"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="w-4 h-4 animate-spin text-amber-700 dark:text-amber-400 shrink-0" aria-hidden />
              <span className="text-center leading-snug">
                Creating slides — editing is paused · יוצרים שקופיות — העריכה מושבתת זמנית
              </span>
            </div>
          )}
          {/* Canvas: scroll-based (no phone) or single-slide (with phone) - allowContentScroll for WYSIWYG with Present */}
          <div ref={slidePreviewRef} className="flex-1 overflow-hidden flex gap-6 min-h-0 relative">
            <BuilderPreviewProvider allowContentScroll>
            {isInitialGenerating && sandboxSlides.length === 0 ? (
              <div className="flex-1 flex items-center justify-center min-h-0">
                <div className="flex flex-col items-center gap-4 text-muted-foreground max-w-sm text-center px-4">
                  <Loader2 className="w-12 h-12 animate-spin text-primary" />
                  <p className="text-base font-semibold text-foreground">
                    {AI_PROGRESS_MESSAGES[aiProgressStage % AI_PROGRESS_MESSAGES.length]}
                  </p>
                  <p className="text-xs text-muted-foreground">{BUILDER_TIPS[aiGenTipIndex % BUILDER_TIPS.length]}</p>
                </div>
              </div>
            ) : (
              <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto overflow-x-hidden snap-y snap-mandatory scroll-smooth min-h-0"
              >
                {displaySlides.map((slide, index) => (
                  <div
                    key={slide.id}
                    ref={(el) => { slideRefs.current[index] = el; }}
                    className={`min-h-full snap-center snap-always flex items-center justify-center shrink-0 ${isConstrainedViewport ? 'py-2' : 'py-4'}`}
                  >
                    <div
                      className="shrink-0 relative ring-4 ring-primary ring-offset-2 ring-offset-background rounded-xl overflow-hidden"
                      style={slideSize ? { width: slideSize.width, height: slideSize.height } : { width: 960, height: 540 }}
                    >
                      <span className="absolute -top-1 left-3 z-10 text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                        {index + 1} / {displaySlides.length}
                      </span>
                      {slideSize?.scale !== undefined && slideSize.scale < 1 ? (
                        <div
                          style={{
                            width: 960,
                            height: 540,
                            transform: `scale(${slideSize.scale})`,
                            transformOrigin: 'top left',
                          }}
                          className="absolute top-0 left-0"
                        >
                          <SlideFrame>
                            <SlideLayoutProvider slide={slide}>
                              <SlideRenderer
                                key={slide.id}
                                slide={slide}
                                isEditing={
                                  index === currentSlideIndex && !simulationData && !slidesGenerationLocked
                                    ? isEditing
                                    : false
                                }
                                showResults={index === currentSlideIndex ? (showResults || !!simulationData) : false}
                                onUpdateContent={updateSlideContent}
                                liveResults={index === currentSlideIndex ? simulationData : undefined}
                                totalResponses={index === currentSlideIndex ? (simulationData?.total ?? 0) : 0}
                                themeId={(slide?.design as { themeId?: string } | undefined)?.themeId as ThemeId | undefined ?? selectedThemeId}
                                designStyleId={(slide?.design as { designStyleId?: string } | undefined)?.designStyleId as DesignStyleId | undefined ?? selectedDesignStyleId}
                                hideFooter={false}
                              />
                            </SlideLayoutProvider>
                          </SlideFrame>
                        </div>
                      ) : (
                        <SlideFrame>
                          <SlideLayoutProvider slide={slide}>
                            <SlideRenderer
                              key={slide.id}
                              slide={slide}
                              isEditing={
                                index === currentSlideIndex && !simulationData && !slidesGenerationLocked
                                  ? isEditing
                                  : false
                              }
                              showResults={index === currentSlideIndex ? (showResults || !!simulationData) : false}
                              onUpdateContent={updateSlideContent}
                              liveResults={index === currentSlideIndex ? simulationData : undefined}
                              totalResponses={index === currentSlideIndex ? (simulationData?.total ?? 0) : 0}
                              themeId={(slide?.design as { themeId?: string } | undefined)?.themeId as ThemeId | undefined ?? selectedThemeId}
                              designStyleId={(slide?.design as { designStyleId?: string } | undefined)?.designStyleId as DesignStyleId | undefined ?? selectedDesignStyleId}
                              hideFooter={false}
                            />
                          </SlideLayoutProvider>
                        </SlideFrame>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            </BuilderPreviewProvider>
          </div>

          {/* Bottom Toolbar - Fixed/Sticky - z-10 ensures it's above the slide */}
          <div className={`flex-shrink-0 border-t border-border/50 bg-card/80 backdrop-blur-sm relative z-10 ${isConstrainedViewport ? 'p-2' : 'p-3'}`}>
            <div className="flex items-center justify-between max-w-5xl mx-auto pointer-events-auto">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
                  disabled={currentSlideIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground px-3 min-w-[80px] text-center">
                  {currentSlideIndex + 1} / {displaySlides.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentSlideIndex(Math.min(displaySlides.length - 1, currentSlideIndex + 1))}
                  disabled={currentSlideIndex === displaySlides.length - 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Center controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresent(true)}
                  className="gap-2"
                  title="View current slide in present mode"
                >
                  <Eye className="w-4 h-4" />
                  View
                </Button>
                <div className="w-px h-6 bg-border" />

                <div className={slidesGenerationLocked ? "pointer-events-none opacity-50" : ""}>
                  <AnimateButton
                    slide={currentSlide}
                    onSimulationData={setSimulationData}
                    hasSimulationData={!!simulationData}
                  />
                </div>

                <Button
                  variant="secondary"
                  size="default"
                  onClick={() => setIsAIPanelOpen(true)}
                  disabled={slidesGenerationLocked}
                  className="gap-2 border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary font-medium"
                >
                  <Wand2 className="w-4 h-4" />
                  Edit with AI
                </Button>
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => setShowAddSlidePicker(true)}
                  disabled={slidesGenerationLocked}
                  className="gap-2 font-medium"
                >
                  <Plus className="w-5 h-5" />
                  Add Slide
                </Button>
              </div>

              {SLIDE_TYPES.find(t => t.type === currentSlide.type)?.category === 'interactive' && !isEditing && (
                <Button
                  variant={showResults ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setShowResults(!showResults)}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  {showResults ? "Hide Results" : "Show Results"}
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={deleteSlide}
                disabled={slides.length <= 1 || slidesGenerationLocked}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </div>
          </div>
        </div>

        {/* Right Sidebar REMOVED - All design controls moved to top toolbar */}
      </div>
    </div>
  );
};

export default Editor;
