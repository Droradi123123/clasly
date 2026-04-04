// ===== Interactive Slide Types =====

export type SlideType = 
  | 'title' 
  | 'content' 
  | 'image'
  // New content slide types
  | 'split_content'
  | 'before_after'
  | 'bullet_points'
  | 'timeline'
  | 'bar_chart'
  // Interactive slides
  | 'quiz' 
  | 'poll'
  | 'poll_quiz'  // Poll design with correct answer (quiz category)
  | 'wordcloud' 
  | 'yesno' 
  | 'ranking' 
  | 'guess_number' 
  | 'scale'
  | 'sentiment_meter'
  | 'agree_spectrum';

// Image position for split content slides
export type ImagePosition = 'left' | 'right';

// Overlay image position for all slides
export type OverlayImagePosition = 'none' | 'background' | 'left' | 'right';

// Logo position on slides
export type LogoPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

// Logo scope - current slide only or all slides
export type LogoScope = 'current' | 'all';

export type InteractionStyle = 
  | 'bar_chart' 
  | 'bouncing_dots' 
  | 'bar_scale' 
  | 'mood_emoji' 
  | 'thermometer';

export type LayoutType = 
  | 'full' 
  | 'left_image' 
  | 'right_image' 
  | 'top_image' 
  | 'two_columns'
  | 'centered';

export type FontFamily = 
  | 'Inter' 
  | 'Space Grotesk' 
  | 'Poppins' 
  | 'Lora' 
  | 'Roboto' 
  | 'Open Sans';

export type FontSize = 'small' | 'medium' | 'large';

export type TextAlign = 'left' | 'center' | 'right';

// Gradient presets for backgrounds
export interface GradientPreset {
  id: string;
  name: string;
  colors: string[];
  angle: number;
}

// Synced with generate-slides GRADIENT_DEFINITIONS – AI emits these IDs; frontend must recognize all
export const GRADIENT_PRESETS: GradientPreset[] = [
  // Original frontend presets (kept for manual slides)
  { id: 'purple-blue', name: 'Purple Blue', colors: ['#7c3aed', '#2563eb'], angle: 135 },
  { id: 'green-teal', name: 'Green Teal', colors: ['#11998e', '#38ef7d'], angle: 135 },
  { id: 'orange-red', name: 'Orange Red', colors: ['#ff416c', '#ff4b2b'], angle: 135 },
  { id: 'pink-orange', name: 'Pink Orange', colors: ['#ec4899', '#f97316'], angle: 135 },
  { id: 'blue-cyan', name: 'Blue Cyan', colors: ['#1d4ed8', '#06b6d4'], angle: 145 },
  { id: 'dark', name: 'Dark', colors: ['#232526', '#414345'], angle: 135 },
  { id: 'sunset', name: 'Sunset', colors: ['#fa709a', '#fee140'], angle: 135 },
  { id: 'ocean', name: 'Ocean', colors: ['#2e3192', '#1bffff'], angle: 135 },
  // AI palette – Neon Cyber
  { id: 'purple-pink', name: 'Purple Pink', colors: ['#9333ea', '#ec4899'], angle: 120 },
  { id: 'dark-blue', name: 'Dark Blue', colors: ['#1e1b4b', '#312e81'], angle: 160 },
  { id: 'cyan-teal', name: 'Cyan Teal', colors: ['#06b6d4', '#14b8a6'], angle: 135 },
  // AI palette – Soft Pop
  { id: 'peach-rose', name: 'Peach Rose', colors: ['#fb923c', '#f472b6'], angle: 140 },
  { id: 'soft-pink', name: 'Soft Pink', colors: ['#f9a8d4', '#c084fc'], angle: 130 },
  { id: 'lavender-pink', name: 'Lavender Pink', colors: ['#a78bfa', '#f472b6'], angle: 150 },
  { id: 'coral-warm', name: 'Coral Warm', colors: ['#fb7185', '#fdba74'], angle: 135 },
  // AI palette – Academic Pro
  { id: 'blue-gray', name: 'Blue Gray', colors: ['#3b82f6', '#64748b'], angle: 145 },
  { id: 'steel-blue', name: 'Steel Blue', colors: ['#475569', '#1e40af'], angle: 135 },
  { id: 'navy-slate', name: 'Navy Slate', colors: ['#1e3a5f', '#334155'], angle: 160 },
  { id: 'teal-blue', name: 'Teal Blue', colors: ['#0d9488', '#2563eb'], angle: 140 },
  { id: 'cool-gray', name: 'Cool Gray', colors: ['#4b5563', '#6b7280'], angle: 150 },
  // AI palette – Swiss Minimal
  { id: 'dark-red', name: 'Dark Red', colors: ['#991b1b', '#1c1917'], angle: 135 },
  { id: 'charcoal-black', name: 'Charcoal Black', colors: ['#292524', '#0c0a09'], angle: 160 },
  { id: 'red-orange', name: 'Red Orange', colors: ['#dc2626', '#ea580c'], angle: 130 },
  { id: 'dark-gold', name: 'Dark Gold', colors: ['#78350f', '#292524'], angle: 145 },
  { id: 'mono-dark', name: 'Mono Dark', colors: ['#27272a', '#18181b'], angle: 150 },
  // AI palette – Sunset Warmth
  { id: 'orange-gold', name: 'Orange Gold', colors: ['#ea580c', '#ca8a04'], angle: 135 },
  { id: 'sunset-warm', name: 'Sunset Warm', colors: ['#dc2626', '#f59e0b'], angle: 140 },
  { id: 'amber-rose', name: 'Amber Rose', colors: ['#d97706', '#e11d48'], angle: 130 },
  { id: 'terracotta', name: 'Terracotta', colors: ['#9a3412', '#b45309'], angle: 150 },
  { id: 'warm-peach', name: 'Warm Peach', colors: ['#f97316', '#fbbf24'], angle: 135 },
  // AI palette – Ocean Breeze
  { id: 'ocean-teal', name: 'Ocean Teal', colors: ['#0891b2', '#0d9488'], angle: 135 },
  { id: 'aqua-green', name: 'Aqua Green', colors: ['#06b6d4', '#10b981'], angle: 140 },
  { id: 'sky-blue', name: 'Sky Blue', colors: ['#0ea5e9', '#38bdf8'], angle: 150 },
  { id: 'sea-foam', name: 'Sea Foam', colors: ['#14b8a6', '#34d399'], angle: 130 },
  { id: 'blue-green', name: 'Blue Green', colors: ['#2563eb', '#059669'], angle: 145 },
];

