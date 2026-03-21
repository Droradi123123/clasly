import { motion, AnimatePresence } from "framer-motion";
import { Users } from "lucide-react";

interface LiveResultsBarChartProps {
  options: string[];
  results: number[]; // raw counts
  totalResponses: number;
  highlightIndex?: number;
  showPercentage?: boolean;
}

// Bold, vibrant color palette inspired by Mentimeter
const BAR_COLORS = [
  { bg: 'bg-indigo-600', gradient: 'from-indigo-600 to-indigo-500' },
  { bg: 'bg-rose-500', gradient: 'from-rose-500 to-pink-500' },
  { bg: 'bg-sky-500', gradient: 'from-sky-500 to-cyan-500' },
  { bg: 'bg-amber-500', gradient: 'from-amber-500 to-yellow-500' },
  { bg: 'bg-emerald-500', gradient: 'from-emerald-500 to-green-500' },
  { bg: 'bg-violet-500', gradient: 'from-violet-500 to-purple-500' },
];

export function LiveResultsBarChart({
  options,
  results,
  totalResponses,
  highlightIndex,
  showPercentage = true,
}: LiveResultsBarChartProps) {
  const maxResult = Math.max(...results, 1);
  const hasResults = totalResponses > 0;

  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      {/* Options with bars */}
      <div className="space-y-6">
        {options.map((option, index) => {
          const count = results[index] || 0;
          const percentage = totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0;
          const widthPercent = hasResults ? (count / maxResult) * 100 : 0;
          const colorSet = BAR_COLORS[index % BAR_COLORS.length];
          const isHighlighted = highlightIndex === index;

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1, type: "spring", stiffness: 200 }}
              className="relative"
            >
              {/* Option label and count */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-semibold text-lg md:text-xl">{option}</span>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={count}
                    initial={{ scale: 1.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    className="text-white font-bold text-xl md:text-2xl"
                  >
                    {count}
                  </motion.span>
                </AnimatePresence>
              </div>

              {/* Bar container */}
              <div className="relative h-14 md:h-16 rounded-2xl bg-white/10 overflow-hidden">
                {/* Zero-state placeholder */}
                {!hasResults && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <motion.div
                      animate={{ opacity: [0.3, 0.5, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className={`h-full w-0 rounded-2xl bg-gradient-to-r ${colorSet.gradient}`}
                      style={{ minWidth: '8px' }}
                    />
                  </motion.div>
                )}

                {/* Animated bar */}
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${widthPercent}%` }}
                  transition={{ 
                    type: "spring",
                    stiffness: 100,
                    damping: 20,
                  }}
                  className={`h-full bg-gradient-to-r ${colorSet.gradient} relative rounded-2xl`}
                  style={{ minWidth: hasResults && count > 0 ? '20px' : '0' }}
                >
                  {/* Shine effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-transparent rounded-2xl"
                  />
                  
                  {/* Shimmer animation when new vote comes in */}
                  <motion.div
                    key={`shimmer-${count}`}
                    initial={{ x: '-100%' }}
                    animate={{ x: '200%' }}
                    transition={{ duration: 0.6 }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                  />

                  {/* Percentage inside bar */}
                  {showPercentage && hasResults && widthPercent > 20 && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/90 font-bold text-sm md:text-base"
                    >
                      {percentage}%
                    </motion.span>
                  )}
                </motion.div>

                {/* Percentage outside bar for small bars */}
                {showPercentage && hasResults && widthPercent <= 20 && widthPercent > 0 && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute left-24 top-1/2 -translate-y-1/2 text-white/70 font-bold text-sm"
                  >
                    {percentage}%
                  </motion.span>
                )}

                {/* Highlight effect for correct answer */}
                {isHighlighted && (
                  <motion.div
                    className="absolute inset-0 rounded-2xl ring-4 ring-green-400 ring-offset-2 ring-offset-transparent"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: [0.5, 1, 0.5], scale: 1 }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Zero-state waiting indicator */}
      <AnimatePresence>
        {!hasResults && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-10 text-center"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.05, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <Users className="w-6 h-6 text-white/70" />
              </motion.div>
              <span className="text-white/70 text-lg font-medium">Waiting for responses...</span>
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-white/50"
                    animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
