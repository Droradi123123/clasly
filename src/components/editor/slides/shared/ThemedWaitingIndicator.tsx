import { motion } from 'framer-motion';
import { Users, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThemedWaitingIndicatorProps {
  message?: string;
  variant?: 'dots' | 'spinner' | 'pulse';
  className?: string;
}

export function ThemedWaitingIndicator({
  message = 'Waiting for responses...',
  variant = 'dots',
  className,
}: ThemedWaitingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('text-center', className)}
    >
      <motion.div
        animate={{
          scale: [1, 1.03, 1],
          opacity: [0.6, 1, 0.6],
        }}
        transition={{ duration: 2, repeat: Infinity }}
        className="inline-flex items-center gap-3 px-5 py-3 rounded-[var(--theme-border-radius-lg,1rem)] bg-white/10 backdrop-blur-sm border border-white/20"
      >
        <Users className="w-5 h-5 text-white/70" />
        <span className="text-white/70 text-base font-medium">{message}</span>
        
        {variant === 'dots' && (
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-[hsl(var(--theme-accent)/0.7)]"
                animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        )}
        
        {variant === 'spinner' && (
          <Loader2 className="w-5 h-5 text-[hsl(var(--theme-accent))] animate-spin" />
        )}
        
        {variant === 'pulse' && (
          <motion.div
            className="w-3 h-3 rounded-full bg-[hsl(var(--theme-accent))]"
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </motion.div>
    </motion.div>
  );
}