// Scale options for Scale slide type
export interface ScaleOptions {
  minLabel: string;
  maxLabel: string;
  steps: number;
}

// Design settings for a slide
export interface SlideDesign {
  backgroundColor?: string;
  gradientPreset?: string;
  textColor?: string;
  fontFamily?: FontFamily;
  fontSize?: FontSize;
  textAlign?: TextAlign;
  /** Text direction for RTL/LTR languages. If omitted, UI may infer automatically from slide content. */
  direction?: 'ltr' | 'rtl';
  themeId?: string; // Theme system ID
  designStyleId?: string; // Design style (minimal/dynamic) - layer on top of theme
  overlayImageUrl?: string; // Image overlay for any slide
  overlayImagePosition?: OverlayImagePosition; // Position of overlay image
  /** Logo URL - shown per slide or all slides based on logoScope */
  logoUrl?: string;
  logoPosition?: LogoPosition;
  logoScope?: LogoScope; // 'current' = this slide only, 'all' = all slides in presentation
  /** Result visualization for quiz/poll/yesno: 'default' = cards/buttons, 'clean_bars' = clean horizontal bar chart */
  resultVisualization?: 'default' | 'clean_bars';
  wordCloudStyleId?: 'organic' | 'compact';
  /** Per-type distinct design variants (default = current design when undefined) */
  quizVariant?: 'cards' | 'listWithIcons';
  pollVariant?: 'bars' | 'rankedBars';
  yesNoVariant?: 'buttons' | 'thumbsDynamic';
  scaleVariant?: 'meter' | 'stepsClick';
  rankingVariant?: 'list' | 'podium';
  guessNumberVariant?: 'input' | 'thermometer';
  finishSentenceVariant?: 'input' | 'wordBank';
  sentimentMeterVariant?: 'slider' | 'emojiRow';
  agreeSpectrumVariant?: 'spectrum' | 'steps';
}

// Activity settings for interactive slides
export interface ActivitySettings {
  /** Seconds for the answer timer. Omitted/legacy defaults to 20. `0` = no timer (live results while answering). */
  duration?: number;
  showResults?: boolean;
  interactionStyle?: InteractionStyle;
  /** Points awarded for a correct answer (quiz types) */
  pointsForCorrect?: number;
  /** Points for participation (wrong answer or non-graded interaction) */
  pointsForParticipation?: number;
}

