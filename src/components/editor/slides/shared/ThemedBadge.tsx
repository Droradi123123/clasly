import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ThemedBadgeProps {
  value: number | string;
  label?: string;
  variant?: 'count' | 'percentage' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
  className?: string;
}

export function ThemedBadge({
  value,
  label,
  variant = 'count',
  size = 'md',
  animate = true,
  className,
}: ThemedBadgeProps) {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-xs px-2 py-0.5';
      case 'lg':
        return 'text-lg px-4 py-2';
      default:
        return 'text-sm px-3 py-1';
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'percentage':
        return 'bg-white/20 text-white';
      case 'accent':
        return 'bg-[hsl(var(--theme-accent))] text-white';
      default:
        return 'bg-white/10 text-white/80';
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={value}
        initial={animate ? { scale: 1.5, opacity: 0 } : false}
        animate={{ scale: 1, opacity: 1 }}
        exit={animate ? { scale: 0.5, opacity: 0 } : undefined}
        className={cn(
          'inline-flex items-center gap-1 font-bold rounded-full',
          'rounded-[var(--theme-border-radius,0.5rem)]',
          getSizeClasses(),
          getVariantClasses(),
          className
        )}
      >
        <span>{value}</span>
        {label && <span className="font-normal opacity-70">{label}</span>}
      </motion.span>
    </AnimatePresence>
  );
}
