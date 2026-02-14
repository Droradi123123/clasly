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
  | 'wordcloud' 
  | 'yesno' 
  | 'ranking' 
  | 'guess_number' 
  | 'scale'
  | 'finish_sentence'
  | 'sentiment_meter'
  | 'agree_spectrum';

// Image position for split content slides
export type ImagePosition = 'left' | 'right';

// Overlay image position for all slides
export type OverlayImagePosition = 'none' | 'background' | 'left' | 'right';

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

export const GRADIENT_PRESETS: GradientPreset[] = [
  { id: 'purple-blue', name: 'Purple Blue', colors: ['#667eea', '#764ba2'], angle: 135 },
  { id: 'green-teal', name: 'Green Teal', colors: ['#11998e', '#38ef7d'], angle: 135 },
  { id: 'orange-red', name: 'Orange Red', colors: ['#ff416c', '#ff4b2b'], angle: 135 },
  { id: 'pink-orange', name: 'Pink Orange', colors: ['#f857a6', '#ff5858'], angle: 135 },
  { id: 'blue-cyan', name: 'Blue Cyan', colors: ['#00c6ff', '#0072ff'], angle: 135 },
  { id: 'dark', name: 'Dark', colors: ['#232526', '#414345'], angle: 135 },
  { id: 'sunset', name: 'Sunset', colors: ['#fa709a', '#fee140'], angle: 135 },
  { id: 'ocean', name: 'Ocean', colors: ['#2e3192', '#1bffff'], angle: 135 },
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
}

// Activity settings for interactive slides
export interface ActivitySettings {
  duration?: number; // in seconds
  showResults?: boolean;
  interactionStyle?: InteractionStyle;
}

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

// Poll slide content
export interface PollSlideContent extends BaseSlideContent {
  question: string;
  options: string[];
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

// Finish the Sentence slide content (AI-powered)
export interface FinishSentenceSlideContent extends BaseSlideContent {
  sentenceStart: string; // The sentence to complete, e.g., "The best part of today's session was..."
  maxCharacters?: number;
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
  | FinishSentenceSlideContent
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
  { type: 'wordcloud', label: 'Word Cloud', labelHe: 'ענן מילים', icon: 'Cloud', category: 'interactive', description: 'Collect words and visualize' },
  { type: 'scale', label: 'Scale', labelHe: 'סולם', icon: 'Sliders', category: 'interactive', description: 'Rate on a scale' },
  { type: 'sentiment_meter', label: 'Sentiment', labelHe: 'סנטימנט', icon: 'Heart', category: 'interactive', description: 'Continuous emotional scale' },
  { type: 'agree_spectrum', label: 'Agree/Disagree', labelHe: 'מסכים/לא', icon: 'ArrowLeftRight', category: 'interactive', description: 'Opinion spectrum on a statement' },
  { type: 'finish_sentence', label: 'Finish Sentence', labelHe: 'השלם משפט', icon: 'MessageSquare', category: 'interactive', description: 'AI groups open-ended responses' },
  
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
    case 'finish_sentence':
      return {
        sentenceStart: 'The best part of today was...',
        maxCharacters: 100,
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
  return {
    id: generateUniqueId(),
    type,
    content: createDefaultSlideContent(type),
    design: {
      gradientPreset: 'purple-blue',
      textColor: '#ffffff',
      fontFamily: 'Inter',
      fontSize: 'medium',
      textAlign: 'center',
      designStyleId: 'dynamic', // Default to dynamic style
    },
    layout: 'centered',
    activitySettings: {
      duration: 60,
      showResults: true,
      interactionStyle: 'bar_chart',
    },
    order,
  };
}