/** Default seconds for the answer timer (matches editor presets) */
export const DEFAULT_ACTIVITY_DURATION_SEC = 20;
export const DEFAULT_POINTS_CORRECT = 1000;
export const DEFAULT_POINTS_PARTICIPATION = 500;

// Base slide content
export interface BaseSlideContent {
  title?: string;
  subtitle?: string;
  text?: string;
  imageUrl?: string;
}

// Quiz slide content
export interface QuizSlideContent extends BaseSlideContent {
  question: string;
  options: string[];
  correctAnswer: number; // index of correct option
}

// Poll slide content (also used by poll_quiz; correctAnswer only applies to poll_quiz)
export interface PollSlideContent extends BaseSlideContent {
  question: string;
  options: string[];
  correctAnswer?: number; // index of correct option (poll_quiz only)
}

// Word Cloud slide content
export interface WordCloudSlideContent extends BaseSlideContent {
  question: string;
  maxWords?: number;
}

// Yes/No slide content
export interface YesNoSlideContent extends BaseSlideContent {
  question: string;
  correctAnswer?: boolean; // true = Yes is correct, false = No is correct
}

// Ranking slide content
export interface RankingSlideContent extends BaseSlideContent {
  question: string;
  items: string[];
  correctOrder?: string[]; // The correct order of items
}

// Guess Number slide content
export interface GuessNumberSlideContent extends BaseSlideContent {
  question: string;
  correctNumber: number;
  hint?: string;
  minRange?: number;
  maxRange?: number;
}

// Scale slide content
export interface ScaleSlideContent extends BaseSlideContent {
  question: string;
  scaleOptions: ScaleOptions;
}

/** @deprecated Legacy JSON only — migrated to word cloud at load time */
export interface FinishSentenceSlideContent extends BaseSlideContent {
  sentenceStart: string; // The sentence to complete, e.g., "The best part of today's session was..."
  maxCharacters?: number;
  /** Optional word bank for wordBank variant – chips to choose from to complete the sentence */
  wordBankOptions?: string[];
}

// Image Guess slide content (Progressive Reveal) - DEPRECATED: Removed from UI
export interface ImageGuessSlideContent extends BaseSlideContent {
  question: string;
  imageUrl: string;
  correctAnswer: string;
  hint?: string;
  revealDuration?: number; // seconds for full reveal
}

// Sentiment Meter slide content (Continuous emotional scale)
export interface SentimentMeterSlideContent extends BaseSlideContent {
  question: string;
  leftEmoji?: string; // Default: 😡
  rightEmoji?: string; // Default: 😍
  leftLabel?: string;
  rightLabel?: string;
}

// Agree/Disagree Spectrum slide content
export interface AgreeSpectrumSlideContent extends BaseSlideContent {
  statement: string; // The statement to agree/disagree with
  leftLabel?: string; // Default: "Strongly Disagree"
  rightLabel?: string; // Default: "Strongly Agree"
}

// Split Content slide (half text, half image)
export interface SplitContentSlideContent extends BaseSlideContent {
  title: string;
  bulletPoints: string[];
  imageUrl?: string;
  imagePosition: ImagePosition; // 'left' or 'right'
}

// Before/After comparison slide
export interface BeforeAfterSlideContent extends BaseSlideContent {
  beforeTitle: string;
  beforePoints: string[];
  afterTitle: string;
  afterPoints: string[];
}

// Bullet Points slide
export interface BulletPointsSlideContent extends BaseSlideContent {
  title: string;
  points: { title: string; description: string }[];
}

// Timeline slide
export interface TimelineSlideContent extends BaseSlideContent {
  title: string;
  events: { year: string; title: string; description: string }[];
}

// Bar Chart slide
export interface BarChartSlideContent extends BaseSlideContent {
  title: string;
  subtitle?: string;
  bars: { label: string; value: number }[];
}

// Union type for all slide content
export type SlideContent = 
  | BaseSlideContent 
  | QuizSlideContent 
  | PollSlideContent 
  | WordCloudSlideContent 
  | YesNoSlideContent 
  | RankingSlideContent 
  | GuessNumberSlideContent 
  | ScaleSlideContent
  | ImageGuessSlideContent
  | SentimentMeterSlideContent
  | AgreeSpectrumSlideContent
  | SplitContentSlideContent
  | BeforeAfterSlideContent
  | BulletPointsSlideContent
  | TimelineSlideContent
  | BarChartSlideContent;

