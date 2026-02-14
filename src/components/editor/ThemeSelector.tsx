import { motion } from 'framer-motion';
import { Check, Lock, Crown } from 'lucide-react';
import { ThemeId, Theme, getAllThemes } from '@/types/themes';
import { cn } from '@/lib/utils';
import { useSubscriptionContext } from '@/contexts/SubscriptionContext';

interface ThemeSelectorProps {
  selectedThemeId: ThemeId;
  onSelectTheme: (themeId: ThemeId) => void;
  onPremiumBlocked?: () => void; // Called when user tries to select premium theme without Pro
  compact?: boolean;
}

export function ThemeSelector({ 
  selectedThemeId, 
  onSelectTheme, 
  onPremiumBlocked,
  compact = false 
}: ThemeSelectorProps) {
  const themes = getAllThemes();
  const { isPro, isFree } = useSubscriptionContext();

  const handleThemeSelect = (theme: Theme) => {
    if (theme.isPremium && !isPro) {
      onPremiumBlocked?.();
      return;
    }
    onSelectTheme(theme.id);
  };

  if (compact) {
    return (
      <div className="flex gap-1.5 flex-wrap">
        {themes.map((theme) => (
          <CompactThemeButton
            key={theme.id}
            theme={theme}
            isSelected={selectedThemeId === theme.id}
            isLocked={theme.isPremium && !isPro}
            onClick={() => handleThemeSelect(theme)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
        <span className="text-base">🎨</span>
        <span>Visual Theme</span>
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        {themes.map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            isSelected={selectedThemeId === theme.id}
            isLocked={theme.isPremium && !isPro}
            onClick={() => handleThemeSelect(theme)}
          />
        ))}
      </div>
    </div>
  );
}

// Compact button for inline use
function CompactThemeButton({ theme, isSelected, isLocked, onClick }: { 
  theme: Theme; 
  isSelected: boolean;
  isLocked?: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        'relative w-8 h-8 rounded-md overflow-hidden border-2 transition-all',
        isLocked ? 'opacity-70' : '',
        isSelected ? 'border-primary ring-1 ring-primary/30' : 'border-border/50 hover:border-primary/50'
      )}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      title={isLocked ? `${theme.name} (Pro)` : theme.name}
    >
      <div
        className="absolute inset-0"
        style={{ background: theme.preview.gradient }}
      />
      {isLocked ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Lock className="w-3 h-3 text-white" />
        </div>
      ) : isSelected ? (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute inset-0 flex items-center justify-center bg-black/40"
        >
          <Check className="w-3 h-3 text-white" />
        </motion.div>
      ) : null}
    </motion.button>
  );
}

// Card-style theme selector
function ThemeCard({ theme, isSelected, isLocked, onClick }: { 
  theme: Theme; 
  isSelected: boolean;
  isLocked?: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        'relative p-2 rounded-lg border transition-all text-left overflow-hidden group',
        isLocked ? 'opacity-80' : '',
        isSelected 
          ? 'border-primary ring-1 ring-primary/30 bg-primary/5' 
          : 'border-border/50 hover:border-primary/40 bg-card/50'
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Premium badge */}
      {theme.isPremium && (
        <div className="absolute top-1 right-1 z-10">
          <div className={cn(
            "flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium",
            isLocked 
              ? "bg-yellow-500/20 text-yellow-500" 
              : "bg-primary/20 text-primary"
          )}>
            <Crown className="w-2.5 h-2.5" />
            Pro
          </div>
        </div>
      )}

      {/* Theme preview */}
      <div
        className="h-10 rounded-md mb-1.5 relative overflow-hidden"
        style={{ background: theme.preview.gradient }}
      >
        {/* Accent dot */}
        <div 
          className="absolute bottom-1 right-1 w-2 h-2 rounded-full"
          style={{ background: theme.preview.accentColor }}
        />
        
        {/* Lock overlay for premium themes */}
        {isLocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Lock className="w-4 h-4 text-white" />
          </div>
        )}
        
        {/* Check overlay */}
        {isSelected && !isLocked && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute inset-0 flex items-center justify-center bg-black/30"
          >
            <Check className="w-4 h-4 text-white" />
          </motion.div>
        )}
      </div>
      
      {/* Theme name */}
      <div className="flex items-center gap-1">
        <span className="text-xs">{theme.emoji}</span>
        <span className="text-xs font-medium text-foreground truncate">{theme.name}</span>
      </div>
    </motion.button>
  );
}
