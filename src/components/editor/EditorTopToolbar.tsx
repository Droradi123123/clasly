import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  ImageIcon,
  Sparkles,
  Type,
  ChevronDown,
  Loader2,
  X,
  IndentIncrease,
  IndentDecrease,
  Upload,
  LayoutList,
  LayoutGrid,
  Rows3,
  Cloud,
  Tags,
  List,
  ListOrdered,
  ThumbsUp,
  Circle,
  Sliders,
  Hash,
  MessageSquare,
  Heart,
  ArrowLeftRight,
  TrendingUp,
  Thermometer,
  Clock,
  Award,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Slide,
  SlideDesign,
  FontFamily,
  FontSize,
  TextAlign,
  GRADIENT_PRESETS,
  OverlayImagePosition,
  LogoPosition,
  LogoScope,
  ActivitySettings,
  isParticipativeSlide,
  isInteractiveSlide,
  isQuizSlide,
  getResolvedActivitySettings,
  DEFAULT_ACTIVITY_DURATION_SEC,
  DEFAULT_POINTS_CORRECT,
  DEFAULT_POINTS_PARTICIPATION,
} from "@/types/slides";
import type { DesignStyleId } from "@/types/designStyles";
import { ThemeId, getTheme } from "@/types/themes";
import { ThemeSelector } from "./ThemeSelector";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface EditorTopToolbarProps {
  slide: Slide;
  onUpdateDesign: (design: SlideDesign) => void;
  selectedThemeId: ThemeId;
  onSelectTheme: (themeId: ThemeId) => void;
  onPremiumThemeBlocked?: () => void;
  /** Propagate design updates to all slides (e.g. theme) */
  onUpdateDesignForAllSlides?: (updates: Partial<SlideDesign>) => void;
  /** Pro: full controls. Free: premium color/theme gates. Slide logo lives in Presentation / Webinar settings. */
  isPro?: boolean;
  onPremiumColorBlocked?: () => void;
  /** Import presentation (PPT/PDF) - opens Import dialog */
  onImportClick?: () => void;
  /** When true, use compact padding (constrained viewport) */
  compact?: boolean;
  /** Participative slides: timer length and scoring */
  onUpdateActivitySettings?: (settings: Partial<ActivitySettings>) => void;
  className?: string;
}

const FONT_OPTIONS: { value: FontFamily; label: string }[] = [
  { value: "Inter", label: "Inter" },
  { value: "Space Grotesk", label: "Space Grotesk" },
  { value: "Poppins", label: "Poppins" },
  { value: "Lora", label: "Lora" },
  { value: "Roboto", label: "Roboto" },
  { value: "Open Sans", label: "Open Sans" },
];

const FONT_SIZE_OPTIONS: { value: FontSize; label: string; size: string }[] = [
  { value: "small", label: "Small", size: "14" },
  { value: "medium", label: "Medium", size: "18" },
  { value: "large", label: "Large", size: "24" },
];

