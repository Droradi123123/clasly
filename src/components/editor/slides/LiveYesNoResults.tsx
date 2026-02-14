import { motion, AnimatePresence } from "framer-motion";
import { ThumbsUp, ThumbsDown, Users } from "lucide-react";

interface LiveYesNoResultsProps {
  yesCount: number;
  noCount: number;
  totalResponses: number;
}

export function LiveYesNoResults({ yesCount, noCount, totalResponses }: LiveYesNoResultsProps) {
  const hasResults = totalResponses > 0;
  const yesPercent = hasResults ? Math.round((yesCount / totalResponses) * 100) : 50;
  const noPercent = hasResults ? 100 - yesPercent : 50;

  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      {/* Main comparison bar */}
      <div className="relative h-36 md:h-44 rounded-3xl overflow-hidden bg-white/5">
        <div className="absolute inset-0 flex">
          {/* Yes side */}
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 to-green-400 relative flex items-center overflow-hidden"
            initial={{ width: '50%' }}
            animate={{ width: `${yesPercent}%` }}
            transition={{ type: "spring", stiffness: 80, damping: 20 }}
            style={{ minWidth: hasResults ? '80px' : '50%' }}
          >
            {/* Shimmer effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            />

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4 px-6 relative z-10"
            >
              <motion.div
                animate={{ rotate: [0, 10, 0], y: [0, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <ThumbsUp className="w-10 h-10 md:w-14 md:h-14 text-white" />
              </motion.div>
              <div className="text-white">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={yesPercent}
                    initial={{ scale: 1.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    className="text-4xl md:text-5xl font-bold"
                  >
                    {hasResults ? `${yesPercent}%` : '—'}
                  </motion.div>
                </AnimatePresence>
                <div className="text-lg md:text-xl font-medium text-white/80">Yes</div>
              </div>
            </motion.div>

            {/* Count badge */}
            {hasResults && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute top-3 right-3 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm"
              >
                <span className="text-white font-semibold">{yesCount}</span>
              </motion.div>
            )}
          </motion.div>

          {/* No side */}
          <motion.div
            className="h-full bg-gradient-to-l from-rose-500 to-red-400 relative flex items-center justify-end overflow-hidden"
            initial={{ width: '50%' }}
            animate={{ width: `${noPercent}%` }}
            transition={{ type: "spring", stiffness: 80, damping: 20 }}
            style={{ minWidth: hasResults ? '80px' : '50%' }}
          >
            {/* Shimmer effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-l from-transparent via-white/20 to-transparent"
              animate={{ x: ['100%', '-100%'] }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear", delay: 0.5 }}
            />

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4 px-6 relative z-10"
            >
              <div className="text-white text-right">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={noPercent}
                    initial={{ scale: 1.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    className="text-4xl md:text-5xl font-bold"
                  >
                    {hasResults ? `${noPercent}%` : '—'}
                  </motion.div>
                </AnimatePresence>
                <div className="text-lg md:text-xl font-medium text-white/80">No</div>
              </div>
              <motion.div
                animate={{ rotate: [0, -10, 0], y: [0, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
              >
                <ThumbsDown className="w-10 h-10 md:w-14 md:h-14 text-white" />
              </motion.div>
            </motion.div>

            {/* Count badge */}
            {hasResults && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm"
              >
                <span className="text-white font-semibold">{noCount}</span>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Center divider (zero state) */}
        {!hasResults && (
          <motion.div
            className="absolute left-1/2 top-0 bottom-0 w-1 bg-white/30 -translate-x-1/2"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </div>

      {/* Bottom indicator */}
      <AnimatePresence mode="wait">
        {!hasResults ? (
          <motion.div
            key="waiting"
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
              <Users className="w-6 h-6 text-white/70" />
              <span className="text-white/70 text-lg font-medium">Waiting for votes...</span>
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
        ) : (
          <motion.div
            key="total"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-8 text-center"
          >
            <motion.div
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 backdrop-blur-sm border border-white/20"
            >
              <Users className="w-5 h-5 text-white/70" />
              <span className="text-white font-semibold">{totalResponses}</span>
              <span className="text-white/70">total votes</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
