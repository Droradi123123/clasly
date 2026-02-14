import { motion } from "framer-motion";

interface ResultsBarChartProps {
  options: string[];
  results: number[]; // percentages or counts
  showPercentage?: boolean;
  highlightIndex?: number;
  animated?: boolean;
}

// Colors for bars
const BAR_COLORS = [
  'from-rose-500 to-pink-500',
  'from-blue-500 to-cyan-500',
  'from-amber-500 to-orange-500',
  'from-emerald-500 to-teal-500',
  'from-violet-500 to-purple-500',
  'from-fuchsia-500 to-pink-500',
];

export function ResultsBarChart({
  options,
  results,
  showPercentage = true,
  highlightIndex,
  animated = true,
}: ResultsBarChartProps) {
  const maxResult = Math.max(...results, 1);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 px-6">
      {options.map((option, index) => {
        const percentage = results[index] || 0;
        const width = (percentage / maxResult) * 100;
        const isHighlighted = highlightIndex === index;
        const colorClass = BAR_COLORS[index % BAR_COLORS.length];

        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`relative ${isHighlighted ? 'scale-105' : ''} transition-transform`}
          >
            {/* Option label */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-medium text-lg">{option}</span>
              {showPercentage && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="text-white/80 font-bold text-lg"
                >
                  {percentage}%
                </motion.span>
              )}
            </div>

            {/* Bar background */}
            <div className="h-12 rounded-xl bg-white/10 overflow-hidden backdrop-blur-sm border border-white/20">
              {/* Animated bar */}
              <motion.div
                initial={animated ? { width: 0 } : { width: `${width}%` }}
                animate={{ width: `${width}%` }}
                transition={{ 
                  duration: 1, 
                  delay: 0.3 + index * 0.1,
                  ease: "easeOut" 
                }}
                className={`h-full bg-gradient-to-r ${colorClass} relative`}
              >
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-transparent" />
                
                {/* Highlight ring */}
                {isHighlighted && (
                  <motion.div
                    className="absolute inset-0 ring-2 ring-white rounded-xl"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  />
                )}
              </motion.div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
