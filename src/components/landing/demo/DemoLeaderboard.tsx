import { motion } from "framer-motion";
import { Trophy, Crown, Medal } from "lucide-react";
import { DemoStudent } from "./types";

interface DemoLeaderboardProps {
  students: DemoStudent[];
}

export function DemoLeaderboard({ students }: DemoLeaderboardProps) {
  const topThree = [...students].sort((a, b) => b.points - a.points).slice(0, 3);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-3 h-3 text-yellow-400" />;
      case 2:
        return <Medal className="w-3 h-3 text-gray-300" />;
      case 3:
        return <Medal className="w-3 h-3 text-amber-600" />;
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute top-3 right-3 z-30"
    >
      <div className="bg-black/60 backdrop-blur-md rounded-lg border border-white/20 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/5 border-b border-white/10">
          <Trophy className="w-3 h-3 text-yellow-400" />
          <span className="text-[10px] font-semibold text-white">Top 3</span>
        </div>

        {/* List */}
        <div className="p-1.5 space-y-0.5">
          {topThree.map((student, index) => (
            <motion.div
              key={student.id}
              layout
              initial={{ opacity: 0, x: 5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-white/5"
            >
              <div className="w-4 flex items-center justify-center">
                {getRankIcon(index + 1)}
              </div>
              <span className="text-sm">{student.emoji}</span>
              <span className="text-[11px] text-white/90 truncate max-w-[50px] font-medium">
                {student.name}
              </span>
              <span className="text-[11px] font-mono font-bold text-yellow-400 ml-auto">
                {student.points}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
