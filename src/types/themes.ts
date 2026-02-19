// ===== Theme System Types =====
// 6 distinct themes for teachers & lecturers: Academic, Energy, Professional, Warm, Calm, Modern

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
  isPremium?: boolean;
  preview: {
    gradient: string;
    accentColor: string;
  };
  tokens: ThemeTokens;
  optionColors: string[];
}

// ===== 6 Core Themes – Clearly distinct for lectures & teaching =====

export const THEMES: Record<ThemeId, Theme> = {
  // 1. Academic – formal, university, serious (navy + gold)
  'academic-pro': {
    id: 'academic-pro',
    name: 'Academic',
    description: 'Formal & scholarly – ideal for university and serious topics',
    emoji: '📚',
    preview: {
      gradient: 'linear-gradient(165deg, #0f172a 0%, #1e3a5f 35%, #172554 70%, #0c1929 100%)',
      accentColor: '#EAB308',
    },
    tokens: {
      bg: '222 47% 11%',
      bgSecondary: '222 44% 18%',
      textPrimary: '45 100% 96%',
      textSecondary: '220 20% 75%',
      accent: '48 96% 53%',
      accentSecondary: '43 96% 56%',
      surface: '222 42% 16%',
      surfaceHover: '222 42% 22%',
      borderRadius: '0.5rem',
      borderRadiusLg: '0.75rem',
      borderWidth: '1px',
      borderColor: '48 96% 53% / 0.35',
      fontFamily: '"Source Sans 3", "Georgia", serif',
      fontFamilyDisplay: '"Playfair Display", "Georgia", serif',
      fontWeight: '400',
      letterSpacing: '0.02em',
      shadowStyle: 'soft',
      shadowColor: '48 96% 53% / 0.2',
      animationStyle: 'smooth',
      decorativeStyle: 'lines',
      decorativeOpacity: 0.12,
      buttonStyle: 'rounded',
      buttonEffect: 'border',
      progressStyle: 'square',
      badgeStyle: 'solid',
      cardStyle: 'bordered',
      cardBlur: false,
    },
    optionColors: [
      'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white',
      'bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-600 hover:to-indigo-700 text-white',
      'bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white',
      'bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-600 hover:to-teal-700 text-white',
      'bg-gradient-to-r from-rose-700 to-red-800 hover:from-rose-600 hover:to-red-700 text-white',
      'bg-gradient-to-r from-violet-700 to-purple-800 hover:from-violet-600 hover:to-purple-700 text-white',
    ],
  },

  // 2. Energy – fun, engaging, for younger students (bright & playful)
  'soft-pop': {
    id: 'soft-pop',
    name: 'Energy',
    description: 'Fun & engaging – great for schools and interactive sessions',
    emoji: '⚡',
    preview: {
      gradient: 'linear-gradient(135deg, #fef3c7 0%, #fcd34d 25%, #fb923c 60%, #f97316 100%)',
      accentColor: '#EA580C',
    },
    tokens: {
      bg: '30 100% 96%',
      bgSecondary: '25 95% 92%',
      textPrimary: '20 70% 18%',
      textSecondary: '25 40% 35%',
      accent: '25 95% 53%',
      accentSecondary: '35 100% 50%',
      surface: '0 0% 100%',
      surfaceHover: '30 80% 97%',
      borderRadius: '1.25rem',
      borderRadiusLg: '1.75rem',
      borderWidth: '0px',
      borderColor: '25 95% 53% / 0.2',
      fontFamily: '"Nunito", "Quicksand", sans-serif',
      fontFamilyDisplay: '"Fredoka", "Nunito", sans-serif',
      fontWeight: '600',
      letterSpacing: '-0.01em',
      shadowStyle: 'soft',
      shadowColor: '25 95% 53% / 0.25',
      animationStyle: 'bouncy',
      decorativeStyle: 'bubbles',
      decorativeOpacity: 0.2,
      buttonStyle: 'pill',
      buttonEffect: 'shadow',
      progressStyle: 'rounded',
      badgeStyle: 'pill',
      cardStyle: 'elevated',
      cardBlur: false,
    },
    optionColors: [
      'bg-gradient-to-r from-orange-400 to-amber-500 hover:from-orange-300 hover:to-amber-400 text-white',
      'bg-gradient-to-r from-rose-400 to-pink-500 hover:from-rose-300 hover:to-pink-400 text-white',
      'bg-gradient-to-r from-lime-400 to-green-500 hover:from-lime-300 hover:to-green-400 text-white',
      'bg-gradient-to-r from-violet-400 to-purple-500 hover:from-violet-300 hover:to-purple-400 text-white',
      'bg-gradient-to-r from-cyan-400 to-teal-500 hover:from-cyan-300 hover:to-teal-400 text-white',
      'bg-gradient-to-r from-fuchsia-400 to-pink-500 hover:from-fuchsia-300 hover:to-pink-400 text-white',
    ],
  },

  // 3. Professional – clean, business, minimal (dark + one accent) – Pro only
  'swiss-minimal': {
    id: 'swiss-minimal',
    name: 'Professional',
    description: 'Clean & bold – perfect for corporate and formal presentations',
    emoji: '⬛',
    isPremium: true,
    preview: {
      gradient: 'linear-gradient(180deg, #0c0c0c 0%, #171717 40%, #262626 100%)',
      accentColor: '#EF4444',
    },
    tokens: {
      bg: '0 0% 6%',
      bgSecondary: '0 0% 10%',
      textPrimary: '0 0% 100%',
      textSecondary: '0 0% 65%',
      accent: '0 84% 60%',
      accentSecondary: '0 0% 100%',
      surface: '0 0% 9%',
      surfaceHover: '0 0% 14%',
      borderRadius: '0px',
      borderRadiusLg: '0px',
      borderWidth: '2px',
      borderColor: '0 0% 100%',
      fontFamily: '"Inter", "Helvetica Neue", sans-serif',
      fontFamilyDisplay: '"Inter", "Helvetica Neue", sans-serif',
      fontWeight: '600',
      letterSpacing: '0.04em',
      shadowStyle: 'hard',
      shadowColor: '0 0% 0% / 0.8',
      animationStyle: 'snappy',
      decorativeStyle: 'geometric',
      decorativeOpacity: 0.15,
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
      'bg-amber-400 text-black hover:bg-amber-300',
      'bg-emerald-600 text-white hover:bg-emerald-500',
      'bg-neutral-500 text-white hover:bg-neutral-400',
    ],
  },

  // 4. Warm – friendly, approachable (terracotta / cozy)
  'sunset-warmth': {
    id: 'sunset-warmth',
    name: 'Warm',
    description: 'Friendly & approachable – welcoming for any audience',
    emoji: '🌅',
    isPremium: true,
    preview: {
      gradient: 'linear-gradient(145deg, #1c1917 0%, #292524 25%, #44403c 55%, #57534e 100%)',
      accentColor: '#F97316',
    },
    tokens: {
      bg: '24 30% 12%',
      bgSecondary: '25 25% 18%',
      textPrimary: '40 30% 95%',
      textSecondary: '30 20% 72%',
      accent: '25 95% 53%',
      accentSecondary: '35 100% 60%',
      surface: '25 22% 16%',
      surfaceHover: '25 22% 22%',
      borderRadius: '1rem',
      borderRadiusLg: '1.25rem',
      borderWidth: '0px',
      borderColor: '25 95% 53% / 0.25',
      fontFamily: '"Outfit", "Inter", sans-serif',
      fontFamilyDisplay: '"Outfit", sans-serif',
      fontWeight: '500',
      letterSpacing: '0em',
      shadowStyle: 'glow',
      shadowColor: '25 95% 53% / 0.35',
      animationStyle: 'smooth',
      decorativeStyle: 'waves',
      decorativeOpacity: 0.14,
      buttonStyle: 'rounded',
      buttonEffect: 'glow',
      progressStyle: 'rounded',
      badgeStyle: 'subtle',
      cardStyle: 'glass',
      cardBlur: true,
    },
    optionColors: [
      'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white',
      'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white',
      'bg-gradient-to-r from-stone-500 to-stone-600 hover:from-stone-400 hover:to-stone-500 text-white',
      'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white',
      'bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-600 hover:to-orange-600 text-white',
      'bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-white',
    ],
  },

  // 5. Calm – focused, low distraction (cool blues & teals)
  'ocean-breeze': {
    id: 'ocean-breeze',
    name: 'Calm',
    description: 'Focused & serene – reduces visual noise for deep focus',
    emoji: '🌊',
    isPremium: true,
    preview: {
      gradient: 'linear-gradient(150deg, #062e3d 0%, #0c4a6e 30%, #075985 60%, #0e7490 100%)',
      accentColor: '#22D3EE',
    },
    tokens: {
      bg: '197 70% 12%',
      bgSecondary: '199 65% 18%',
      textPrimary: '185 100% 97%',
      textSecondary: '195 40% 78%',
      accent: '190 90% 55%',
      accentSecondary: '175 80% 45%',
      surface: '198 60% 15%',
      surfaceHover: '198 60% 20%',
      borderRadius: '1rem',
      borderRadiusLg: '1.5rem',
      borderWidth: '1px',
      borderColor: '190 90% 55% / 0.25',
      fontFamily: '"DM Sans", "Inter", sans-serif',
      fontFamilyDisplay: '"DM Sans", sans-serif',
      fontWeight: '500',
      letterSpacing: '-0.01em',
      shadowStyle: 'glow',
      shadowColor: '190 90% 55% / 0.35',
      animationStyle: 'smooth',
      decorativeStyle: 'aurora',
      decorativeOpacity: 0.18,
      buttonStyle: 'pill',
      buttonEffect: 'glow',
      progressStyle: 'rounded',
      badgeStyle: 'outline',
      cardStyle: 'glass',
      cardBlur: true,
    },
    optionColors: [
      'bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-400 hover:to-teal-500 text-white',
      'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white',
      'bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white',
      'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white',
      'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white',
      'bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white',
    ],
  },

  // 6. Modern – tech, contemporary (neon / digital) – Pro only
  'neon-cyber': {
    id: 'neon-cyber',
    name: 'Modern',
    description: 'Tech & contemporary – ideal for STEM and digital topics',
    emoji: '🌌',
    isPremium: true,
    preview: {
      gradient: 'linear-gradient(140deg, #030712 0%, #0f172a 25%, #1e1b4b 60%, #312e81 100%)',
      accentColor: '#00FF94',
    },
    tokens: {
      bg: '240 55% 8%',
      bgSecondary: '250 45% 14%',
      textPrimary: '0 0% 100%',
      textSecondary: '250 30% 78%',
      accent: '156 100% 50%',
      accentSecondary: '270 100% 65%',
      surface: '250 40% 12%',
      surfaceHover: '250 40% 18%',
      borderRadius: '0.75rem',
      borderRadiusLg: '1rem',
      borderWidth: '1px',
      borderColor: '156 100% 50% / 0.4',
      fontFamily: '"Space Grotesk", "Inter", sans-serif',
      fontFamilyDisplay: '"Space Grotesk", sans-serif',
      fontWeight: '500',
      letterSpacing: '0.02em',
      shadowStyle: 'glow',
      shadowColor: '156 100% 50% / 0.5',
      animationStyle: 'snappy',
      decorativeStyle: 'tech-grid',
      decorativeOpacity: 0.12,
      buttonStyle: 'rounded',
      buttonEffect: 'glow',
      progressStyle: 'gradient',
      badgeStyle: 'outline',
      cardStyle: 'glass',
      cardBlur: true,
    },
    optionColors: [
      'bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-black',
      'bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 text-white',
      'bg-gradient-to-r from-fuchsia-500 to-pink-600 hover:from-fuchsia-400 hover:to-pink-500 text-white',
      'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-white',
      'bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white',
      'bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white',
    ],
  },
};

// Helper to get theme by ID with fallback
export function getTheme(themeId: ThemeId | string | undefined): Theme {
  return THEMES[themeId as ThemeId] || THEMES['academic-pro'];
}

// Get all themes as array (order: Academic, Energy, Professional, Warm, Calm, Modern)
export function getAllThemes(): Theme[] {
  return [
    THEMES['academic-pro'],
    THEMES['soft-pop'],
    THEMES['swiss-minimal'],
    THEMES['sunset-warmth'],
    THEMES['ocean-breeze'],
    THEMES['neon-cyber'],
  ];
}

// Default theme – Academic for lecturer audience
export const DEFAULT_THEME_ID: ThemeId = 'academic-pro';
