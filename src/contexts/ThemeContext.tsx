import { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';
import { ThemeId, Theme, getTheme, DEFAULT_THEME_ID } from '@/types/themes';

interface ThemeContextValue {
  themeId: ThemeId;
  theme: Theme;
  setThemeId: (id: ThemeId) => void;
  getCSSVariables: () => Record<string, string>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  initialThemeId?: ThemeId;
}

export function ThemeProvider({ children, initialThemeId = DEFAULT_THEME_ID }: ThemeProviderProps) {
  const [themeId, setThemeId] = useState<ThemeId>(initialThemeId);
  
  const theme = useMemo(() => getTheme(themeId), [themeId]);
  
  const getCSSVariables = useCallback((): Record<string, string> => {
    const { tokens } = theme;
    
    return {
      '--theme-bg': tokens.bg,
      '--theme-bg-secondary': tokens.bgSecondary,
      '--theme-text-primary': tokens.textPrimary,
      '--theme-text-secondary': tokens.textSecondary,
      '--theme-accent': tokens.accent,
      '--theme-accent-secondary': tokens.accentSecondary,
      '--theme-surface': tokens.surface,
      '--theme-surface-hover': tokens.surfaceHover,
      '--theme-border-radius': tokens.borderRadius,
      '--theme-border-radius-lg': tokens.borderRadiusLg,
      '--theme-border-width': tokens.borderWidth,
      '--theme-border-color': tokens.borderColor,
      '--theme-font-family': tokens.fontFamily,
      '--theme-font-family-display': tokens.fontFamilyDisplay,
      '--theme-shadow-color': tokens.shadowColor,
    };
  }, [theme]);
  
  const value = useMemo(() => ({
    themeId,
    theme,
    setThemeId,
    getCSSVariables,
  }), [themeId, theme, getCSSVariables]);
  
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Hook to get CSS variables for inline styles
export function useThemeStyles(): React.CSSProperties {
  const { getCSSVariables } = useTheme();
  return getCSSVariables() as unknown as React.CSSProperties;
}
