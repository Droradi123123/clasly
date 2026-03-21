// ===== Theme System Types =====

export type ThemeId = 'neon-cyber' | 'soft-pop' | 'academic-pro' | 'swiss-minimal' | 'sunset-warmth' | 'ocean-breeze';

export interface ThemeTokens {
  // Core colors (HSL format)
  bg: string;
  bgSecondary: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  accentSecondary: string;
  surface: string;
  surfaceHover: string;
  
  // Visual properties
  borderRadius: string;
  borderRadiusLg: string;
  borderWidth: string;
  borderColor: string;
  
  // Typography
  fontFamily: string;
  fontFamilyDisplay: string;
  fontWeight: string;
  letterSpacing: string;
  
  // Effects
  shadowStyle: 'flat' | 'soft' | 'glow' | 'hard';
  shadowColor: string;
  
  // Animation personality
  animationStyle: 'spring' | 'smooth' | 'snappy' | 'bouncy';
  
  // Decorative elements
  decorativeStyle: 'tech-grid' | 'bubbles' | 'lines' | 'geometric' | 'waves' | 'aurora';
  decorativeOpacity: number;
  
  // Button style
  buttonStyle: 'pill' | 'rounded' | 'square' | 'sharp';
  buttonEffect: 'glow' | 'shadow' | 'border' | 'flat';
  
  // Progress/meter style
  progressStyle: 'rounded' | 'square' | 'gradient';
  
  // Badge style
  badgeStyle: 'solid' | 'outline' | 'subtle' | 'pill';
  
  // Card style
  cardStyle: 'glass' | 'solid' | 'bordered' | 'elevated';
  cardBlur: boolean;
}

export interface Theme {
  id: ThemeId;
  name: string;
  description: string;
  emoji: string;
  isPremium?: boolean; // Requires Pro plan
  preview: {
    gradient: string;
    accentColor: string;
  };
  tokens: ThemeTokens;
  // Option button colors per theme
  optionColors: string[];
}

// ===== The 6 Core Themes =====

