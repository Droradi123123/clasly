// Types for the Interactive Demo Widget

export type DemoSlideType = "quiz" | "poll" | "wordcloud" | "ranking" | "scale";

export interface DemoSlide {
  type: DemoSlideType;
  question: string;
  options?: string[];
  correctIndex?: number; // For quiz
  words?: { text: string; count: number }[];
  scaleMin?: number; // For scale
  scaleMax?: number;
  scaleLabels?: { min: string; max: string };
}

export interface DemoStudent {
  id: string;
  name: string;
  emoji: string;
  points: number;
}

export interface FloatingEmoji {
  id: number;
  emoji: string;
  startX: number;
  startY: number;
}

export interface PollResult {
  label: string;
  votes: number;
  color: string;
}
