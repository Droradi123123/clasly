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
import { ImportPresentationDialog } from "@/components/editor/ImportPresentationDialog";
import { AddSlidePickerDialog } from "@/components/editor/AddSlidePickerDialog";
import { SortableSlideItem } from "@/components/editor/SortableSlideItem";
import { AnimateButton } from "@/components/editor/AnimateButton";
import { StudentPreview } from "@/components/editor/StudentPreview";
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
} from "@/types/slides";

const isParticipativeSlide = (type: SlideType) => {
  const info = SLIDE_TYPES.find((t) => t.type === type);
  return info?.category === "interactive" || info?.category === "quiz";
};
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
  Upload,
  MessageSquare,
  Heart,
  ArrowLeftRight,
  Smartphone,
  Monitor,
  Columns,
  List,
  Clock,
  BarChart,
  Home,
} from "lucide-react";
import { getLecture, updateLecture, createLecture } from "@/lib/lectureService";
import { toast } from "sonner";
import { useSubscriptionContext } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/useIsMobile";
import { UpgradeModal, useUpgradeModal } from "@/components/billing/UpgradeModal";
import ChatPanel from "@/components/builder/ChatPanel";
import { useConversationalBuilder } from "@/hooks/useConversationalBuilder";
import { supabase } from "@/integrations/supabase/client";
import { getEdgeFunctionErrorMessage, getEdgeFunctionStatus } from "@/lib/supabaseFunctions";
import { OutOfCreditsModal } from "@/components/credits/OutOfCreditsModal";
import { motion, AnimatePresence } from "framer-motion";

