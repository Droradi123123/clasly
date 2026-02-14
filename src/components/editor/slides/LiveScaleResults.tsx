import { motion, AnimatePresence } from "framer-motion";
import { Sliders, Users } from "lucide-react";

interface LiveScaleResultsProps {
  average: number;
  distribution: number[];
  steps: number;
  minLabel?: string;
  maxLabel?: string;
  totalResponses: number;
}

export function LiveScaleResults({
  average,
  distribution,
  steps,
  minLabel = "Not at all",
  maxLabel = "Absolutely",
  totalResponses,
}: LiveScaleResultsProps) {
  const hasResults = totalResponses > 0;
  
  // Calculate distribution per step
  const stepCounts = Array.from({ length: steps }, (_, i) => {
    return distribution.filter(v => v === i + 1).length;
  });
  const maxCount = Math.max(...stepCounts, 1);

  // Get color for step based on position
  const getStepColor = (index: number, total: number) => {
    const ratio = index / (total - 1);
    if (ratio < 0.25) return 'from-rose-500 to-red-500';
    if (ratio < 0.5) return 'from-amber-500 to-orange-500';
    if (ratio < 0.75) return 'from-lime-500 to-yellow-500';
    return 'from-emerald-500 to-green-500';
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      {/* Average indicator */}
      <AnimatePresence mode="wait">
        {hasResults ? (
          <motion.div
            key="average"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="text-center mb-10"
          >
            <motion.div
              className="inline-flex flex-col items-center px-8 py-6 rounded-3xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 backdrop-blur-sm border border-violet-400/30"
              animate={{ boxShadow: ['0 0 30px rgba(139, 92, 246, 0.2)', '0 0 50px rgba(139, 92, 246, 0.4)', '0 0 30px rgba(139, 92, 246, 0.2)'] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span className="text-white/70 text-sm font-medium uppercase tracking-wider mb-1">Average Score</span>
              <motion.span
                key={average}
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-5xl md:text-6xl font-bold text-white"
              >
                {average.toFixed(1)}
              </motion.span>
              <span className="text-white/60 text-sm mt-1">out of {steps}</span>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="waiting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center mb-10"
          >
            <motion.div
              className="inline-flex flex-col items-center px-8 py-6 rounded-3xl bg-white/5 border border-dashed border-white/20"
              animate={{ borderColor: ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.4)', 'rgba(255,255,255,0.2)'] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span className="text-white/50 text-sm font-medium uppercase tracking-wider mb-1">Average Score</span>
              <span className="text-5xl font-bold text-white/20">—</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Distribution bars */}
      <div className="relative">
        {/* Labels */}
        <div className="flex justify-between mb-4">
          <span className="text-white/60 text-sm font-medium">{minLabel}</span>
          <span className="text-white/60 text-sm font-medium">{maxLabel}</span>
        </div>

        {/* Bars */}
        <div className="flex items-end gap-2 h-40 mb-4">
          {stepCounts.map((count, index) => {
            const heightPercent = hasResults ? (count / maxCount) * 100 : 0;
            const colorGradient = getStepColor(index, steps);

            return (
              <motion.div
                key={index}
                className="flex-1 flex flex-col items-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                {/* Count label */}
                <AnimatePresence mode="wait">
                  {count > 0 && (
                    <motion.span
                      key={count}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-white font-bold text-sm mb-2"
                    >
                      {count}
                    </motion.span>
                  )}
                </AnimatePresence>

                {/* Bar */}
                <div className="w-full h-full flex items-end">
                  <motion.div
                    className={`w-full rounded-t-xl bg-gradient-to-t ${colorGradient} relative overflow-hidden`}
                    initial={{ height: 0 }}
                    animate={{ height: hasResults ? `${Math.max(heightPercent, 5)}%` : '10%' }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                    style={{ opacity: hasResults ? 1 : 0.2 }}
                  >
                    {/* Shimmer on update */}
                    <motion.div
                      key={`shimmer-${count}`}
                      initial={{ y: '100%' }}
                      animate={{ y: '-100%' }}
                      transition={{ duration: 0.5 }}
                      className="absolute inset-0 bg-gradient-to-t from-transparent via-white/30 to-transparent"
                    />
                  </motion.div>
                </div>

                {/* Step number */}
                <div className="mt-2">
                  <span className="text-white/70 font-semibold text-lg">{index + 1}</span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Average marker */}
        {hasResults && (
          <motion.div
            className="absolute bottom-12 w-full pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <motion.div
              className="absolute w-0.5 h-44 bg-white/80"
              style={{ left: `${((average - 1) / (steps - 1)) * 100}%` }}
              initial={{ height: 0 }}
              animate={{ height: '11rem' }}
              transition={{ delay: 0.3 }}
            >
              <motion.div
                className="absolute -top-6 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white text-gray-900 font-bold text-sm whitespace-nowrap"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                Avg: {average.toFixed(1)}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </div>

      {/* Waiting indicator */}
      <AnimatePresence>
        {!hasResults && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-8 text-center"
          >
            <motion.div
              animate={{ scale: [1, 1.05, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20"
            >
              <Sliders className="w-6 h-6 text-white/70" />
              <span className="text-white/70 text-lg font-medium">Waiting for ratings...</span>
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
