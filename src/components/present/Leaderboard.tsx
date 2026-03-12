import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Medal, Crown, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Student {
  id: string;
  name: string;
  emoji: string;
  points: number;
}

interface LeaderboardProps {
  students: Student[];
  isOpen: boolean;
  onClose: () => void;
}

export function Leaderboard({ students, isOpen, onClose }: LeaderboardProps) {
  // Sort students by points descending
  const sortedStudents = [...students].sort((a, b) => b.points - a.points);
  const topThree = sortedStudents.slice(0, 3);
  const rest = sortedStudents.slice(3, 10);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-400" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-300" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-muted-foreground">{rank}</span>;
    }
  };

  const getRankColors = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 border-yellow-400/50 ring-2 ring-yellow-400/30";
      case 2:
        return "bg-gradient-to-br from-gray-300/20 to-gray-500/20 border-gray-300/50";
      case 3:
        return "bg-gradient-to-br from-amber-500/20 to-amber-700/20 border-amber-500/50";
      default:
        return "bg-card/50 border-border/50";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background/90 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-card rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative bg-gradient-to-r from-primary to-accent p-6 text-center">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-white/10"
                onClick={onClose}
              >
                <X className="w-5 h-5" />
              </Button>
              
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm mb-4"
              >
                <Trophy className="w-8 h-8 text-white" />
              </motion.div>
              
              <h2 className="text-2xl font-display font-bold text-white mb-1">Leaderboard</h2>
              <p className="text-white/80 text-sm">{students.length} participants</p>
            </div>

            {/* Top 3 Podium */}
            {topThree.length > 0 && (
              <div className="px-6 py-6">
                <div className="flex items-end justify-center gap-4">
                  {/* Second Place */}
                  {topThree[1] && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="flex flex-col items-center"
                    >
                      <div className={`w-16 h-16 rounded-full ${getRankColors(2)} border-2 flex items-center justify-center text-3xl mb-2`}>
                        {topThree[1].emoji}
                      </div>
                      <p className="font-medium text-foreground text-sm truncate max-w-[80px]">{topThree[1].name}</p>
                      <p className="text-xs text-muted-foreground">{topThree[1].points} pts</p>
                      <div className="mt-2 w-20 h-16 bg-gray-300/20 rounded-t-lg flex items-center justify-center">
                        {getRankIcon(2)}
                      </div>
                    </motion.div>
                  )}

                  {/* First Place */}
                  {topThree[0] && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="flex flex-col items-center -mt-4"
                    >
                      <motion.div
                        animate={{ y: [0, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                      >
                        <Star className="w-6 h-6 text-yellow-400 mb-1" />
                      </motion.div>
                      <div className={`w-20 h-20 rounded-full ${getRankColors(1)} border-2 flex items-center justify-center text-4xl mb-2`}>
                        {topThree[0].emoji}
                      </div>
                      <p className="font-bold text-foreground truncate max-w-[100px]">{topThree[0].name}</p>
                      <p className="text-sm font-medium text-primary">{topThree[0].points} pts</p>
                      <div className="mt-2 w-24 h-24 bg-yellow-400/20 rounded-t-lg flex items-center justify-center">
                        {getRankIcon(1)}
                      </div>
                    </motion.div>
                  )}

                  {/* Third Place */}
                  {topThree[2] && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="flex flex-col items-center"
                    >
                      <div className={`w-16 h-16 rounded-full ${getRankColors(3)} border-2 flex items-center justify-center text-3xl mb-2`}>
                        {topThree[2].emoji}
                      </div>
                      <p className="font-medium text-foreground text-sm truncate max-w-[80px]">{topThree[2].name}</p>
                      <p className="text-xs text-muted-foreground">{topThree[2].points} pts</p>
                      <div className="mt-2 w-20 h-12 bg-amber-500/20 rounded-t-lg flex items-center justify-center">
                        {getRankIcon(3)}
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            )}

            {/* Rest of the list */}
            {rest.length > 0 && (
              <div className="px-6 pb-6">
                <div className="space-y-2">
                  {rest.map((student, index) => (
                    <motion.div
                      key={student.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.05 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center">
                        {getRankIcon(index + 4)}
                      </div>
                      <div className="text-2xl">{student.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{student.name}</p>
                      </div>
                      <div className="font-mono font-bold text-primary">{student.points}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {students.length === 0 && (
              <div className="px-6 py-12 text-center">
                <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No participants yet</p>
                <p className="text-sm text-muted-foreground">Students will appear here as they join</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
