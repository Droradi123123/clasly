import { motion, HTMLMotionProps } from 'framer-motion';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ThemedCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: ReactNode;
  variant?: 'surface' | 'accent' | 'ghost';
  isActive?: boolean;
  isCorrect?: boolean;
  isIncorrect?: boolean;
  interactive?: boolean;
  className?: string;
}

export function ThemedCard({
  children,
  variant = 'surface',
  isActive = false,
  isCorrect = false,
  isIncorrect = false,
  interactive = false,
  className,
  ...motionProps
}: ThemedCardProps) {
  // Determine background based on state
  const getBackgroundClass = () => {
    if (isCorrect) return 'bg-emerald-500/80 border-emerald-400';
    if (isIncorrect) return 'bg-rose-500/80 border-rose-400';
    if (isActive) return 'bg-[hsl(var(--theme-accent)/0.2)] border-[hsl(var(--theme-accent)/0.5)]';
    
    switch (variant) {
      case 'accent':
        return 'bg-[hsl(var(--theme-accent)/0.8)] border-[hsl(var(--theme-accent))]';
      case 'ghost':
        return 'bg-transparent border-white/20';
      default:
        return 'bg-[hsl(var(--theme-surface))] border-white/20 hover:bg-[hsl(var(--theme-surface-hover))]';
    }
  };

  return (
    <motion.div
      className={cn(
        'p-4 border-2 transition-all overflow-hidden',
        'rounded-[var(--theme-border-radius-lg,1rem)]',
        getBackgroundClass(),
        interactive && 'cursor-pointer',
        className
      )}
      whileHover={interactive ? { scale: 1.02 } : undefined}
      whileTap={interactive ? { scale: 0.98 } : undefined}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
}
