import { DemoSlide, DemoStudent, PollResult } from "./types";

// Fun color palette for the demo
export const DEMO_COLORS = [
  "#FF6B6B", // Coral
  "#4ECDC4", // Teal
  "#45B7D1", // Sky Blue
  "#96CEB4", // Sage
  "#FFEAA7", // Yellow
  "#DDA0DD", // Plum
  "#FF9FF3", // Pink
  "#54A0FF", // Blue
];

// Demo slides with different question types
export const DEMO_SLIDES: DemoSlide[] = [
  {
    type: "quiz",
    question: "What's the capital of France?",
    options: ["London", "Paris", "Berlin", "Madrid"],
    correctIndex: 1,
  },
  {
    type: "poll",
    question: "What's your favorite season?",
    options: ["Spring 🌸", "Summer ☀️", "Autumn 🍂", "Winter ❄️"],
  },
  {
    type: "scale",
    question: "How confident are you with today's material?",
    scaleMin: 1,
    scaleMax: 10,
    scaleLabels: { min: "Not at all", max: "Very confident" },
  },
  {
    type: "wordcloud",
    question: "Describe this course in one word",
    words: [
      { text: "Amazing", count: 12 },
      { text: "Interactive", count: 9 },
      { text: "Fun", count: 15 },
      { text: "Engaging", count: 8 },
      { text: "Creative", count: 6 },
      { text: "Inspiring", count: 7 },
    ],
  },
  {
    type: "ranking",
    question: "Rank by importance",
    options: ["Creativity", "Speed", "Quality", "Teamwork"],
  },
];

// Initial poll results
export const INITIAL_POLL_RESULTS: PollResult[] = [
  { label: "Spring 🌸", votes: 8, color: DEMO_COLORS[0] },
  { label: "Summer ☀️", votes: 15, color: DEMO_COLORS[1] },
  { label: "Autumn 🍂", votes: 6, color: DEMO_COLORS[2] },
  { label: "Winter ❄️", votes: 4, color: DEMO_COLORS[3] },
];

// Demo leaderboard students (top 3)
export const DEMO_STUDENTS: DemoStudent[] = [
  { id: "1", name: "Alex", emoji: "🦊", points: 850 },
  { id: "2", name: "Maya", emoji: "🦋", points: 720 },
  { id: "3", name: "Sam", emoji: "🐸", points: 680 },
];

// Reaction emojis
export const REACTION_EMOJIS = ["👍", "❤️", "🎉", "🔥", "💡", "👏"];

// Word cloud colors
export const WORD_COLORS = [
  "text-pink-300",
  "text-blue-300",
  "text-green-300",
  "text-yellow-300",
  "text-purple-300",
  "text-cyan-300",
];
