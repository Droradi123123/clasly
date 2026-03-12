import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ThemedProgressBarProps {
  value: number; // 0-100
  variant?: 'accent' | 'success' | 'gradient';
  showGlow?: boolean;
  className?: string;
  height?: 'sm' | 'md' | 'lg';
  animate?: boolean;
}

export function ThemedProgressBar({
  value,
  variant = 'accent',
  showGlow = false,
  className,
  height = 'md',
  animate = true,
}: ThemedProgressBarProps) {
  const getBarColor = () => {
    switch (variant) {
      case 'success':
        return 'bg-emerald-500';
      case 'gradient':
        return 'bg-gradient-to-r from-[hsl(var(--theme-accent))] to-[hsl(var(--theme-accent-secondary))]';
      default:
        return 'bg-[hsl(var(--theme-accent))]';
    }
  };

  const getHeight = () => {
    switch (height) {
      case 'sm':
        return 'h-1';
      case 'lg':
        return 'h-3';
      default:
        return 'h-2';
    }
  };

  return (
    <div
      className={cn(
        'w-full rounded-full overflow-hidden bg-white/10',
        getHeight(),
        className
      )}
    >
      <motion.div
        className={cn(
          'h-full rounded-full',
          getBarColor(),
          showGlow && 'shadow-[0_0_10px_var(--theme-shadow-color)]'
        )}
        initial={animate ? { width: 0 } : { width: `${value}%` }}
        animate={{ width: `${value}%` }}
        transition={
          animate
            ? { type: 'spring', stiffness: 100, damping: 20 }
            : { duration: 0.3 }
        }
      />
    </div>
  );
}
