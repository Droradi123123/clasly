import { useMemo } from 'react';
import { ThemeId, getTheme, Theme } from '@/types/themes';

export function useSlideTheme(themeId: ThemeId = 'neon-cyber') {
  const theme = useMemo(() => getTheme(themeId), [themeId]);
  
  // Generate CSS variables object for inline styles
  const themeStyles = useMemo((): React.CSSProperties => ({
    '--theme-bg': theme.tokens.bg,
    '--theme-bg-secondary': theme.tokens.bgSecondary,
    '--theme-text-primary': theme.tokens.textPrimary,
    '--theme-text-secondary': theme.tokens.textSecondary,
    '--theme-accent': theme.tokens.accent,
    '--theme-accent-secondary': theme.tokens.accentSecondary,
    '--theme-surface': theme.tokens.surface,
    '--theme-surface-hover': theme.tokens.surfaceHover,
    '--theme-border-radius': theme.tokens.borderRadius,
    '--theme-border-radius-lg': theme.tokens.borderRadiusLg,
    '--theme-border-width': theme.tokens.borderWidth,
    '--theme-border-color': theme.tokens.borderColor,
    '--theme-font-family': theme.tokens.fontFamily,
    '--theme-font-family-display': theme.tokens.fontFamilyDisplay,
    '--theme-shadow-color': theme.tokens.shadowColor,
  } as React.CSSProperties), [theme]);
  
  // Get animation config based on theme
  const animationConfig = useMemo(() => {
    switch (theme.tokens.animationStyle) {
      case 'bouncy':
        return { type: 'spring', stiffness: 300, damping: 15 };
      case 'snappy':
        return { type: 'spring', stiffness: 500, damping: 30 };
      case 'smooth':
        return { type: 'tween', duration: 0.4, ease: 'easeOut' };
      default:
        return { type: 'spring', stiffness: 300, damping: 25 };
    }
  }, [theme]);
  
  // Get option color class based on theme
  const getOptionClasses = (index: number, isActive: boolean = false, isCorrect: boolean = false) => {
    const baseClasses = 'transition-all duration-200';
    
    // Get button style based on theme
    const getButtonRadius = () => {
      switch (theme.tokens.buttonStyle) {
        case 'pill': return 'rounded-full';
        case 'rounded': return 'rounded-xl';
        case 'square': return 'rounded-lg';
        case 'sharp': return 'rounded-none';
        default: return 'rounded-xl';
      }
    };
    
    if (isCorrect) {
      return `${baseClasses} ${getButtonRadius()} bg-emerald-500 text-white`;
    }
    
    if (isActive) {
      return `${baseClasses} ${getButtonRadius()} ring-4 ring-white/50`;
    }
    
    // Use theme-specific option colors
    const colorClass = theme.optionColors[index % theme.optionColors.length];
    return `${baseClasses} ${getButtonRadius()} ${colorClass} text-white`;
  };
  
  // Get shadow style based on theme
  const getShadowStyle = () => {
    switch (theme.tokens.shadowStyle) {
      case 'glow':
        return `0 0 30px hsl(${theme.tokens.accent} / 0.4)`;
      case 'soft':
        return '0 8px 30px -10px rgba(0,0,0,0.2)';
      case 'hard':
        return '6px 6px 0 rgba(0,0,0,0.9)';
      default:
        return 'none';
    }
  };
  
  // Get button effect style
  const getButtonEffect = (hovered: boolean = false) => {
    switch (theme.tokens.buttonEffect) {
      case 'glow':
        return hovered ? { boxShadow: `0 0 25px hsl(${theme.tokens.accent} / 0.6)` } : {};
      case 'shadow':
        return hovered ? { boxShadow: '0 10px 30px -10px rgba(0,0,0,0.3)', transform: 'translateY(-2px)' } : {};
      case 'border':
        return hovered ? { borderColor: `hsl(${theme.tokens.accent})` } : {};
      case 'flat':
        return hovered ? { opacity: 0.9 } : {};
      default:
        return {};
    }
  };
  
  // Get card style
  const getCardStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      borderRadius: theme.tokens.borderRadius,
    };
    
    switch (theme.tokens.cardStyle) {
      case 'glass':
        return {
          ...base,
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        };
      case 'solid':
        return {
          ...base,
          background: `hsl(${theme.tokens.surface})`,
        };
      case 'bordered':
        return {
          ...base,
          background: `hsl(${theme.tokens.surface})`,
          border: `${theme.tokens.borderWidth} solid hsl(${theme.tokens.borderColor})`,
        };
      case 'elevated':
        return {
          ...base,
          background: `hsl(${theme.tokens.surface})`,
          boxShadow: '0 10px 40px -10px rgba(0,0,0,0.15)',
        };
      default:
        return base;
    }
  };
  
  // Get badge style
  const getBadgeStyle = (): string => {
    switch (theme.tokens.badgeStyle) {
      case 'solid':
        return 'bg-primary text-primary-foreground';
      case 'outline':
        return 'border border-current bg-transparent';
      case 'subtle':
        return 'bg-primary/20 text-primary';
      case 'pill':
        return 'bg-primary text-primary-foreground rounded-full';
      default:
        return 'bg-primary text-primary-foreground';
    }
  };
  
  // Get progress bar style
  const getProgressStyle = (): string => {
    switch (theme.tokens.progressStyle) {
      case 'rounded':
        return 'rounded-full';
      case 'square':
        return 'rounded-none';
      case 'gradient':
        return 'rounded-full bg-gradient-to-r';
      default:
        return 'rounded-full';
    }
  };

  return {
    theme,
    themeId,
    themeStyles,
    animationConfig,
    getOptionClasses,
    getShadowStyle,
    getButtonEffect,
    getCardStyle,
    getBadgeStyle,
    getProgressStyle,
  };
}
