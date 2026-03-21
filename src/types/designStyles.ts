// ===== Design Styles System =====
// Design styles are a LAYER on top of visual themes
// They change HOW content is displayed, not the color palette

export type DesignStyleId = 'minimal' | 'dynamic';

export interface DesignStyleConfig {
  // Animation behavior
  animationIntensity: 'none' | 'subtle' | 'moderate' | 'high';
  entranceAnimation: 'fade' | 'slide' | 'scale' | 'bounce';
  resultAnimation: 'grow' | 'pulse' | 'wave' | 'pop';
  
  // Visual density
  spacing: 'compact' | 'comfortable' | 'spacious';
  cardShadow: 'none' | 'subtle' | 'medium' | 'dramatic';
  
  // Typography
  titleSize: 'small' | 'medium' | 'large' | 'xl';
  optionTextSize: 'small' | 'medium' | 'large';
  
  // Interactive elements
  showProgressBars: boolean;
  showPercentages: boolean;
  showCounts: boolean;
  showAnimatedNumbers: boolean;
  
  // Effects
  pulseOnNewVote: boolean;
  celebrationOnResults: boolean;
  particleEffects: boolean;
  
  // Layout
  optionLayout: 'grid' | 'stack' | 'horizontal';
  footerStyle: 'full' | 'minimal' | 'hidden';
}

export interface DesignStyle {
  id: DesignStyleId;
  name: string;
  nameHe: string;
  description: string;
  descriptionHe: string;
  icon: string;
  preview: {
    thumbnail: string; // For future use with actual thumbnails
    accentColor: string;
  };
  config: DesignStyleConfig;
}

// ===== The 2 Core Design Styles =====

export const DESIGN_STYLES: Record<DesignStyleId, DesignStyle> = {
  'minimal': {
    id: 'minimal',
    name: 'Minimal',
    nameHe: 'מינימלי',
    description: 'Clean & professional for corporate settings',
    descriptionHe: 'נקי ומקצועי לסביבות עסקיות',
    icon: '◻️',
    preview: {
      thumbnail: '/styles/minimal.png',
      accentColor: '#6366f1',
    },
    config: {
      // Very subtle animations
      animationIntensity: 'none',
      entranceAnimation: 'fade',
      resultAnimation: 'grow',
      
      // Tighter spacing
      spacing: 'compact',
      cardShadow: 'none',
      
      // Smaller, professional typography
      titleSize: 'small',
      optionTextSize: 'small',
      
      // Minimal UI elements
      showProgressBars: true,
      showPercentages: true,
      showCounts: false,
      showAnimatedNumbers: false,
      
      // No effects
      pulseOnNewVote: false,
      celebrationOnResults: false,
      particleEffects: false,
      
      // Simple layout
      optionLayout: 'stack',
      footerStyle: 'hidden',
    },
  },
  
  'dynamic': {
    id: 'dynamic',
    name: 'Dynamic',
    nameHe: 'דינמי',
    description: 'Energetic & engaging for live events',
    descriptionHe: 'אנרגטי ומרתק לאירועים חיים',
    icon: '✨',
    preview: {
      thumbnail: '/styles/dynamic.png',
      accentColor: '#f59e0b',
    },
    config: {
      // High-energy animations
      animationIntensity: 'high',
      entranceAnimation: 'bounce',
      resultAnimation: 'pop',
      
      // Spacious, breathable layout
      spacing: 'spacious',
      cardShadow: 'dramatic',
      
      // Large, impactful typography
      titleSize: 'xl',
      optionTextSize: 'large',
      
      // Full UI elements with animations
      showProgressBars: true,
      showPercentages: true,
      showCounts: true,
      showAnimatedNumbers: true,
      
      // All effects enabled
      pulseOnNewVote: true,
      celebrationOnResults: true,
      particleEffects: true,
      
      // Grid layout for visual impact
      optionLayout: 'grid',
      footerStyle: 'full',
    },
  },
};

// Helper to get design style by ID with fallback
export function getDesignStyle(styleId: DesignStyleId | string | undefined): DesignStyle {
  return DESIGN_STYLES[styleId as DesignStyleId] || DESIGN_STYLES['dynamic'];
}

// Get all design styles as array
export function getAllDesignStyles(): DesignStyle[] {
  return Object.values(DESIGN_STYLES);
}

// Default design style
export const DEFAULT_DESIGN_STYLE_ID: DesignStyleId = 'dynamic';

// Animation variants based on design style
export function getAnimationVariants(style: DesignStyle) {
  const config = style.config;
  
  const entranceVariants = {
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: { duration: 0.3 },
    },
    slide: {
      initial: { opacity: 0, y: 30 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.4 },
    },
    scale: {
      initial: { opacity: 0, scale: 0.8 },
      animate: { opacity: 1, scale: 1 },
      transition: { duration: 0.3 },
    },
    bounce: {
      initial: { opacity: 0, y: 50, scale: 0.9 },
      animate: { opacity: 1, y: 0, scale: 1 },
      transition: { type: 'spring' as const, stiffness: 300, damping: 20 },
    },
  };

  const intensityMultiplier = {
    none: 0,
    subtle: 0.3,
    moderate: 0.6,
    high: 1,
  };

  return {
    entrance: entranceVariants[config.entranceAnimation],
    intensity: intensityMultiplier[config.animationIntensity],
  };
}

// Spacing utilities based on design style
export function getSpacingClasses(style: DesignStyle) {
  const spacing = style.config.spacing;
  
  return {
    compact: {
      gap: 'gap-2 md:gap-3',
      padding: 'p-3 md:p-4',
      margin: 'mt-4 md:mt-6',
    },
    comfortable: {
      gap: 'gap-3 md:gap-4',
      padding: 'p-4 md:p-5',
      margin: 'mt-6 md:mt-8',
    },
    spacious: {
      gap: 'gap-4 md:gap-6',
      padding: 'p-5 md:p-6',
      margin: 'mt-8 md:mt-10',
    },
  }[spacing];
}

// Shadow utilities based on design style
export function getShadowClasses(style: DesignStyle) {
  const shadow = style.config.cardShadow;
  
  return {
    none: '',
    subtle: 'shadow-sm',
    medium: 'shadow-md',
    dramatic: 'shadow-lg shadow-black/20',
  }[shadow];
}