export function EditorTopToolbar({
  slide,
  onUpdateDesign,
  selectedThemeId,
  onSelectTheme,
  onPremiumThemeBlocked,
  onUpdateDesignForAllSlides,
  isPro = false,
  onPremiumColorBlocked,
  onImportClick,
  className,
  compact = false,
  onUpdateActivitySettings,
}: EditorTopToolbarProps) {
  const design = slide.design || {};
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [pendingThemeId, setPendingThemeId] = useState<ThemeId | null>(null);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [customBgColor, setCustomBgColor] = useState(design.backgroundColor || "#6366f1");
  const [imageUrlInput, setImageUrlInput] = useState(design.overlayImageUrl || "");

  useEffect(() => {
    setImageUrlInput(design.overlayImageUrl || "");
  }, [design.overlayImageUrl]);

  const updateDesign = (updates: Partial<SlideDesign>) => {
    onUpdateDesign({ ...design, ...updates });
  };

  const isRtl = design.direction === "rtl";
  const showActivityControls = isParticipativeSlide(slide.type) && onUpdateActivitySettings;
  /** Opinion / scale / sentiment / word cloud — no timer or points in product rules; controls hidden. */
  const isInteractiveEngagement = isInteractiveSlide(slide.type);
  const resolvedActivity = getResolvedActivitySettings(slide);
  const rawDuration = slide.activitySettings?.duration;
  const rawPointsCorrect = slide.activitySettings?.pointsForCorrect;
  const rawPointsParticipation = slide.activitySettings?.pointsForParticipation;
  const expectedDefaultQuizDuration = 30;
  const expectedDefaultDuration = isQuizSlide(slide.type)
    ? expectedDefaultQuizDuration
    : DEFAULT_ACTIVITY_DURATION_SEC;
  const isDefaultTimer =
    rawDuration === undefined &&
    resolvedActivity.hasTimer &&
    resolvedActivity.durationSeconds === expectedDefaultDuration;
  const isDefaultPoints =
    rawPointsCorrect === undefined &&
    rawPointsParticipation === undefined &&
    resolvedActivity.pointsForCorrect === DEFAULT_POINTS_CORRECT &&
    resolvedActivity.pointsForParticipation === DEFAULT_POINTS_PARTICIPATION;

  const TIMER_PRESETS = [10, 20, 30, 60, 90, 120] as const;
  const POINT_PRESETS = [
    { correct: 500, participation: 250 },
    { correct: 1000, participation: 500 },
    { correct: 2000, participation: 1000 },
  ] as const;

  return (
    <div
      className={cn(
        "flex-shrink-0 border-b border-border/50 bg-card/80 backdrop-blur-sm",
        className
      )}
    >
      <div className={`flex items-center gap-1 overflow-x-auto ${compact ? 'px-3 py-1.5' : 'px-4 py-2'}`}>
        {/* Text & layout — single compact control */}
        <div className="flex items-center pr-3 border-r border-border/50 shrink-0">
          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h-8 border-border/80 bg-background/90 hover:bg-muted/60 shrink-0 ${
                      compact ? "gap-0.5 px-1.5" : "gap-1.5 px-2.5"
                    }`}
                    aria-label="Text, font, color, alignment"
                  >
                    {compact ? (
                      <>
                        <Type className="w-4 h-4 shrink-0" />
                        <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
                      </>
                    ) : (
                      <>
                        <Type className="w-4 h-4 shrink-0" />
                        <span
                          className="h-3.5 w-3.5 rounded border border-border/60 shrink-0 shadow-inner"
                          style={{ backgroundColor: design.textColor || "#ffffff" }}
                        />
                        <span className="text-[11px] text-muted-foreground max-w-[52px] truncate hidden sm:inline">
                          {FONT_SIZE_OPTIONS.find((s) => s.value === (design.fontSize || "medium"))?.label ?? "Medium"}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 opacity-60 shrink-0 hidden sm:inline" />
                      </>
                    )}
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                Font, size, color, alignment &amp; text direction
              </TooltipContent>
            </Tooltip>
            <PopoverContent className="w-80 p-0" align="start" sideOffset={6}>
              <div className="px-3 pt-3 pb-2">
                <p className="text-xs font-semibold text-foreground">Text &amp; layout</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Font, size, color, alignment, direction</p>
              </div>
              <Separator />
              <div className="p-3 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">Font</Label>
                  <Select
                    value={design.fontFamily || "Inter"}
                    onValueChange={(value) => updateDesign({ fontFamily: value as FontFamily })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Font" />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map((font) => (
                        <SelectItem
                          key={font.value}
                          value={font.value}
                          style={{ fontFamily: font.value }}
                        >
                          {font.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">Size</Label>
                  <Select
                    value={design.fontSize || "medium"}
                    onValueChange={(value) => updateDesign({ fontSize: value as FontSize })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Size" />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_SIZE_OPTIONS.map((size) => (
                        <SelectItem key={size.value} value={size.value}>
                          {size.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] text-muted-foreground">Text color</Label>
                  <div className="flex flex-wrap gap-2">
                    {["#ffffff", "#000000", "#f1f5f9", "#fef3c7", "#dbeafe", "#fee2e2", "#d1fae5"].map(
                      (color) => (
                        <motion.button
                          key={color}
                          type="button"
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => updateDesign({ textColor: color })}
                          className={`w-7 h-7 rounded-md shadow-sm border-2 ${
                            design.textColor === color
                              ? "border-primary ring-1 ring-primary"
                              : "border-border"
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      )
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={design.textColor || "#ffffff"}
                      onChange={(e) => updateDesign({ textColor: e.target.value })}
                      className="w-10 h-9 p-0 border-0 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={design.textColor || "#ffffff"}
                      onChange={(e) => updateDesign({ textColor: e.target.value })}
                      className="flex-1 h-9 text-xs font-mono"
                      placeholder="#ffffff"
                    />
                  </div>
                </div>
              </div>
              <Separator />
              <div className="p-3 space-y-2">
                <Label className="text-[11px] text-muted-foreground">Alignment</Label>
                <div className="flex gap-1">
                  {[
                    { value: "left", icon: AlignLeft },
                    { value: "center", icon: AlignCenter },
                    { value: "right", icon: AlignRight },
                  ].map(({ value, icon: Icon }) => (
                    <Button
                      key={value}
                      type="button"
                      variant={design.textAlign === value ? "secondary" : "outline"}
                      size="sm"
                      className="flex-1 h-9"
                      onClick={() => updateDesign({ textAlign: value as TextAlign })}
                    >
                      <Icon className="w-4 h-4" />
                    </Button>
                  ))}
                </div>
              </div>
              <Separator />
              <div className="p-3 space-y-2">
                <Label className="text-[11px] text-muted-foreground">Direction</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={isRtl ? "secondary" : "outline"}
                    size="sm"
                    className="h-9 gap-1.5"
                    onClick={() => {
                      const nextDir = isRtl ? "ltr" : "rtl";
                      const updates: Partial<SlideDesign> = { direction: nextDir };
                      if (design.textAlign !== "center") {
                        updates.textAlign = nextDir === "rtl" ? "right" : "left";
                      }
                      updateDesign(updates);
                    }}
                  >
                    <IndentIncrease className="w-4 h-4" />
                    RTL
                  </Button>
                  <Button
                    type="button"
                    variant={!isRtl ? "secondary" : "outline"}
                    size="sm"
                    className="h-9 gap-1.5"
                    onClick={() => {
                      const updates: Partial<SlideDesign> = { direction: "ltr" };
                      if (design.textAlign !== "center") {
                        updates.textAlign = "left";
                      }
                      updateDesign(updates);
                    }}
                  >
                    <IndentDecrease className="w-4 h-4" />
                    LTR
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Group C - Slide Style */}
        <div className="flex items-center gap-1 px-3">
          {/* Participative: timer & points — compact buttons (open popovers) */}
          {showActivityControls && (
            <>
              {!isInteractiveEngagement && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
                    <Clock className="w-4 h-4 text-violet-600" />
                    <span className="hidden sm:inline">
                      Timer{" "}
                      <span className="text-muted-foreground">
                        {resolvedActivity.hasTimer ? `${resolvedActivity.durationSeconds}s` : "Off"}
                      </span>
                    </span>
                    {isDefaultTimer && (
                      <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        default
                      </span>
                    )}
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-3" align="start">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground">Live timer</p>
                        <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                          Shown to you and students in Present mode.
                        </p>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted/80"
                            aria-label="How the timer works in presentation"
                          >
                            <HelpCircle className="w-4 h-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs text-left">
                          <p className="font-medium mb-1">During your live session</p>
                          <p className="text-xs text-muted-foreground">
                            The countdown appears for you and your audience. Results stay hidden
                            until time runs out. Choose <strong>Off</strong> for live-updating
                            results—no countdown.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => onUpdateActivitySettings!({ duration: 0 })}
                        className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                          !resolvedActivity.hasTimer
                            ? "bg-violet-600 text-white shadow-sm"
                            : "bg-muted/80 text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        Off
                      </button>
                      {TIMER_PRESETS.map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => onUpdateActivitySettings!({ duration: sec })}
                          className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                            resolvedActivity.hasTimer && resolvedActivity.durationSeconds === sec
                              ? "bg-violet-600 text-white shadow-sm"
                              : "bg-muted/80 text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          <span className="inline-flex items-center gap-1">
                            {sec}s
                            {sec === expectedDefaultDuration && isDefaultTimer && (
                              <span className="text-[10px] opacity-90">(default)</span>
                            )}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              )}

              {!isInteractiveEngagement && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
                      <Award className="w-4 h-4 text-teal-600" />
                      <span className="hidden sm:inline">
                        Points{" "}
                        <span className="text-muted-foreground tabular-nums">
                          {resolvedActivity.pointsForCorrect}
                        </span>
                      </span>
                      {isDefaultPoints && (
                        <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          default
                        </span>
                      )}
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-3" align="start">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-foreground">Points</p>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        Awarded when students submit (live).
                      </p>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {POINT_PRESETS.map(({ correct, participation }) => (
                          <button
                            key={correct}
                            type="button"
                            onClick={() =>
                              onUpdateActivitySettings!({
                                pointsForCorrect: correct,
                                pointsForParticipation: participation,
                              })
                            }
                            className={`rounded-md px-2.5 py-1 text-[11px] font-semibold tabular-nums transition-colors ${
                              resolvedActivity.pointsForCorrect === correct
                                ? "bg-teal-600 text-white shadow-sm"
                                : "bg-muted/80 text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            <span className="inline-flex items-center gap-1">
                              {correct}
                              {correct === DEFAULT_POINTS_CORRECT && isDefaultPoints && (
                                <span className="text-[10px] opacity-90">(default)</span>
                              )}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </>
          )}

          {/* Background Picker */}
          <Popover open={showBgPicker} onOpenChange={setShowBgPicker}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                data-tour="editor-toolbar-bg"
              >
                <div
                  className="w-4 h-4 rounded border border-border/50"
                  style={{
                    background: design.gradientPreset
                      ? (() => {
                          const preset = GRADIENT_PRESETS.find(
                            (g) => g.id === design.gradientPreset
                          );
                          return preset
                            ? `linear-gradient(${preset.angle}deg, ${preset.colors.join(", ")})`
                            : design.backgroundColor || "#6366f1";
                        })()
                      : design.backgroundColor || "#6366f1",
                  }}
                />
                Background
                <ChevronDown className="w-3 h-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="start">
              <div className="space-y-3">
                <Label className="text-xs font-medium">Background</Label>
                <div className="grid grid-cols-5 gap-2">
                  {GRADIENT_PRESETS.map((preset) => (
                    <motion.button
                      key={preset.id}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        updateDesign({ gradientPreset: preset.id, backgroundColor: undefined });
                        setShowBgPicker(false);
                      }}
                      className={`w-full aspect-square rounded-lg overflow-hidden shadow-sm ${
                        design.gradientPreset === preset.id && !design.backgroundColor
                          ? "ring-2 ring-primary ring-offset-1"
                          : ""
                      }`}
                      style={{
                        background: `linear-gradient(${preset.angle}deg, ${preset.colors.join(", ")})`,
                      }}
                      title={preset.name}
                    />
                  ))}
                </div>
                <div className="pt-2 border-t border-border/50">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    Custom Color {!isPro && <Lock className="w-3 h-3 text-amber-500" />}
                  </Label>
                  {isPro ? (
                    <div className="flex gap-2 mt-2">
                      <Input
                        type="color"
                        value={customBgColor}
                        onChange={(e) => setCustomBgColor(e.target.value)}
                        className="w-10 h-8 p-0 border-0 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={customBgColor}
                        onChange={(e) => setCustomBgColor(e.target.value)}
                        className="flex-1 h-8 text-xs font-mono"
                        placeholder="#000000"
                      />
                      <Button
                        size="sm"
                        className="h-8"
                        onClick={() => {
                          updateDesign({ backgroundColor: customBgColor, gradientPreset: undefined });
                          setShowBgPicker(false);
                        }}
                      >
                        Apply
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2 gap-1.5"
                      onClick={() => onPremiumColorBlocked?.()}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Unlock with Pro
                    </Button>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Theme Picker - on select show scope dialog: current slide vs all slides */}
          <Popover open={showThemePicker} onOpenChange={setShowThemePicker}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
                <Sparkles className="w-4 h-4" />
                Theme
                <ChevronDown className="w-3 h-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3" align="start">
              <ThemeSelector
                selectedThemeId={selectedThemeId}
                onSelectTheme={(id) => {
                  setPendingThemeId(id);
                  setShowThemePicker(false);
                }}
                onPremiumBlocked={onPremiumThemeBlocked}
              />
            </PopoverContent>
          </Popover>

          {/* Theme scope: apply to current slide only or entire presentation */}
          <AlertDialog open={pendingThemeId !== null} onOpenChange={(open) => { if (!open) setPendingThemeId(null); }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Apply theme to</AlertDialogTitle>
                <AlertDialogDescription>
                  Apply this color theme to the current slide only, or to the entire presentation?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                <AlertDialogAction
                  className="w-full sm:w-auto"
                  onClick={() => {
                    if (pendingThemeId) {
                      const theme = getTheme(pendingThemeId);
                      updateDesign({
                        themeId: pendingThemeId,
                        gradientPreset: undefined,
                        backgroundColor: theme.preview.gradient,
                      });
                      onSelectTheme(pendingThemeId);
                      setPendingThemeId(null);
                    }
                  }}
                >
                  Current slide only
                </AlertDialogAction>
                <AlertDialogAction
                  className="w-full sm:w-auto"
                  onClick={() => {
                    if (pendingThemeId) {
                      const theme = getTheme(pendingThemeId);
                      const updates = {
                        themeId: pendingThemeId,
                        gradientPreset: undefined,
                        backgroundColor: theme.preview.gradient,
                      };
                      if (onUpdateDesignForAllSlides) {
                        onUpdateDesignForAllSlides(updates);
                      } else {
                        updateDesign(updates);
                      }
                      onSelectTheme(pendingThemeId);
                      setPendingThemeId(null);
                    }
                  }}
                >
                  Entire presentation
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Per-type distinct design: 2 options (default + one variant) – icons only with tooltip */}
          {(() => {
            type IconComp = React.ComponentType<{ className?: string }>;
            const variantConfig: Record<string, { key: keyof SlideDesign; variant2: string; label1: string; label2: string; icon1: IconComp; icon2: IconComp }> = {
              quiz: { key: 'quizVariant', variant2: 'listWithIcons', label1: 'Cards', label2: 'Icon list', icon1: LayoutGrid, icon2: List },
              poll: { key: 'pollVariant', variant2: 'rankedBars', label1: 'Bars', label2: 'Ranked bars', icon1: Rows3, icon2: TrendingUp },
              poll_quiz: { key: 'pollVariant', variant2: 'rankedBars', label1: 'Bars', label2: 'Ranked bars', icon1: Rows3, icon2: TrendingUp },
              yesno: { key: 'yesNoVariant', variant2: 'thumbsDynamic', label1: 'Buttons', label2: 'Thumbs', icon1: Circle, icon2: ThumbsUp },
              scale: { key: 'scaleVariant', variant2: 'stepsClick', label1: 'Meter', label2: 'Steps', icon1: Sliders, icon2: ListOrdered },
              ranking: { key: 'rankingVariant', variant2: 'podium', label1: 'List', label2: 'Podium', icon1: List, icon2: LayoutList },
              guess_number: { key: 'guessNumberVariant', variant2: 'thermometer', label1: 'Input', label2: 'Thermometer', icon1: Hash, icon2: Thermometer },
              sentiment_meter: { key: 'sentimentMeterVariant', variant2: 'emojiRow', label1: 'Slider', label2: 'Emoji row', icon1: Sliders, icon2: Heart },
              agree_spectrum: { key: 'agreeSpectrumVariant', variant2: 'steps', label1: 'Spectrum', label2: 'Steps', icon1: ArrowLeftRight, icon2: ListOrdered },
            };
            const cfg = variantConfig[slide.type];
            if (!cfg) return null;
            const currentVal = design[cfg.key];
            const isVariant2 = currentVal === cfg.variant2;
            const Icon1 = cfg.icon1;
            const Icon2 = cfg.icon2;
            return (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-0.5">
                    <Button
                      variant={!isVariant2 ? "secondary" : "ghost"}
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => updateDesign({ [cfg.key]: undefined } as Partial<SlideDesign>)}
                      title={cfg.label1}
                    >
                      <Icon1 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={isVariant2 ? "secondary" : "ghost"}
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => updateDesign({ [cfg.key]: cfg.variant2 } as Partial<SlideDesign>)}
                      title={cfg.label2}
                    >
                      <Icon2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{cfg.label1} / {cfg.label2}</p>
                </TooltipContent>
              </Tooltip>
            );
          })()}

          {/* Word Cloud style - organic vs compact */}
          {slide.type === 'wordcloud' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-0.5">
                  <Button
                    variant={design.wordCloudStyleId === 'organic' || !design.wordCloudStyleId ? "secondary" : "ghost"}
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => updateDesign({ wordCloudStyleId: 'organic' })}
                    title="Organic — scattered words"
                  >
                    <Cloud className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={design.wordCloudStyleId === 'compact' ? "secondary" : "ghost"}
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => updateDesign({ wordCloudStyleId: 'compact' })}
                    title="Compact — tag-style words"
                  >
                    <Tags className="w-4 h-4" />
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Word cloud style: Organic / Compact</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Image Picker - upload or URL */}
          <ImageAndPositionPopover
            design={design}
            imageUrlInput={imageUrlInput}
            setImageUrlInput={setImageUrlInput}
            onUpdateDesign={updateDesign}
            showImagePicker={showImagePicker}
            setShowImagePicker={setShowImagePicker}
            variant="image"
          />

          {/* Import - document-level action */}
          {onImportClick && (
            <>
              <div className="w-px h-5 bg-border/50 mx-1" />
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={onImportClick}
              >
                <Upload className="w-4 h-4" />
                Import
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Shared component for Image and Logo (upload, URL, position)
function ImageAndPositionPopover({
  design,
  imageUrlInput,
  setImageUrlInput,
  onUpdateDesign,
  onUpdateDesignForAllSlides,
  showImagePicker,
  setShowImagePicker,
  variant,
}: {
  design: SlideDesign;
  imageUrlInput: string;
  setImageUrlInput: (v: string) => void;
  onUpdateDesign: (u: Partial<SlideDesign>) => void;
  onUpdateDesignForAllSlides?: (u: Partial<SlideDesign>) => void;
  showImagePicker: boolean;
  setShowImagePicker: (v: boolean) => void;
  variant: "image" | "logo";
}) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isImage = variant === "image";
  const field = isImage ? "overlayImageUrl" : "logoUrl";
  const value = isImage ? design.overlayImageUrl : design.logoUrl;

  const apply = (url: string, extra?: Partial<SlideDesign>) => {
    if (isImage) {
      onUpdateDesign({ overlayImageUrl: url, overlayImagePosition: extra?.overlayImagePosition ?? design.overlayImagePosition ?? "background" });
    } else {
      const updates: Partial<SlideDesign> = {
        logoUrl: url,
        logoPosition: extra?.logoPosition ?? design.logoPosition ?? "top-right",
        logoScope: extra?.logoScope ?? design.logoScope ?? "current",
      };
      if (updates.logoScope === "all" && onUpdateDesignForAllSlides) {
        onUpdateDesignForAllSlides(updates);
      } else {
        onUpdateDesign(updates);
      }
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be smaller than 10MB for best quality");
      return;
    }
    setIsUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `overlays/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("slide-images").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data: publicData } = supabase.storage.from("slide-images").getPublicUrl(path);
      // Try signed URL for private buckets; fallback to public (bucket must be Public in Supabase)
      let displayUrl = publicData.publicUrl;
      try {
        const { data: signedData } = await supabase.storage.from("slide-images").createSignedUrl(path, 60 * 60 * 24 * 365);
        if (signedData?.signedUrl) displayUrl = signedData.signedUrl;
      } catch {
        // Use public URL if signed fails (ensure slide-images bucket is Public in Supabase Dashboard)
      }
      apply(displayUrl);
      setImageUrlInput(displayUrl);
      toast.success("Image uploaded");
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err && typeof (err as any).message === "string"
          ? (err as any).message
          : "Upload failed";
      toast.error(msg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const clear = () => {
    if (isImage) {
      onUpdateDesign({ overlayImageUrl: undefined, overlayImagePosition: "none" });
    } else {
      const u: Partial<SlideDesign> = { logoUrl: undefined, logoPosition: undefined, logoScope: undefined };
      if (design.logoScope === "all" && onUpdateDesignForAllSlides) {
        onUpdateDesignForAllSlides(u);
      } else {
        onUpdateDesign(u);
      }
    }
    setImageUrlInput("");
  };

  return (
    <Popover open={showImagePicker} onOpenChange={setShowImagePicker}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
          <ImageIcon className="w-4 h-4" />
          {isImage ? "Image" : "Logo"}
          {value && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
          <ChevronDown className="w-3 h-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-3">
          <Label className="text-xs font-medium">{isImage ? "Slide Image" : "Logo"}</Label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Upload"}
            </Button>
            <Input
              value={imageUrlInput}
              onChange={(e) => setImageUrlInput(e.target.value)}
              placeholder="Paste image URL"
              className="h-8 text-xs"
              onKeyDown={(e) => e.key === "Enter" && imageUrlInput.trim() && (apply(imageUrlInput.trim()), setShowImagePicker(false))}
            />
            <Button
              size="sm"
              onClick={() => imageUrlInput.trim() && (apply(imageUrlInput.trim()), setShowImagePicker(false))}
              disabled={!imageUrlInput.trim()}
            >
              Add
            </Button>
          </div>
          {value && (
            <>
              <div className="aspect-video rounded-lg overflow-hidden border bg-muted/30">
                <img src={value} alt="" className="w-full h-full object-cover" />
              </div>
              {isImage ? (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Position (half image / half slide)</Label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { v: "left" as OverlayImagePosition, l: "Left" },
                      { v: "right" as OverlayImagePosition, l: "Right" },
                      { v: "background" as OverlayImagePosition, l: "Background" },
                    ].map(({ v, l }) => (
                      <Button
                        key={v}
                        variant={design.overlayImagePosition === v ? "secondary" : "outline"}
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => onUpdateDesign({ overlayImagePosition: v })}
                      >
                        {l}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Logo position</Label>
                  <div className="grid grid-cols-2 gap-1">
                    {(["top-left", "top-right", "bottom-left", "bottom-right"] as LogoPosition[]).map((v) => (
                      <Button
                        key={v}
                        variant={design.logoPosition === v ? "secondary" : "outline"}
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => {
                          const u = { logoPosition: v };
                          if (design.logoScope === "all" && onUpdateDesignForAllSlides) {
                            onUpdateDesignForAllSlides(u);
                          } else {
                            onUpdateDesign(u);
                          }
                        }}
                      >
                        {v.replace("-", " ")}
                      </Button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Scope</Label>
                    <div className="flex gap-1">
                      <Button
                        variant={design.logoScope === "current" ? "secondary" : "outline"}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => onUpdateDesign({ logoScope: "current" })}
                      >
                        This slide
                      </Button>
                      <Button
                        variant={design.logoScope === "all" ? "secondary" : "outline"}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          const u = { logoUrl: design.logoUrl, logoPosition: design.logoPosition ?? "top-right", logoScope: "all" as LogoScope };
                          if (onUpdateDesignForAllSlides) {
                            onUpdateDesignForAllSlides(u);
                          } else {
                            onUpdateDesign(u);
                          }
                        }}
                      >
                        All slides
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              <Button variant="ghost" size="sm" className="w-full h-8 text-destructive" onClick={clear}>
                <X className="w-4 h-4 mr-1" />
                Remove
              </Button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
