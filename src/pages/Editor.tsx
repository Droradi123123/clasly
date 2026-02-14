import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EditorTopToolbar } from "@/components/editor/EditorTopToolbar";
import { SlideRenderer } from "@/components/editor/SlideRenderer";
import { ImportPresentationDialog } from "@/components/editor/ImportPresentationDialog";
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
import { UpgradeModal, useUpgradeModal } from "@/components/billing/UpgradeModal";

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
  const [isSlidesPanelCollapsed, setIsSlidesPanelCollapsed] = useState(false);
  const { lectureId } = useParams();
  const navigate = useNavigate();
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
  const [selectedThemeId, setSelectedThemeId] = useState<ThemeId>('neon-cyber');
  const [selectedDesignStyleId, setSelectedDesignStyleId] = useState<DesignStyleId>('dynamic');
  const [simulationData, setSimulationData] = useState<any>(null);
  const [showPhonePreview, setShowPhonePreview] = useState(false);

  // Subscription & upgrade modal
  const { isFree, maxSlides, isPro } = useSubscriptionContext();
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

  const currentSlide = slides[currentSlideIndex];

  // Load lecture from database if it exists
  useEffect(() => {
    const loadLecture = async () => {
      if (!lectureId || lectureId === 'new') {
        setIsLoading(false);
        return;
      }

      try {
        const lecture = await getLecture(lectureId);
        if (lecture) {
          setLectureDbId(lecture.id);
          setLectureTitle(lecture.title);
          setLectureCode(lecture.lecture_code);
          const loadedSlides = lecture.slides as unknown as Slide[];
          if (loadedSlides && loadedSlides.length > 0) {
            setSlides(loadedSlides);
          }
          // Load saved theme settings
          const settings = lecture.settings as Record<string, unknown> | null;
          if (settings?.themeId) {
            setSelectedThemeId(settings.themeId as ThemeId);
          }
          if (settings?.designStyleId) {
            setSelectedDesignStyleId(settings.designStyleId as DesignStyleId);
          }
        }
      } catch (error) {
        console.error('Error loading lecture:', error);
        toast.error('Failed to load lecture');
      } finally {
        setIsLoading(false);
      }
    };

    loadLecture();
  }, [lectureId]);

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

  const addSlide = (type: SlideType) => {
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

    // New slides should be inserted first (index 0)
    const newSlide = createNewSlide(type, 0);
    const newSlides = [newSlide, ...slides].map((s, idx) => ({ ...s, order: idx }));
    setSlides(newSlides);
    setCurrentSlideIndex(0);
    setHasChanges(true);
  };

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
    // Save before presenting
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

  // Group slide types by category
  const contentSlideTypes = SLIDE_TYPES.filter(t => t.category === 'content');
  const interactiveSlideTypes = SLIDE_TYPES.filter(t => t.category === 'interactive');
  const quizSlideTypes = SLIDE_TYPES.filter(t => t.category === 'quiz');

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
        selectedThemeId={selectedThemeId}
        onSelectTheme={(id) => { setSelectedThemeId(id); setHasChanges(true); }}
        onPremiumThemeBlocked={() => showUpgradeModal({
          feature: "premium themes",
          title: "Premium theme",
          description: "This theme is only available on the Pro plan. Upgrade to unlock all premium themes.",
        })}
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
            title: "Import is a Pro feature",
            description: "Upgrade to Pro to import PowerPoint and PDF presentations.",
          })
        }
      />

      {/* Upgrade Modal */}
      <UpgradeModalComponent />

      {/* Main Editor Area - Fill remaining height */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Slides Panel - collapsible with CSS transition */}
        <div
          className={`flex-shrink-0 border-r border-border/50 bg-card/30 flex flex-col overflow-hidden transition-all duration-200 ${
            isSlidesPanelCollapsed ? 'w-0 opacity-0' : 'w-52 opacity-100'
          }`}
        >
          {/* Import + Collapse controls */}
          <div className="flex-shrink-0 p-2 pb-0 flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImportDialog(true)}
              className="flex-1 gap-2"
            >
              <Upload className="w-4 h-4" />
              Import
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={() => setIsSlidesPanelCollapsed(true)}
              title="Hide slides panel"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>

          {/* Slides list - Scrollable */}
          <div className="flex-1 overflow-y-auto p-2 min-h-0">
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

            {/* Add Slide Tile */}
            <Select onValueChange={(value) => addSlide(value as SlideType)}>
              <SelectTrigger className="w-full mt-2 p-3 h-auto border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all rounded-lg">
                <div className="flex flex-col items-center justify-center gap-1 py-2 w-full">
                  <Plus className="w-6 h-6 text-primary" />
                  <span className="text-primary font-medium text-xs">Add Slide</span>
                </div>
              </SelectTrigger>
              <SelectContent className="w-72">
                {/* Content Section */}
                <div className="p-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 px-2 uppercase tracking-wide">Content</p>
                  {contentSlideTypes.map((slideType) => {
                    const Icon = SLIDE_ICONS[slideType.type];
                    return (
                      <SelectItem key={slideType.type} value={slideType.type} className="py-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-muted flex items-center justify-center">
                            <Icon className="w-3.5 h-3.5 text-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-xs">{slideType.label}</p>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </div>
                
                {/* Interactive Section - No correct answers */}
                <div className="p-1.5 border-t">
                  <div className="flex items-center gap-2 mb-1.5 px-2">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Interactive</p>
                    <span className="text-[8px] px-1.5 py-0.5 bg-blue-500/20 text-blue-600 rounded-full font-medium">Engagement</span>
                  </div>
                  {interactiveSlideTypes.map((slideType) => {
                    const Icon = SLIDE_ICONS[slideType.type];
                    return (
                      <SelectItem key={slideType.type} value={slideType.type} className="py-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-blue-500/20 flex items-center justify-center">
                            <Icon className="w-3.5 h-3.5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-xs">{slideType.label}</p>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </div>
                
                {/* Quiz Section - With correct answers */}
                <div className="p-1.5 border-t">
                  <div className="flex items-center gap-2 mb-1.5 px-2">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Quiz</p>
                    <span className="text-[8px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-600 rounded-full font-medium">Competition</span>
                  </div>
                  {quizSlideTypes.map((slideType) => {
                    const Icon = SLIDE_ICONS[slideType.type];
                    return (
                      <SelectItem key={slideType.type} value={slideType.type} className="py-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-emerald-500/20 flex items-center justify-center">
                            <Icon className="w-3.5 h-3.5 text-emerald-600" />
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-xs">{slideType.label}</p>
                            <span className="text-[8px] px-1 py-0.5 bg-emerald-100 text-emerald-700 rounded">✓</span>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </div>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Main Editor - Canvas + Fixed Bottom Toolbar */}
        <div className="flex-1 flex flex-col overflow-hidden bg-muted/50 relative">
          {/* Expand handle when slides panel is collapsed */}
          {isSlidesPanelCollapsed && (
            <div className="absolute left-2 top-24 z-20">
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0 bg-background/80 backdrop-blur"
                onClick={() => setIsSlidesPanelCollapsed(false)}
                title="Show slides panel"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Slide Preview - centered, present-like sizing (no cropping) */}
          <div className="flex-1 p-6 flex items-center justify-center min-h-0 gap-6">
            {/* Main Presenter Preview - Reduced animations for performance */}
            <div
              className={
                showPhonePreview
                  ? "w-full max-w-3xl max-h-[80vh] aspect-video transition-all duration-200"
                  : "w-full h-full max-w-7xl max-h-[80vh] aspect-video transition-all duration-200"
              }
            >
              <SlideRenderer
                slide={currentSlide}
                isEditing={simulationData ? false : isEditing}
                showResults={showResults || !!simulationData}
                onUpdateContent={updateSlideContent}
                liveResults={simulationData}
                totalResponses={simulationData?.total || 0}
                themeId={selectedThemeId}
                designStyleId={selectedDesignStyleId}
                hideFooter={isSlidesPanelCollapsed}
              />
            </div>

            {/* Phone Preview - Simplified animation */}
            {showPhonePreview && (
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
                {/* Phone Preview Toggle */}
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

                <div className="w-px h-6 bg-border" />

                <AnimateButton
                  slide={currentSlide}
                  onSimulationData={setSimulationData}
                  hasSimulationData={!!simulationData}
                />

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Open Chat Builder and focus the slide the user is on
                    localStorage.setItem(
                      "clasly_builder_slides",
                      JSON.stringify(slides)
                    );
                    localStorage.setItem("clasly_builder_source", "editor");
                    navigate(`/builder?slide=${currentSlideIndex}`);
                  }}
                  className="gap-2"
                >
                  <Wand2 className="w-4 h-4" />
                  AI
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
