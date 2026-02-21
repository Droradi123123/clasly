import {
  Type,
  FileText,
  Image,
  Columns,
  ArrowLeftRight,
  List,
  Clock,
  BarChart,
  HelpCircle,
  BarChart3,
  Cloud,
  CheckCircle,
  ListOrdered,
  Hash,
  Sliders,
  MessageSquare,
  Heart,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SlideType, SLIDE_TYPES } from "@/types/slides";
import { cn } from "@/lib/utils";

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

interface AddSlidePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: SlideType) => void;
  onGenerateWithAI?: () => void;
}

export function AddSlidePickerDialog({
  open,
  onOpenChange,
  onSelect,
  onGenerateWithAI,
}: AddSlidePickerDialogProps) {
  const contentTypes = SLIDE_TYPES.filter((t) => t.category === "content");
  const interactiveTypes = SLIDE_TYPES.filter((t) => t.category === "interactive");
  const quizTypes = SLIDE_TYPES.filter((t) => t.category === "quiz");

  const handleSelect = (type: SlideType) => {
    onOpenChange(false);
    requestAnimationFrame(() => onSelect(type));
  };

  const handleGenerateWithAI = () => {
    onOpenChange(false);
    requestAnimationFrame(() => onGenerateWithAI?.());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-xl font-display font-bold">
            Add a slide
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Choose a slide type to add to your presentation. Each type is designed for a different purpose.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">
          {/* AI generation - first option when callback provided */}
          {onGenerateWithAI && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-0.5">Generate with AI</h3>
              <p className="text-xs text-muted-foreground mb-3">Describe your topic and AI creates slides for you</p>
              <button
                type="button"
                onClick={handleGenerateWithAI}
                className={cn(
                  "flex items-start gap-3 p-4 w-full rounded-xl text-left border-2 border-primary/30",
                  "bg-primary/5 hover:bg-primary/10 hover:border-primary/50",
                  "transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2"
                )}
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-primary/20 text-primary">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-foreground leading-tight">Generate slides with AI</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    AI creates multiple slides based on your topic—quizzes, polls, and content.
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* Content slides */}
          <Section
            title="Content"
            subtitle="Static slides for titles, text, images, and structure"
            types={contentTypes}
            onSelect={handleSelect}
            iconBg="bg-muted"
            iconColor="text-foreground"
          />
          {/* Interactive */}
          <Section
            title="Interactive"
            subtitle="Engage the audience with polls, scales, and open responses"
            types={interactiveTypes}
            onSelect={handleSelect}
            iconBg="bg-blue-500/20"
            iconColor="text-blue-600 dark:text-blue-400"
          />
          {/* Quiz */}
          <Section
            title="Quiz"
            subtitle="Test knowledge with correct answers and scoring"
            types={quizTypes}
            onSelect={handleSelect}
            iconBg="bg-emerald-500/20"
            iconColor="text-emerald-600 dark:text-emerald-400"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({
  title,
  subtitle,
  types,
  onSelect,
  iconBg,
  iconColor,
}: {
  title: string;
  subtitle: string;
  types: typeof SLIDE_TYPES;
  onSelect: (type: SlideType) => void;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-0.5">{title}</h3>
      <p className="text-xs text-muted-foreground mb-3">{subtitle}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {types.map((slideType, i) => {
          const Icon = SLIDE_ICONS[slideType.type];
          return (
            <button
              key={slideType.type}
              type="button"
              onClick={() => onSelect(slideType.type)}
              className={cn(
                "flex items-start gap-3 p-3 rounded-xl text-left border border-border/50",
                "bg-card hover:bg-muted/60 hover:border-primary/30 hover:shadow-md",
                "transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2"
              )}
            >
              <div
                className={cn(
                  "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
                  iconBg,
                  iconColor
                )}
              >
                {Icon && <Icon className="w-5 h-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm text-foreground leading-tight">
                  {slideType.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {slideType.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
