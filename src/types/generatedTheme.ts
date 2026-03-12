// AI-Generated Theme Types

export interface GeneratedThemeColors {
  background: string;
  backgroundSecondary: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  accentSecondary: string;
}

export interface GeneratedThemeTypography {
  fontFamily: string;
  fontFamilyDisplay: string;
  fontWeight: string;
  letterSpacing: string;
}

export interface GeneratedThemeStyle {
  borderRadius: string;
  animationStyle: 'bouncy' | 'smooth' | 'snappy';
  decorativeStyle: 'tech-grid' | 'bubbles' | 'waves' | 'geometric' | 'aurora' | 'minimal';
}

export interface GeneratedTheme {
  themeName: string;
  colors: GeneratedThemeColors;
  gradient: string;
  typography: GeneratedThemeTypography;
  style: GeneratedThemeStyle;
  optionColors: string[];
  mood: string;
}

// Convert generated theme to CSS custom properties
export function themeToCSS(theme: GeneratedTheme): Record<string, string> {
  return {
    '--gen-bg': theme.colors.background,
    '--gen-bg-secondary': theme.colors.backgroundSecondary,
    '--gen-text-primary': theme.colors.textPrimary,
    '--gen-text-secondary': theme.colors.textSecondary,
    '--gen-accent': theme.colors.accent,
    '--gen-accent-secondary': theme.colors.accentSecondary,
    '--gen-font-family': theme.typography.fontFamily,
    '--gen-font-display': theme.typography.fontFamilyDisplay,
    '--gen-font-weight': theme.typography.fontWeight,
    '--gen-letter-spacing': theme.typography.letterSpacing,
    '--gen-border-radius': theme.style.borderRadius,
  };
}

// Map generated theme to existing theme tokens format for compatibility
export function mapGeneratedToThemeTokens(theme: GeneratedTheme) {
  return {
    bg: theme.colors.background,
    bgSecondary: theme.colors.backgroundSecondary,
    textPrimary: theme.colors.textPrimary,
    textSecondary: theme.colors.textSecondary,
    accent: theme.colors.accent,
    accentSecondary: theme.colors.accentSecondary,
    surface: theme.colors.backgroundSecondary,
    surfaceHover: theme.colors.background,
    borderRadius: theme.style.borderRadius,
    borderRadiusLg: theme.style.borderRadius,
    borderWidth: '1px',
    borderColor: `${theme.colors.accent} / 0.2`,
    fontFamily: theme.typography.fontFamily,
    fontFamilyDisplay: theme.typography.fontFamilyDisplay,
    fontWeight: theme.typography.fontWeight,
    letterSpacing: theme.typography.letterSpacing,
    shadowStyle: 'glow' as const,
    shadowColor: `${theme.colors.accent} / 0.3`,
    animationStyle: theme.style.animationStyle,
    decorativeStyle: theme.style.decorativeStyle,
    decorativeOpacity: 0.1,
    buttonStyle: 'rounded' as const,
    buttonEffect: 'glow' as const,
    progressStyle: 'rounded' as const,
    badgeStyle: 'outline' as const,
    cardStyle: 'glass' as const,
    cardBlur: true,
  };
}