// Main Slide interface
export interface Slide {
  id: string;
  type: SlideType;
  content: SlideContent;
  design: SlideDesign;
  layout: LayoutType;
  activitySettings?: ActivitySettings;
  order: number;
}

/** Maps deprecated slide types from stored JSON so runtime only uses supported `SlideType` values. */
export function migrateLegacySlideTypes(slides: Slide[]): Slide[] {
  return slides.map((slide) => {
    if ((slide.type as string) !== "finish_sentence") return slide;
    const c = slide.content as FinishSentenceSlideContent & { question?: string };
    const q =
      (typeof c.sentenceStart === "string" && c.sentenceStart.trim()) ||
      (typeof c.question === "string" && c.question.trim()) ||
      "Share a word…";
    return {
      ...slide,
      type: "wordcloud",
      content: { question: q },
    };
  });
}

// Slide type metadata for the editor
// Categories:
// - 'content': Static slides (title, content, image)
// - 'interactive': Engagement slides without correct answers (poll, wordcloud, scale, sentiment, agree)
// - 'quiz': Competition slides with correct answers (quiz, yesno, ranking, guess_number, image_guess)
export interface SlideTypeInfo {
  type: SlideType;
  label: string;
  labelHe: string;
  icon: string;
  category: 'content' | 'interactive' | 'quiz';
  description: string;
  supportsCorrectAnswer?: boolean; // If true, this slide type can have a correct answer
}

export const SLIDE_TYPES: SlideTypeInfo[] = [
  // Content slides - static, no interaction
  { type: 'title', label: 'Title Slide', labelHe: 'שקופית כותרת', icon: 'Type', category: 'content', description: 'Opening slide with title and subtitle' },
  { type: 'content', label: 'Content', labelHe: 'תוכן', icon: 'FileText', category: 'content', description: 'Text content slide' },
  { type: 'image', label: 'Image', labelHe: 'תמונה', icon: 'Image', category: 'content', description: 'Image focused slide' },
  { type: 'split_content', label: 'Split Content', labelHe: 'תוכן + תמונה', icon: 'Columns', category: 'content', description: 'Half text, half image' },
  { type: 'before_after', label: 'Before/After', labelHe: 'לפני/אחרי', icon: 'ArrowRightLeft', category: 'content', description: 'Compare before and after' },
  { type: 'bullet_points', label: 'Bullet Points', labelHe: 'נקודות', icon: 'List', category: 'content', description: 'List of key points' },
  { type: 'timeline', label: 'Timeline', labelHe: 'ציר זמן', icon: 'Clock', category: 'content', description: 'Chronological events' },
  { type: 'bar_chart', label: 'Bar Chart', labelHe: 'גרף עמודות', icon: 'BarChart', category: 'content', description: 'Data visualization chart' },
  
  // Interactive slides - engagement focused, no correct answers
  { type: 'poll', label: 'Poll', labelHe: 'סקר', icon: 'BarChart3', category: 'interactive', description: 'Opinion poll without correct answer' },
  // Quiz slides - with correct answers (poll_quiz = poll design + correct answer)
  { type: 'poll_quiz', label: 'Poll (Quiz)', labelHe: 'סקר (מבחן)', icon: 'BarChart3', category: 'quiz', description: 'Poll-style bar chart with one correct answer', supportsCorrectAnswer: true },
  { type: 'wordcloud', label: 'Word Cloud', labelHe: 'ענן מילים', icon: 'Cloud', category: 'interactive', description: 'Collect words and visualize' },
  { type: 'scale', label: 'Scale', labelHe: 'סולם', icon: 'Sliders', category: 'interactive', description: 'Rate on a scale' },
  { type: 'sentiment_meter', label: 'Sentiment', labelHe: 'סנטימנט', icon: 'Heart', category: 'interactive', description: 'Continuous emotional scale' },
  { type: 'agree_spectrum', label: 'Agree/Disagree', labelHe: 'מסכים/לא', icon: 'ArrowLeftRight', category: 'interactive', description: 'Opinion spectrum on a statement' },
  
  // Quiz slides - competition focused, with correct answers
  { type: 'quiz', label: 'Quiz', labelHe: 'מבחן', icon: 'HelpCircle', category: 'quiz', description: 'Multiple choice with correct answer', supportsCorrectAnswer: true },
  { type: 'yesno', label: 'Yes/No', labelHe: 'כן/לא', icon: 'CheckCircle', category: 'quiz', description: 'Binary yes or no question', supportsCorrectAnswer: true },
  { type: 'ranking', label: 'Ranking', labelHe: 'דירוג', icon: 'ListOrdered', category: 'quiz', description: 'Rank items in correct order', supportsCorrectAnswer: true },
  { type: 'guess_number', label: 'Guess Number', labelHe: 'נחש מספר', icon: 'Hash', category: 'quiz', description: 'Guess the hidden number', supportsCorrectAnswer: true },
];

