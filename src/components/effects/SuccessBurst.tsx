import { motion, AnimatePresence } from "framer-motion";
import { Check, Star, Sparkles, Trophy, Zap } from "lucide-react";

interface SuccessBurstProps {
  isActive: boolean;
  message?: string;
  variant?: 'correct' | 'achievement' | 'celebration';
}

export function SuccessBurst({ isActive, message = "Correct!", variant = 'correct' }: SuccessBurstProps) {
  const icons = {
    correct: Check,
    achievement: Trophy,
    celebration: Star,
  };
  
  const Icon = icons[variant];
  
  const colors = {
    correct: 'from-emerald-400 to-green-500',
    achievement: 'from-amber-400 to-yellow-500',
    celebration: 'from-violet-400 to-purple-500',
  };

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          className="fixed inset-0 flex items-center justify-center z-40 pointer-events-none"
        >
          {/* Radial burst */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 3, opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`absolute w-40 h-40 rounded-full bg-gradient-to-r ${colors[variant]}`}
          />

          {/* Floating sparkles */}
          {Array.from({ length: 12 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
              animate={{
                scale: [0, 1, 0],
                x: Math.cos((i / 12) * Math.PI * 2) * 150,
                y: Math.sin((i / 12) * Math.PI * 2) * 150,
                opacity: [1, 1, 0],
              }}
              transition={{ duration: 0.8, delay: i * 0.03 }}
              className="absolute"
            >
              <Sparkles className="w-6 h-6 text-yellow-400" />
            </motion.div>
          ))}

          {/* Main icon */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 }}
            className={`w-32 h-32 rounded-full bg-gradient-to-br ${colors[variant]} flex items-center justify-center shadow-2xl`}
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: 3, duration: 0.3 }}
            >
              <Icon className="w-16 h-16 text-white" />
            </motion.div>
          </motion.div>

          {/* Message */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="absolute top-[60%] text-center"
          >
            <h2 className="text-4xl font-bold text-white drop-shadow-lg">{message}</h2>
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="flex items-center justify-center gap-2 mt-2"
            >
              <Zap className="w-5 h-5 text-yellow-400" />
              <span className="text-xl text-white/80">+10 Points</span>
              <Zap className="w-5 h-5 text-yellow-400" />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
