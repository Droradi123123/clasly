// Fruit Catch Game Types

export interface Fruit {
  id: string;
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage (0 = top)
  type: 'apple' | 'orange' | 'banana' | 'grape' | 'watermelon' | 'golden';
  speed: number; // pixels per frame
  collected: boolean;
  collectedBy: string[]; // student IDs who collected this
}

export interface GamePlayer {
  id: string;
  name: string;
  emoji: string;
  x: number; // 0-100 percentage position
  score: number;
}

export interface GameState {
  status: 'waiting' | 'countdown' | 'playing' | 'ended';
  countdown: number; // 3, 2, 1, 0
  timeRemaining: number; // seconds
  players: GamePlayer[];
  fruits: Fruit[];
}

export const FRUIT_EMOJIS: Record<Fruit['type'], { emoji: string; points: number }> = {
  apple: { emoji: '🍎', points: 10 },
  orange: { emoji: '🍊', points: 10 },
  banana: { emoji: '🍌', points: 10 },
  grape: { emoji: '🍇', points: 15 },
  watermelon: { emoji: '🍉', points: 20 },
  golden: { emoji: '⭐', points: 50 }, // Bonus fruit
};

export const FRUIT_TYPES: Fruit['type'][] = ['apple', 'orange', 'banana', 'grape', 'watermelon'];

export const GAME_DURATION = 60; // seconds
export const COUNTDOWN_DURATION = 3; // seconds
export const PLAYER_WIDTH = 8; // percentage width of player
export const CATCH_THRESHOLD = 12; // percentage distance for catching
