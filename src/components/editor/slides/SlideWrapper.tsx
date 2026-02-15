import { ReactNode, useMemo } from "react";
import { motion } from "framer-motion";
import { Slide, GRADIENT_PRESETS } from "@/types/slides";
import { ThemeId, getTheme } from "@/types/themes";
import { ThemedDecorations } from "@/components/effects/ThemedDecorations";
import { inferDirectionFromSlide } from "@/lib/textDirection";

interface SlideWrapperProps {
  slide: Slide;
  children: ReactNode;
  isPreview?: boolean;
  showEffects?: boolean;
  themeId?: ThemeId;
}

export function SlideWrapper({ 
  slide, 
  children, 
  isPreview = false, 
  showEffects = true,
  themeId = 'neon-cyber'
}: SlideWrapperProps) {
  const design = slide.design || {};
  const theme = useMemo(() => getTheme(themeId), [themeId]);

  const direction = useMemo<"rtl" | "ltr">(
    () => design.direction || inferDirectionFromSlide(slide),
    [design.direction, slide]
  );
  
  // Get gradient background - prioritize design preset, then theme
  const getBackground = () => {
    if (design.gradientPreset) {
      const preset = GRADIENT_PRESETS.find(g => g.id === design.gradientPreset);
      if (preset) {
        return `linear-gradient(${preset.angle}deg, ${preset.colors.join(', ')})`;
      }
    }
    if (design.backgroundColor) {
      return design.backgroundColor;
    }
    return theme.preview.gradient;
  };

  // Get font size class - use responsive scaling
  const getFontSizeClass = () => {
    switch (design.fontSize) {
      case 'small': return 'slide-text-small';
      case 'large': return 'slide-text-large';
      default: return 'slide-text-medium';
    }
  };

  // Get text align class
  const getTextAlignClass = () => {
    switch (design.textAlign) {
      case 'left': return 'text-left';
      case 'right': return 'text-right';
      default: return 'text-center';
    }
  };

  // Build theme CSS variables - includes text alignment for inheritance
  const themeStyles = useMemo(() => ({
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
    '--theme-letter-spacing': theme.tokens.letterSpacing,
    // Pass text alignment as CSS variable for child components to use
    '--slide-text-align': design.textAlign || 'center',
    '--slide-dir': direction,
  } as React.CSSProperties), [theme, design.textAlign, direction]);

  // Get theme-specific border radius
  const getThemeBorderRadius = () => {
    switch (themeId) {
      case 'swiss-minimal': return 'rounded-none';
      case 'soft-pop': return 'rounded-3xl';
      case 'academic-pro': return 'rounded-lg';
      default: return 'rounded-xl md:rounded-2xl';
    }
  };

  // Get theme-specific shadow
  const getThemeShadow = (): React.CSSProperties => {
    switch (theme.tokens.shadowStyle) {
      case 'glow':
        return { boxShadow: `0 0 50px -15px hsl(${theme.tokens.accent} / 0.5), 0 0 100px -30px hsl(${theme.tokens.accentSecondary} / 0.3)` };
      case 'soft':
        return { boxShadow: '0 20px 50px -15px rgba(0,0,0,0.15), 0 10px 20px -10px rgba(0,0,0,0.1)' };
      case 'hard':
        return { boxShadow: '10px 10px 0 rgba(0,0,0,0.9)' };
      default:
        return {};
    }
  };

  // Determine text color
  const getTextColor = () => {
    if (design.textColor) {
      return design.textColor;
    }
    if (themeId === 'soft-pop' || themeId === 'swiss-minimal') {
      return `hsl(${theme.tokens.textPrimary})`;
    }
    return '#ffffff';
  };

  // Get animation config based on theme
  const getAnimationConfig = () => {
    switch (theme.tokens.animationStyle) {
      case 'bouncy':
        return { type: 'spring' as const, stiffness: 300, damping: 15 };
      case 'snappy':
        return { type: 'spring' as const, stiffness: 500, damping: 30 };
      case 'smooth':
        return { type: 'tween' as const, duration: 0.4, ease: 'easeOut' as const };
      default:
        return { type: 'spring' as const, stiffness: 300, damping: 25 };
    }
  };

  // Overlay image rendering
  const overlayImage = design.overlayImageUrl && design.overlayImagePosition !== 'none';
  const isBackgroundImage = design.overlayImagePosition === 'background';
  const isSideImage = design.overlayImagePosition === 'left' || design.overlayImagePosition === 'right';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={getAnimationConfig()}
      className={`
        w-full h-full overflow-hidden relative
        ${getThemeBorderRadius()}
        ${isPreview ? 'shadow-2xl' : 'shadow-lg'}
        ${themeId === 'swiss-minimal' ? 'border-[3px] border-black' : ''}
      `}
      style={{
        ...themeStyles,
        ...getThemeShadow(),
        background: getBackground(),
        color: getTextColor(),
        fontFamily: design.fontFamily || theme.tokens.fontFamily,
        letterSpacing: theme.tokens.letterSpacing,
        direction,
      }}
      dir={direction}
      data-theme={themeId}
    >
      {/* Background overlay image - dimmed so text/components stay readable */}
      {overlayImage && isBackgroundImage && (
        <div className="absolute inset-0 z-0" key={`bg-${design.overlayImageUrl}`}>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${design.overlayImageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.25,
            }}
          />
          <div
            className="absolute inset-0 bg-black/20"
            aria-hidden
          />
        </div>
      )}

      {/* Theme-specific decorations */}
      {showEffects && <ThemedDecorations themeId={themeId} />}

      {/* Content with side image */}
      <div 
        className={`relative z-10 h-full flex ${isSideImage ? 'flex-row' : 'flex-col'} ${getFontSizeClass()} ${getTextAlignClass()}`}
        style={{ textAlign: design.textAlign || 'center' }}
      >
        {overlayImage && design.overlayImagePosition === 'left' && (
          <div className="w-1/2 h-full flex-shrink-0">
            <img key={design.overlayImageUrl} src={design.overlayImageUrl} alt="" className="w-full h-full object-cover" loading="eager" />
          </div>
        )}
        <div className={`${isSideImage ? 'flex-1' : 'h-full'} flex flex-col`}>
          {children}
        </div>
        {overlayImage && design.overlayImagePosition === 'right' && (
          <div className="w-1/2 h-full flex-shrink-0">
            <img key={design.overlayImageUrl} src={design.overlayImageUrl} alt="" className="w-full h-full object-cover" loading="eager" />
          </div>
        )}
      </div>

      {/* Logo - compact size, positioned by logoPosition */}
      {design.logoUrl && (
        <div
          key={design.logoUrl}
          className={`absolute z-20 pointer-events-none w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 ${
            design.logoPosition === 'top-left' ? 'top-2 left-2' :
            design.logoPosition === 'top-right' ? 'top-2 right-2' :
            design.logoPosition === 'bottom-left' ? 'bottom-2 left-2' :
            'bottom-2 right-2'
          }`}
        >
          <img
            src={design.logoUrl}
            alt=""
            className="w-full h-full object-contain"
            style={{ imageRendering: '-webkit-optimize-contrast' }}
          />
        </div>
      )}
    </motion.div>
  );
}