// Helper to check if a slide type supports correct answers
export function isQuizSlide(type: SlideType): boolean {
  const slideInfo = SLIDE_TYPES.find(t => t.type === type);
  return slideInfo?.category === 'quiz' || false;
}

// Helper to check if slide is interactive (engagement, no correct answer)
export function isInteractiveSlide(type: SlideType): boolean {
  const slideInfo = SLIDE_TYPES.find(t => t.type === type);
  return slideInfo?.category === 'interactive' || false;
}

/** Polls, quizzes, word cloud, etc. — any slide where students submit responses */
export function isParticipativeSlide(type: SlideType): boolean {
  const slideInfo = SLIDE_TYPES.find(t => t.type === type);
  return slideInfo?.category === 'interactive' || slideInfo?.category === 'quiz' || false;
}

/**
 * Default activity settings when creating or normalizing slides.
 * Opinion `poll` slides: no timer, no points (live aggregate on presenter).
 * All other types: default countdown + scoring presets (same as manual new slide).
 */
export function getDefaultActivitySettingsForSlideType(type: SlideType): ActivitySettings {
  if (type === "poll" || type === "wordcloud") {
    return {
      duration: 0,
      showResults: true,
      interactionStyle: "bar_chart",
      pointsForCorrect: 0,
      pointsForParticipation: 0,
    };
  }
  const slideInfo = SLIDE_TYPES.find((t) => t.type === type);
  /** Quiz-category slides: default countdown + scoring (presenter can turn off in sidebar). */
  if (slideInfo?.category === "quiz") {
    return {
      duration: 30,
      showResults: true,
      interactionStyle: "bar_chart",
      pointsForCorrect: DEFAULT_POINTS_CORRECT,
      pointsForParticipation: DEFAULT_POINTS_PARTICIPATION,
    };
  }
  return {
    duration: DEFAULT_ACTIVITY_DURATION_SEC,
    showResults: true,
    interactionStyle: "bar_chart",
    pointsForCorrect: DEFAULT_POINTS_CORRECT,
    pointsForParticipation: DEFAULT_POINTS_PARTICIPATION,
  };
}

/** Resolved timer/points for runtime (legacy slides may omit fields) */
export function getResolvedActivitySettings(slide: Slide): {
  /** True when a countdown applies; false when `duration === 0` (live results). */
  hasTimer: boolean;
  /** Countdown length in seconds when `hasTimer`; otherwise `0`. */
  durationSeconds: number;
  pointsForCorrect: number;
  pointsForParticipation: number;
} {
  const a = slide.activitySettings;
  const raw = a?.duration;

  /** Opinion polls & word clouds: no timer, no points — aggregates always live on presenter. */
  if (slide.type === "poll" || slide.type === "wordcloud") {
    return {
      hasTimer: false,
      durationSeconds: 0,
      pointsForCorrect: 0,
      pointsForParticipation: 0,
    };
  }

  if (raw === 0) {
    return {
      hasTimer: false,
      durationSeconds: 0,
      pointsForCorrect:
        typeof a?.pointsForCorrect === "number" && a.pointsForCorrect >= 0
          ? a.pointsForCorrect
          : DEFAULT_POINTS_CORRECT,
      pointsForParticipation:
        typeof a?.pointsForParticipation === "number" && a.pointsForParticipation >= 0
          ? a.pointsForParticipation
          : DEFAULT_POINTS_PARTICIPATION,
    };
  }
  const durationSeconds =
    typeof raw === "number" && raw > 0 ? raw : DEFAULT_ACTIVITY_DURATION_SEC;
  return {
    hasTimer: true,
    durationSeconds,
    pointsForCorrect:
      typeof a?.pointsForCorrect === "number" && a.pointsForCorrect >= 0
        ? a.pointsForCorrect
        : DEFAULT_POINTS_CORRECT,
    pointsForParticipation:
      typeof a?.pointsForParticipation === "number" && a.pointsForParticipation >= 0
        ? a.pointsForParticipation
        : DEFAULT_POINTS_PARTICIPATION,
  };
}

