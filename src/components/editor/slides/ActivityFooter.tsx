import { motion } from "framer-motion";
import { Users, Clock, BarChart3 } from "lucide-react";

interface ActivityFooterProps {
  participantCount?: number;
  timeRemaining?: number;
  showTimer?: boolean;
  isActive?: boolean;
}

export function ActivityFooter({
  participantCount = 0,
  timeRemaining = 60,
  showTimer = true,
  isActive = true,
}: ActivityFooterProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute bottom-0 left-0 right-0 p-4"
    >
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        {/* Participants */}
        <motion.div
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30"
          whileHover={{ scale: 1.05 }}
        >
          <Users className="w-4 h-4 text-white" />
          <span className="text-white font-medium">{participantCount} participants</span>
        </motion.div>

        {/* Timer */}
        {showTimer && (
          <motion.div
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm border
              ${timeRemaining <= 10 
                ? 'bg-red-500/30 border-red-400/50 animate-pulse' 
                : 'bg-white/20 border-white/30'
              }
            `}
            animate={timeRemaining <= 10 ? { scale: [1, 1.05, 1] } : {}}
            transition={{ repeat: Infinity, duration: 0.5 }}
          >
            <Clock className="w-4 h-4 text-white" />
            <span className="text-white font-medium font-mono">{formatTime(timeRemaining)}</span>
          </motion.div>
        )}

        {/* Live indicator */}
        {isActive && (
          <motion.div
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/30 backdrop-blur-sm border border-green-400/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="w-2 h-2 rounded-full bg-green-400"
              animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
            <span className="text-white font-medium">Live</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
