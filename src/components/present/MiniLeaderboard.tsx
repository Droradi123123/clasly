import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Crown, Medal } from "lucide-react";

interface Student {
  id: string;
  name: string;
  emoji: string;
  points: number;
}

interface MiniLeaderboardProps {
  students: Student[];
  isVisible: boolean;
}

export function MiniLeaderboard({ students, isVisible }: MiniLeaderboardProps) {
  // Sort students by points descending and take top 5
  const topFive = [...students]
    .sort((a, b) => b.points - a.points)
    .slice(0, 5);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-3 h-3 text-yellow-400" />;
      case 2:
        return <Medal className="w-3 h-3 text-gray-300" />;
      case 3:
        return <Medal className="w-3 h-3 text-amber-600" />;
      default:
        return <span className="text-xs font-bold text-white/60">{rank}</span>;
    }
  };

  if (!isVisible || topFive.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="fixed top-20 right-4 z-40"
      >
        <div className="bg-black/60 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden min-w-[140px]">
          {/* Header */}
          <div className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border-b border-white/10">
            <Trophy className="w-3 h-3 text-yellow-400" />
            <span className="text-xs font-medium text-white/80">Top 5</span>
          </div>

          {/* List */}
          <div className="p-1.5 space-y-0.5">
            {topFive.map((student, index) => (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                <div className="w-4 flex items-center justify-center">
                  {getRankIcon(index + 1)}
                </div>
                <span className="text-sm">{student.emoji}</span>
                <span className="text-xs text-white/80 truncate max-w-[60px] flex-1">
                  {student.name}
                </span>
                <span className="text-xs font-mono font-bold text-yellow-400/90">
                  {student.points}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