const BUILDER_TIPS = [
  'Students join with a QR code—no app download needed.',
  'Add quizzes and polls to boost engagement during your lecture.',
  'Use Student View to see exactly what your audience sees on their phones.',
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
  const [isLoading, setIsLoading] = useState(true);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showAddSlidePicker, setShowAddSlidePicker] = useState(false);
  const [selectedThemeId, setSelectedThemeId] = useState<ThemeId>('academic-pro');
  const [selectedDesignStyleId, setSelectedDesignStyleId] = useState<DesignStyleId>('dynamic');
  const [simulationData, setSimulationData] = useState<any>(null);
  const [showPhonePreview, setShowPhonePreview] = useState(false);
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [showOutOfCreditsModal, setShowOutOfCreditsModal] = useState(false);
  const [isInitialGenerating, setIsInitialGenerating] = useState(false);
  const [aiGenTipIndex, setAiGenTipIndex] = useState(0);
  const hasTriggeredInitialGen = useRef(false);
  const [slideSize, setSlideSize] = useState<{ width: number; height: number } | null>(null);

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

  const safeIndex = Math.min(currentSlideIndex, Math.max(0, slides.length - 1));
  const currentSlide = slides[safeIndex];
  const slidePreviewRef = useRef<HTMLDivElement>(null);

  // AI Panel (useConversationalBuilder) - sync with Editor slides
  const {
    sandboxSlides,
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
  } = useConversationalBuilder();

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

  // When landing with ?ai=1, open AI panel
  useEffect(() => {
    if (searchParams.get('ai') === '1') setIsAIPanelOpen(true);
  }, []);

  // On entering AI mode: initialize sandbox from current Editor slides (Edit with AI = work on THIS presentation only)
  // Do NOT skip when sandbox has content - that could be stale from a previous session; always sync when editing existing
  useEffect(() => {
    if (searchParams.get('prompt')) return; // Generating fresh from URL - don't overwrite
    if (isAIPanelOpen && slides.length > 0) {
      setSandboxSlides(slides);
      setCurrentPreviewIndex(Math.min(currentSlideIndex, slides.length - 1));
    }
  }, [isAIPanelOpen]);

  // When AI updates sandboxSlides: push to Editor slides (only when data actually changed to reduce flicker)
  const prevSandboxRef = useRef<string>('');
  useEffect(() => {
    if (!isAIPanelOpen || sandboxSlides.length === 0) return;
    const key = JSON.stringify(sandboxSlides.map((s) => ({ id: s.id, type: s.type, order: s.order })));
    if (key === prevSandboxRef.current) return;
    prevSandboxRef.current = key;
    setSlides(sandboxSlides);
    setHasChanges(true);
  }, [isAIPanelOpen, sandboxSlides]);

  // Generate initial presentation when landing with ?prompt=...&ai=1 (from Dashboard)
  useEffect(() => {
    const prompt = searchParams.get('prompt') || '';
    const audience = searchParams.get('audience') || 'general';
    if (!prompt || searchParams.get('ai') !== '1') return;
    if (!user || isAuthLoading || isSubLoading) return;
    if (hasTriggeredInitialGen.current) return;
    if (sandboxSlides.length > 0 || originalPrompt) return;

    hasTriggeredInitialGen.current = true;
    setOriginalPrompt(prompt, audience);
    setIsInitialGenerating(true);
    setIsGenerating(true);
    addMessage({ role: 'user', content: prompt });
    addMessage({ role: 'assistant', content: `I'm building a presentation now:\n\n"${prompt}"`, isLoading: true });

    const slideCount = isFree ? (maxSlides ?? 5) : 7;
    // Optimistic placeholders: show slides immediately so user sees progress
    const placeholders: Slide[] = Array.from({ length: slideCount }, (_, i) =>
      createNewSlide(i === 0 ? 'title' : 'content', i)
    ).map((s, i) => ({
      ...s,
      content: i === 0
        ? { ...s.content, title: 'Generating your presentation...', subtitle: prompt.slice(0, 60) + (prompt.length > 60 ? '...' : '') }
        : { ...s.content, title: `Slide ${i + 1}`, text: 'Building...' },
    }));
    setSandboxSlides(placeholders);
    (async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
        if (sessionError || !session) throw new Error("Please sign in to generate presentations");

        const { data, error: fnError } = await supabase.functions.invoke('generate-slides', {
          body: {
            description: prompt,
            contentType: 'interactive',
            targetAudience: audience,
            difficulty: 'intermediate',
            slideCount,
          },
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (fnError) {
          if (getEdgeFunctionStatus(fnError) === 402) setShowOutOfCreditsModal(true);
          const msg = await getEdgeFunctionErrorMessage(fnError, 'Failed to generate presentation.');
          throw new Error(msg);
        }
        const resData = data as { error?: string; slides?: unknown[]; theme?: unknown };
        if (resData?.error) throw new Error(resData.error);
        if (!resData?.slides?.length) throw new Error('No slides returned');

        const processedSlides: Slide[] = (resData.slides as any[]).map((slide: any, index: number) => ({
          ...slide,
          id: slide.id || `${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
          order: index,
        }));
        setSandboxSlides(processedSlides);
        setGeneratedTheme(resData.theme);

        // Use AI-generated title from first slide when available, else fallback to prompt
        const firstSlide = processedSlides[0];
        const aiTitle = firstSlide?.content && typeof (firstSlide.content as { title?: string }).title === 'string'
          ? (firstSlide.content as { title: string }).title.trim()
          : '';
        const draftTitle = aiTitle || (prompt.slice(0, 50) + (prompt.length > 50 ? '...' : '')) || 'Untitled Presentation';
        try {
          const newLecture = await createLecture(draftTitle, processedSlides);
          setLectureDbId(newLecture.id);
          setLectureCode(newLecture.lecture_code);
          navigate(`/editor/${newLecture.id}?ai=1`, {
            replace: true,
            state: { preloadedLecture: { ...newLecture, slides: processedSlides } },
          });
        } catch (e) {
          console.warn('Failed to auto-save draft:', e);
        }

        updateLastMessage(
          `I've created a ${processedSlides.length}-slide presentation about "${prompt}".\n\n` +
          `**What you can ask me:**\n` +
          `- "Change the text on slide 3"\n` +
          `- "Make the tone more professional"\n` +
          `- "Add a quiz after slide 2"\n` +
          `- "Delete the timeline slide"\n\n` +
          `Keep editing by typing in the box below.`
        );
      } catch (error) {
        const errorMessage = error instanceof Error
          ? (error.name === 'AbortError' ? 'Request timed out. Please try again.' : error.message)
          : 'Please try again.';
        updateLastMessage(`Sorry, I couldn't generate the presentation. ${errorMessage}`);
        toast.error('Failed to generate presentation');
      } finally {
        setIsInitialGenerating(false);
        setIsGenerating(false);
      }
    })();
  }, [searchParams, user, isAuthLoading, isSubLoading, sandboxSlides.length, originalPrompt, isFree, maxSlides]);

  useEffect(() => {
    if (!isInitialGenerating) return;
    const t = setInterval(() => setAiGenTipIndex((i) => (i + 1) % BUILDER_TIPS.length), 4500);
    return () => clearInterval(t);
  }, [isInitialGenerating]);

  const handleSendAIMessage = useCallback(async (userMessage: string) => {
    if (!hasAITokens(1)) {
      setShowOutOfCreditsModal(true);
      return;
    }
    addMessage({ role: 'user', content: userMessage });
    addMessage({ role: 'assistant', content: '', isLoading: true });
    setIsGenerating(true);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      if (sessionError || !session) throw new Error("Please sign in to use AI editing");

      const currentSlides = sandboxSlides.length > 0 ? sandboxSlides : slides;
      const conversationHistory = messages
        .slice(0, -1)
        .filter((m) => (m.role === 'user' || m.role === 'assistant') && !m.isLoading)
        .slice(-20)
        .map((m) => ({ role: m.role, content: m.content }));
      const { data, error: fnError } = await supabase.functions.invoke('chat-builder', {
        body: {
          message: userMessage,
          conversationHistory,
          slides: currentSlides,
          currentSlideIndex,
          originalPrompt: originalPrompt || '',
          targetAudience: targetAudience || 'general',
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (fnError) {
        if (getEdgeFunctionStatus(fnError) === 402) setShowOutOfCreditsModal(true);
        const msg = await getEdgeFunctionErrorMessage(fnError, 'Failed to process message.');
        throw new Error(msg);
      }
      const resData = data as { error?: string; message?: string; updatedSlides?: unknown[] };
      if (resData?.error) throw new Error(resData.error);

      if (resData?.updatedSlides?.length) {
        setSandboxSlides(resData.updatedSlides as Slide[]);
      }
      updateLastMessage(resData?.message || 'Done! Check the updated slides.');
    } catch (error) {
      updateLastMessage(
        `Sorry, I couldn't process that. ${error instanceof Error ? error.message : 'Please try again.'}`
      );
    } finally {
      setIsGenerating(false);
    }
  }, [sandboxSlides, slides, currentSlideIndex, originalPrompt, targetAudience, hasAITokens, addMessage, updateLastMessage, setIsGenerating, setSandboxSlides, messages]);

  // Clamp currentSlideIndex when slides count changes
  useEffect(() => {
    if (currentSlideIndex >= slides.length) {
      setCurrentSlideIndex(Math.max(0, slides.length - 1));
    }
  }, [slides.length, currentSlideIndex]);

  // Single-slide canvas; no scroll

  // Redirect mobile users to continue-on-desktop (building is desktop-only)
  useEffect(() => {
    if (isMobile) {
      navigate("/continue-on-desktop", { replace: true });
    }
  }, [isMobile, navigate]);

  // Hide phone preview when switching to a non-interactive slide
  useEffect(() => {
    if (showPhonePreview && !isParticipativeSlide(currentSlide?.type ?? "title")) {
      setShowPhonePreview(false);
    }
  }, [currentSlideIndex, currentSlide?.type]);

  // Apply lecture data (shared logic for preloaded and fetched)
  const applyLectureData = useCallback((lecture: { id: string; title?: string; lecture_code?: string; slides?: unknown; settings?: unknown }) => {
    const lectureUserId = (lecture as { user_id?: string }).user_id;
    if (user && lectureUserId && lectureUserId !== user.id) {
      toast.error("You don't have access to this lecture");
      navigate("/dashboard");
      return;
    }
    setLectureDbId(lecture.id);
    setLectureTitle(lecture.title ?? 'Untitled Lecture');
    setLectureCode(lecture.lecture_code ?? '');
    const raw = lecture.slides;
    const loadedSlides = Array.isArray(raw) ? (raw as unknown as Slide[]) : null;
    if (loadedSlides && loadedSlides.length > 0) {
      const valid = loadedSlides.every((s) => s && typeof s === 'object' && s.id && s.type);
      if (valid) setSlides(loadedSlides);
    }
    const settings = lecture.settings as Record<string, unknown> | null;
    if (settings?.themeId) setSelectedThemeId(settings.themeId as ThemeId);
    if (settings?.designStyleId) setSelectedDesignStyleId(settings.designStyleId as DesignStyleId);
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
          navigate("/dashboard", { replace: true });
        }
      } catch (error) {
        if (cancelled) return;
        console.error('Error loading lecture:', error);
        const msg = error instanceof Error && error.message.includes('timed out')
          ? 'Lecture load timed out. Please try again.'
          : 'Failed to load lecture';
        toast.error(msg);
        navigate("/dashboard", { replace: true });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadLecture();
    return () => { cancelled = true; };
  }, [lectureId, user?.id, isAuthLoading, navigate, location.state, applyLectureData]);

  // Auto-save with debounce - also saves theme settings
  const saveToDatabase = useCallback(async () => {
    if (!hasChanges) return;
    
    setIsSaving(true);
    try {
      const settings = { themeId: selectedThemeId, designStyleId: selectedDesignStyleId };
      
      if (lectureDbId) {
        // Update existing lecture
        await updateLecture(lectureDbId, {
          slides,
          settings,
        });
      } else {
        // Create new lecture
        const newLecture = await createLecture(lectureTitle, slides);
        setLectureDbId(newLecture.id);
        setLectureCode(newLecture.lecture_code);
        // Update URL without navigation
        window.history.replaceState(null, '', `/editor/${newLecture.id}`);
        // Save settings to the new lecture
        await updateLecture(newLecture.id, { settings });
      }
      setHasChanges(false);
      toast.success('Saved!');
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save');
    } finally {
      setIsSaving(false);
    }
  }, [hasChanges, lectureDbId, lectureTitle, slides, selectedThemeId, selectedDesignStyleId]);

  // Save title changes
  const saveTitleToDatabase = useCallback(async () => {
    if (!lectureDbId) return;
    
    try {
      await updateLecture(lectureDbId, { slides }); // Title is saved with slides
    } catch (error) {
      console.error('Error saving title:', error);
    }
  }, [lectureDbId, slides]);

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

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSlides((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newSlides = arrayMove(items, oldIndex, newIndex).map((slide, index) => ({
          ...slide,
          order: index,
        }));

        // Update current slide index if needed
        if (currentSlideIndex === oldIndex) {
          setCurrentSlideIndex(newIndex);
        } else if (oldIndex < currentSlideIndex && newIndex >= currentSlideIndex) {
          setCurrentSlideIndex(currentSlideIndex - 1);
        } else if (oldIndex > currentSlideIndex && newIndex <= currentSlideIndex) {
          setCurrentSlideIndex(currentSlideIndex + 1);
        }

        setHasChanges(true);
        return newSlides;
      });
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

    // New slides are appended at the end; select the new slide so user sees it
    const newSlide = createNewSlide(type, slides.length);
    const newSlides = [...slides, newSlide].map((s, idx) => ({ ...s, order: idx }));
    setSlides(newSlides);
    setCurrentSlideIndex(newSlides.length - 1);
    setHasChanges(true);
  }, [slides, isFree, maxSlides, showUpgradeModal]);

  // ResizeObserver (debounced): compute slide size from canvas - same logic for AI and Start from scratch
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
      const reservedW = showPhonePreview ? 280 + 16 : 0;
      const pad = 16;
      const maxW = Math.max(200, cw - reservedW - pad);
      const maxH = Math.max(112, ch - pad);
      const maxRem = 96 * 16;
      const w = Math.min(maxW, maxH * (16 / 9), maxRem);
      const h = w * (9 / 16);
      setSlideSize({ width: Math.round(w), height: Math.round(h) });
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
  }, [isAIPanelOpen, showPhonePreview, slides.length]);

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
    setHasChanges(true);
  };

  const handleSingleSlideAIContent = (content: SlideContent) => {
    // Check if AI also generated design properties (like background image)
    const contentWithDesign = content as SlideContent & { _generatedDesign?: Partial<SlideDesign> };
    const generatedDesign = contentWithDesign._generatedDesign;
    
    // Remove the internal _generatedDesign field before saving content
    const cleanContent = { ...content };
    delete (cleanContent as any)._generatedDesign;
    
    // Update both content and design if needed
    setSlides(slides.map((slide, index) => {
      if (index !== currentSlideIndex) return slide;
      
      const updatedSlide = { ...slide, content: cleanContent };
      
      // Merge generated design (like overlay image) with existing design
      if (generatedDesign) {
        updatedSlide.design = {
          ...slide.design,
          ...generatedDesign,
        };
      }
      
      return updatedSlide;
    }));
    setHasChanges(true);
  };

  const updateSlideDesign = (design: SlideDesign) => {
    setSlides(slides.map((slide, index) =>
      index === currentSlideIndex
        ? { ...slide, design }
        : slide
    ));
    setHasChanges(true);
  };

  const deleteSlide = () => {
    if (slides.length > 1) {
      const newSlides = slides.filter((_, index) => index !== currentSlideIndex);
      setSlides(newSlides);
      setCurrentSlideIndex(Math.min(currentSlideIndex, newSlides.length - 1));
      setHasChanges(true);
    }
  };

  const handlePresent = async () => {
    // Enter fullscreen immediately for ideal presentation experience
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
    // Save only when there are actual changes
    if (hasChanges) {
      await saveToDatabase();
    }
    if (lectureDbId) {
      navigate(`/present/${lectureDbId}`);
    } else {
      // Create lecture first
      try {
        const newLecture = await createLecture(lectureTitle, slides);
        navigate(`/present/${newLecture.id}`);
      } catch (error) {
        toast.error('Failed to start presentation');
      }
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
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="gap-1.5">
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
              onClick={saveToDatabase}
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
            <Button variant="hero" size="sm" onClick={handlePresent} className="h-8">
              <Play className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Present</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Top Toolbar - Google Slides style */}
      <EditorTopToolbar
        slide={currentSlide}
        onUpdateDesign={updateSlideDesign}
        onUpdateDesignForAllSlides={(u) => {
          setSlides(slides.map((s) => ({ ...s, design: { ...s.design, ...u } })));
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
      />

      {/* Import Dialog */}
      <ImportPresentationDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onSlidesImported={handleSlidesImported}
        existingSlideCount={slides.length}
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
            isAIPanelOpen ? 'w-[min(360px,26vw)] opacity-100' : 'w-52 opacity-100'
          }`}
        >
          {/* Mode toggle */}
          <div className="flex-shrink-0 p-2 pb-1 flex items-center gap-1">
            {isAIPanelOpen ? (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => setIsAIPanelOpen(false)}
              >
                <List className="w-3.5 h-3.5" />
                Slides
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                className="flex-1 gap-1.5 border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary"
                onClick={() => setIsAIPanelOpen(true)}
              >
                <Wand2 className="w-3.5 h-3.5" />
                Edit with AI
              </Button>
            )}
          </div>

          {isAIPanelOpen ? (
            <div className="flex-1 min-h-0 flex flex-col">
              <ChatPanel
                onSendMessage={handleSendAIMessage}
                embeddedInEditor
              />
            </div>
          ) : (
            <>
              {/* Slides list - Scrollable */}
              <div className="flex-1 overflow-y-auto p-2 min-h-0">
                {/* Add Slide CTA - first item */}
                <button
                  type="button"
                  onClick={() => setShowAddSlidePicker(true)}
                  className="w-full flex items-center gap-2 p-3 mb-2 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary/60 text-primary font-medium transition-all"
                >
                  <Plus className="w-4 h-4 flex-shrink-0" />
                  Add slide
                </button>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={slides.map(s => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-1.5">
                      {slides.map((slide, index) => (
                        <SortableSlideItem
                          key={slide.id}
                          slide={slide}
                          index={index}
                          isSelected={index === currentSlideIndex}
                          onClick={() => setCurrentSlideIndex(index)}
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
          {/* Canvas: single-slide view (placeholders shown during AI generation) */}
          <div ref={slidePreviewRef} className="flex-1 overflow-hidden flex gap-6 min-h-0 relative">
            <div className={`flex-1 flex relative ${showPhonePreview ? 'flex-row items-center justify-center gap-4' : 'items-center justify-center p-2'} min-h-0 overflow-hidden`}>
              {currentSlide && (
                <div
                  className="shrink-0 relative ring-4 ring-primary ring-offset-2 ring-offset-background rounded-xl"
                  style={
                    showPhonePreview
                      ? undefined
                      : slideSize
                        ? { width: slideSize.width, height: slideSize.height }
                        : { width: 960, height: 540 }
                  }
                >
                  <span className="absolute -top-1 left-3 z-10 text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                    {safeIndex + 1} / {slides.length}
                  </span>
                  <div className={showPhonePreview ? "w-full max-w-[32rem] aspect-video" : "w-full h-full"}>
                    <SlideRenderer
                      key={currentSlide.id}
                      slide={currentSlide}
                      isEditing={!simulationData ? isEditing : false}
                      showResults={showResults || !!simulationData}
                      onUpdateContent={updateSlideContent}
                      liveResults={simulationData}
                      totalResponses={simulationData?.total ?? 0}
                      themeId={selectedThemeId}
                      designStyleId={selectedDesignStyleId}
                      hideFooter={false}
                    />
                  </div>
                </div>
              )}
            </div>
            {/* Overlay during AI generation */}
            {isInitialGenerating && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
                <Loader2 className="w-10 h-10 animate-spin text-primary mb-3" />
                <p className="text-sm font-medium text-foreground">Building your presentation with AI</p>
                <p className="text-xs text-muted-foreground mt-1">Tip {aiGenTipIndex + 1}: {BUILDER_TIPS[aiGenTipIndex]}</p>
              </div>
            )}

            {/* Phone Preview - when enabled (hidden during AI generation) */}
            {showPhonePreview && !isInitialGenerating && (
              <div className="flex-shrink-0 w-[280px] h-[500px] relative animate-in fade-in slide-in-from-right-4 duration-200">
                {/* Phone Frame */}
                <div className="absolute inset-0 bg-black rounded-[2.5rem] p-2 shadow-2xl">
                  {/* Dynamic Island */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-20" />
                  {/* Screen */}
                  <div className="w-full h-full rounded-[2rem] overflow-hidden">
                    <StudentPreview 
                      slide={currentSlide}
                      themeId={selectedThemeId}
                    />
                  </div>
                  {/* Home Indicator */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/40 rounded-full" />
                </div>
              </div>
            )}
          </div>

          {/* Bottom Toolbar - Fixed/Sticky - z-10 ensures it's above the slide */}
          <div className="flex-shrink-0 border-t border-border/50 bg-card/80 backdrop-blur-sm p-3 relative z-10">
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
                  {currentSlideIndex + 1} / {slides.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1))}
                  disabled={currentSlideIndex === slides.length - 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Center controls */}
              <div className="flex items-center gap-2">
                {/* Phone Preview Toggle - only on interactive/quiz slides */}
                {isParticipativeSlide(currentSlide.type) && (
                  <Button
                    variant={showPhonePreview ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setShowPhonePreview(!showPhonePreview)}
                    className="gap-2"
                    title="Preview as student phone"
                  >
                    {showPhonePreview ? (
                      <>
                        <Monitor className="w-4 h-4" />
                        Presenter
                      </>
                    ) : (
                      <>
                        <Smartphone className="w-4 h-4" />
                        Student View
                      </>
                    )}
                  </Button>
                )}

                <div className="w-px h-6 bg-border" />

                <AnimateButton
                  slide={currentSlide}
                  onSimulationData={setSimulationData}
                  hasSimulationData={!!simulationData}
                />

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsAIPanelOpen(true)}
                  className="gap-2 border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary font-medium"
                >
                  <Wand2 className="w-4 h-4" />
                  Edit with AI
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddSlidePicker(true)}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
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
                disabled={slides.length <= 1}
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