export const THEMES: Record<ThemeId, Theme> = {
  'neon-cyber': {
    id: 'neon-cyber',
    name: 'Neon Cyber',
    description: 'Futuristic tech',
    emoji: '🌌',
    preview: {
      gradient: 'linear-gradient(135deg, #0a0a1f 0%, #1a1a3e 40%, #0d0d2b 100%)',
      accentColor: '#00FF94',
    },
    tokens: {
      bg: '240 50% 6%',
      bgSecondary: '240 45% 10%',
      textPrimary: '0 0% 100%',
      textSecondary: '200 30% 75%',
      accent: '156 100% 50%',
      accentSecondary: '200 100% 60%',
      surface: '240 40% 12%',
      surfaceHover: '240 40% 18%',
      borderRadius: '0.75rem',
      borderRadiusLg: '1rem',
      borderWidth: '1px',
      borderColor: '156 100% 50% / 0.3',
      fontFamily: '"Space Grotesk", "Inter", sans-serif',
      fontFamilyDisplay: '"Orbitron", "Space Grotesk", sans-serif',
      fontWeight: '500',
      letterSpacing: '0.02em',
      shadowStyle: 'glow',
      shadowColor: '156 100% 50% / 0.4',
      animationStyle: 'snappy',
      decorativeStyle: 'tech-grid',
      decorativeOpacity: 0.08,
      buttonStyle: 'rounded',
      buttonEffect: 'glow',
      progressStyle: 'gradient',
      badgeStyle: 'outline',
      cardStyle: 'glass',
      cardBlur: true,
    },
    optionColors: [
      'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500',
      'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500',
      'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500',
      'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500',
      'bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-400 hover:to-indigo-500',
      'bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500',
    ],
  },
  
  'soft-pop': {
    id: 'soft-pop',
    name: 'Soft Pop',
    description: 'Playful & fun',
    emoji: '🎨',
    preview: {
      gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 50%, #ff9a9e 100%)',
      accentColor: '#FF6B6B',
    },
    tokens: {
      bg: '25 100% 96%',
      bgSecondary: '15 90% 93%',
      textPrimary: '0 30% 15%',
      textSecondary: '0 20% 35%',
      accent: '0 100% 71%',
      accentSecondary: '330 90% 65%',
      surface: '0 0% 100%',
      surfaceHover: '25 60% 97%',
      borderRadius: '1.5rem',
      borderRadiusLg: '2rem',
      borderWidth: '0px',
      borderColor: '0 0% 0% / 0.05',
      fontFamily: '"Nunito", "Quicksand", sans-serif',
      fontFamilyDisplay: '"Fredoka", "Nunito", sans-serif',
      fontWeight: '600',
      letterSpacing: '-0.01em',
      shadowStyle: 'soft',
      shadowColor: '0 70% 70% / 0.2',
      animationStyle: 'bouncy',
      decorativeStyle: 'bubbles',
      decorativeOpacity: 0.15,
      buttonStyle: 'pill',
      buttonEffect: 'shadow',
      progressStyle: 'rounded',
      badgeStyle: 'pill',
      cardStyle: 'elevated',
      cardBlur: false,
    },
    optionColors: [
      'bg-gradient-to-r from-rose-400 to-pink-500 hover:from-rose-300 hover:to-pink-400',
      'bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400',
      'bg-gradient-to-r from-teal-400 to-cyan-500 hover:from-teal-300 hover:to-cyan-400',
      'bg-gradient-to-r from-violet-400 to-purple-500 hover:from-violet-300 hover:to-purple-400',
      'bg-gradient-to-r from-lime-400 to-green-500 hover:from-lime-300 hover:to-green-400',
      'bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-300 hover:to-blue-400',
    ],
  },
  
  'academic-pro': {
    id: 'academic-pro',
    name: 'Academic Pro',
    description: 'Professional',
    emoji: '📚',
    preview: {
      gradient: 'linear-gradient(160deg, #1a365d 0%, #2c5282 40%, #2b6cb0 100%)',
      accentColor: '#ECC94B',
    },
    tokens: {
      bg: '215 55% 22%',
      bgSecondary: '215 50% 28%',
      textPrimary: '0 0% 100%',
      textSecondary: '210 25% 82%',
      accent: '44 92% 60%',
      accentSecondary: '196 80% 55%',
      surface: '215 48% 26%',
      surfaceHover: '215 48% 32%',
      borderRadius: '0.5rem',
      borderRadiusLg: '0.75rem',
      borderWidth: '1px',
      borderColor: '44 92% 60% / 0.25',
      fontFamily: '"Source Sans Pro", "Inter", sans-serif',
      fontFamilyDisplay: '"Playfair Display", "Georgia", serif',
      fontWeight: '400',
      letterSpacing: '0.01em',
      shadowStyle: 'soft',
      shadowColor: '0 0% 0% / 0.25',
      animationStyle: 'smooth',
      decorativeStyle: 'lines',
      decorativeOpacity: 0.05,
      buttonStyle: 'rounded',
      buttonEffect: 'border',
      progressStyle: 'square',
      badgeStyle: 'solid',
      cardStyle: 'bordered',
      cardBlur: false,
    },
    optionColors: [
      'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600',
      'bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500',
      'bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600',
      'bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600',
      'bg-gradient-to-r from-cyan-600 to-teal-700 hover:from-cyan-500 hover:to-teal-600',
      'bg-gradient-to-r from-purple-600 to-violet-700 hover:from-purple-500 hover:to-violet-600',
    ],
  },
  
  'swiss-minimal': {
    id: 'swiss-minimal',
    name: 'Swiss Minimal',
    description: 'Bold & clean',
    emoji: '⬛',
    preview: {
      gradient: 'linear-gradient(180deg, #1a1a1a 0%, #2d2d2d 100%)',
      accentColor: '#E53E3E',
    },
    tokens: {
      bg: '0 0% 10%',
      bgSecondary: '0 0% 15%',
      textPrimary: '0 0% 100%',
      textSecondary: '0 0% 70%',
      accent: '0 85% 55%',
      accentSecondary: '0 0% 100%',
      surface: '0 0% 12%',
      surfaceHover: '0 0% 18%',
      borderRadius: '0px',
      borderRadiusLg: '0px',
      borderWidth: '3px',
      borderColor: '0 0% 100%',
      fontFamily: '"Inter", "Helvetica Neue", sans-serif',
      fontFamilyDisplay: '"Bebas Neue", "Inter", sans-serif',
      fontWeight: '700',
      letterSpacing: '0.05em',
      shadowStyle: 'hard',
      shadowColor: '0 0% 0% / 1',
      animationStyle: 'snappy',
      decorativeStyle: 'geometric',
      decorativeOpacity: 0.06,
      buttonStyle: 'square',
      buttonEffect: 'flat',
      progressStyle: 'square',
      badgeStyle: 'solid',
      cardStyle: 'bordered',
      cardBlur: false,
    },
    optionColors: [
      'bg-white text-black hover:bg-gray-200',
      'bg-red-600 text-white hover:bg-red-500',
      'bg-blue-600 text-white hover:bg-blue-500',
      'bg-yellow-500 text-black hover:bg-yellow-400',
      'bg-green-600 text-white hover:bg-green-500',
      'bg-purple-600 text-white hover:bg-purple-500',
    ],
  },

  'sunset-warmth': {
    id: 'sunset-warmth',
    name: 'Sunset Warmth',
    description: 'Warm & cozy',
    emoji: '🌅',
    isPremium: true, // Pro only
    preview: {
      gradient: 'linear-gradient(135deg, #1a0a0a 0%, #2d1810 40%, #451a1a 100%)',
      accentColor: '#F97316',
    },
    tokens: {
      bg: '15 60% 8%',
      bgSecondary: '20 50% 12%',
      textPrimary: '30 100% 95%',
      textSecondary: '25 60% 75%',
      accent: '25 95% 53%',
      accentSecondary: '40 100% 60%',
      surface: '20 45% 14%',
      surfaceHover: '20 45% 20%',
      borderRadius: '1rem',
      borderRadiusLg: '1.25rem',
      borderWidth: '0px',
      borderColor: '25 95% 53% / 0.2',
      fontFamily: '"Outfit", "Inter", sans-serif',
      fontFamilyDisplay: '"Outfit", sans-serif',
      fontWeight: '500',
      letterSpacing: '0em',
      shadowStyle: 'glow',
      shadowColor: '25 95% 53% / 0.3',
      animationStyle: 'smooth',
      decorativeStyle: 'waves',
      decorativeOpacity: 0.08,
      buttonStyle: 'rounded',
      buttonEffect: 'glow',
      progressStyle: 'rounded',
      badgeStyle: 'subtle',
      cardStyle: 'glass',
      cardBlur: true,
    },
    optionColors: [
      'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500',
      'bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500',
      'bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500',
      'bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500',
      'bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500',
      'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-400 hover:to-pink-500',
    ],
  },

  'ocean-breeze': {
    id: 'ocean-breeze',
    name: 'Ocean Breeze',
    description: 'Fresh & calm',
    emoji: '🌊',
    isPremium: true, // Pro only
    preview: {
      gradient: 'linear-gradient(135deg, #0a1628 0%, #102840 40%, #0f3460 100%)',
      accentColor: '#22D3EE',
    },
    tokens: {
      bg: '215 70% 10%',
      bgSecondary: '210 60% 15%',
      textPrimary: '190 100% 98%',
      textSecondary: '195 50% 75%',
      accent: '190 90% 55%',
      accentSecondary: '170 80% 45%',
      surface: '210 55% 13%',
      surfaceHover: '210 55% 18%',
      borderRadius: '1rem',
      borderRadiusLg: '1.5rem',
      borderWidth: '1px',
      borderColor: '190 90% 55% / 0.2',
      fontFamily: '"DM Sans", "Inter", sans-serif',
      fontFamilyDisplay: '"DM Sans", sans-serif',
      fontWeight: '500',
      letterSpacing: '-0.01em',
      shadowStyle: 'glow',
      shadowColor: '190 90% 55% / 0.3',
      animationStyle: 'smooth',
      decorativeStyle: 'aurora',
      decorativeOpacity: 0.1,
      buttonStyle: 'pill',
      buttonEffect: 'glow',
      progressStyle: 'rounded',
      badgeStyle: 'outline',
      cardStyle: 'glass',
      cardBlur: true,
    },
    optionColors: [
      'bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-400 hover:to-teal-500',
      'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500',
      'bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500',
      'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500',
      'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500',
      'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500',
    ],
  },
};

// Helper to get theme by ID with fallback
export function getTheme(themeId: ThemeId | string | undefined): Theme {
  return THEMES[themeId as ThemeId] || THEMES['neon-cyber'];
}

// Get all themes as array
export function getAllThemes(): Theme[] {
  return Object.values(THEMES);
}

// Default theme
export const DEFAULT_THEME_ID: ThemeId = 'neon-cyber';