// Helper to create default content for each slide type
export function createDefaultSlideContent(type: SlideType): SlideContent {
  switch (type) {
    case 'title':
      return { title: 'Welcome', subtitle: 'Click to edit' };
    case 'content':
      return { title: 'Content Title', text: 'Add your content here...' };
    case 'image':
      return { title: 'Image Slide', imageUrl: '' };
    case 'quiz':
      return { 
        question: 'What is the correct answer?', 
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 0 
      };
    case 'poll':
      return { 
        question: 'What do you think?', 
        options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'] 
      };
    case 'poll_quiz':
      return { 
        question: 'What is the correct answer?', 
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 0 
      };
    case 'wordcloud':
      return { question: 'Describe this in one word...' };
    case 'yesno':
      return { question: 'Do you agree?' };
    case 'ranking':
      return { 
        question: 'Rank these items by importance:', 
        items: ['First Item', 'Second Item', 'Third Item'] 
      };
    case 'guess_number':
      return { 
        question: 'Guess the number!', 
        correctNumber: 42,
        minRange: 1,
        maxRange: 100 
      };
    case 'scale':
      return { 
        question: 'How do you feel about this?', 
        scaleOptions: { minLabel: 'Not at all', maxLabel: 'Absolutely', steps: 5 } 
      };
    case 'sentiment_meter':
      return {
        question: 'How do you feel right now?',
        leftEmoji: '😡',
        rightEmoji: '😍',
        leftLabel: 'Not great',
        rightLabel: 'Amazing',
      };
    case 'agree_spectrum':
      return {
        statement: 'AI will transform education in the next 5 years.',
        leftLabel: 'Strongly Disagree',
        rightLabel: 'Strongly Agree',
      };
    case 'split_content':
      return {
        title: 'Your Title Here',
        bulletPoints: ['First key point', 'Second key point', 'Third key point'],
        imageUrl: '',
        imagePosition: 'right' as ImagePosition,
      };
    case 'before_after':
      return {
        beforeTitle: 'Before',
        beforePoints: ['Point one before', 'Point two before', 'Point three before'],
        afterTitle: 'After',
        afterPoints: ['Point one after', 'Point two after', 'Point three after'],
      };
    case 'bullet_points':
      return {
        title: 'Add your title here',
        points: [
          { title: 'First Point', description: 'Add description here' },
          { title: 'Second Point', description: 'Add description here' },
          { title: 'Third Point', description: 'Add description here' },
        ],
      };
    case 'timeline':
      return {
        title: 'Timeline Title',
        events: [
          { year: '2021', title: 'First Event', description: 'Description of event' },
          { year: '2022', title: 'Second Event', description: 'Description of event' },
          { year: '2023', title: 'Third Event', description: 'Description of event' },
        ],
      };
    case 'bar_chart':
      return {
        title: 'Chart Title',
        subtitle: '',
        bars: [
          { label: 'Item 1', value: 25 },
          { label: 'Item 2', value: 50 },
          { label: 'Item 3', value: 75 },
          { label: 'Item 4', value: 100 },
        ],
      };
    default:
      return { title: 'New Slide' };
  }
}

// Helper to generate unique IDs
let slideIdCounter = 0;
function generateUniqueId(): string {
  slideIdCounter++;
  return `${Date.now()}-${slideIdCounter}-${Math.random().toString(36).substring(2, 9)}`;
}

// Helper to create a new slide
export function createNewSlide(type: SlideType, order: number): Slide {
  const baseDesign = {
    gradientPreset: 'purple-blue',
    textColor: '#ffffff',
    fontFamily: 'Inter',
    fontSize: 'medium',
    textAlign: 'center',
    designStyleId: 'dynamic', // Default to dynamic style
  };
  const design = type === 'yesno'
    ? { ...baseDesign, yesNoVariant: 'thumbsDynamic' as const }
    : baseDesign;
  const activitySettings = getDefaultActivitySettingsForSlideType(type);
  return {
    id: generateUniqueId(),
    type,
    content: createDefaultSlideContent(type),
    design,
    layout: 'centered',
    activitySettings,
    order,
  };
}
