import { motion, AnimatePresence } from "framer-motion";
import { Target, Sparkles, Users } from "lucide-react";

interface LiveGuessResultsProps {
  guesses: number[];
  correctNumber: number;
  minRange: number;
  maxRange: number;
  totalResponses: number;
  showAnswer?: boolean;
}

export function LiveGuessResults({
  guesses,
  correctNumber,
  minRange,
  maxRange,
  totalResponses,
  showAnswer = false,
}: LiveGuessResultsProps) {
  const hasGuesses = guesses.length > 0;
  const range = maxRange - minRange;
  
  // Group guesses into buckets for visualization
  const bucketCount = 20;
  const bucketSize = range / bucketCount;
  const buckets = Array.from({ length: bucketCount }, () => 0);
  
  guesses.forEach(guess => {
    const bucketIndex = Math.min(
      Math.floor((guess - minRange) / bucketSize),
      bucketCount - 1
    );
    if (bucketIndex >= 0 && bucketIndex < bucketCount) {
      buckets[bucketIndex]++;
    }
  });
  
  const maxBucket = Math.max(...buckets, 1);
  const correctBucketIndex = Math.floor((correctNumber - minRange) / bucketSize);

  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      {/* Answer reveal box */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center mb-10"
      >
        <motion.div
          className={`
            inline-flex flex-col items-center px-10 py-8 rounded-3xl relative overflow-hidden
            ${showAnswer 
              ? 'bg-gradient-to-br from-amber-500 to-orange-500' 
              : 'bg-white/10 border-2 border-dashed border-white/30'
            }
          `}
          animate={showAnswer ? {
            boxShadow: [
              '0 0 30px rgba(245, 158, 11, 0.3)',
              '0 0 60px rgba(245, 158, 11, 0.5)',
              '0 0 30px rgba(245, 158, 11, 0.3)',
            ]
          } : {
            borderColor: ['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.5)', 'rgba(255,255,255,0.3)']
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {/* Sparkles for revealed answer */}
          {showAnswer && (
            <>
              {Array.from({ length: 8 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute"
                  style={{
                    left: `${10 + i * 12}%`,
                    top: `${20 + (i % 3) * 25}%`,
                  }}
                  animate={{
                    scale: [0.5, 1, 0.5],
                    opacity: [0.3, 1, 0.3],
                    rotate: [0, 180, 360],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.15,
                  }}
                >
                  <Sparkles className="w-4 h-4 text-white/60" />
                </motion.div>
              ))}
            </>
          )}
          
          <span className="text-white/80 text-sm font-medium uppercase tracking-wider mb-2">
            {showAnswer ? 'The Answer Is' : 'The Answer'}
          </span>
          
          <AnimatePresence mode="wait">
            {showAnswer ? (
              <motion.span
                key="answer"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                className="text-6xl md:text-7xl font-bold text-white drop-shadow-lg"
              >
                {correctNumber}
              </motion.span>
            ) : (
              <motion.span
                key="hidden"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-6xl text-white/30"
              >
                ?
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* Distribution chart */}
      <div className="relative mb-6">
        {/* Area chart style distribution */}
        <div className="h-32 flex items-end gap-0.5 relative">
          {buckets.map((count, index) => {
            const heightPercent = hasGuesses ? (count / maxBucket) * 100 : 0;
            const isCorrectBucket = index === correctBucketIndex;
            
            return (
              <motion.div
                key={index}
                className="flex-1 relative"
                initial={{ height: 0 }}
                animate={{ height: hasGuesses ? `${Math.max(heightPercent, 3)}%` : '8%' }}
                transition={{ type: "spring", stiffness: 100, damping: 20, delay: index * 0.02 }}
              >
                <motion.div
                  className={`
                    w-full h-full rounded-t-sm relative overflow-hidden
                    ${isCorrectBucket && showAnswer
                      ? 'bg-gradient-to-t from-amber-500 to-yellow-400'
                      : hasGuesses
                      ? 'bg-gradient-to-t from-indigo-500/80 to-indigo-400/80'
                      : 'bg-white/10'
                    }
                  `}
                >
                  {/* Shimmer effect */}
                  {count > 0 && (
                    <motion.div
                      key={`shimmer-${count}`}
                      initial={{ y: '100%' }}
                      animate={{ y: '-100%' }}
                      transition={{ duration: 0.4 }}
                      className="absolute inset-0 bg-gradient-to-t from-transparent via-white/30 to-transparent"
                    />
                  )}
                </motion.div>
                
                {/* Correct answer marker */}
                {isCorrectBucket && showAnswer && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -top-8 left-1/2 -translate-x-1/2"
                  >
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      <Target className="w-6 h-6 text-amber-400" />
                    </motion.div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Range labels */}
        <div className="flex justify-between mt-3">
          <span className="text-white/60 font-medium">{minRange}</span>
          <span className="text-white/60 font-medium">{Math.round((minRange + maxRange) / 2)}</span>
          <span className="text-white/60 font-medium">{maxRange}</span>
        </div>
      </div>

      {/* Waiting indicator or stats */}
      <AnimatePresence mode="wait">
        {!hasGuesses ? (
          <motion.div
            key="waiting"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-center"
          >
            <motion.div
              animate={{ scale: [1, 1.05, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20"
            >
              <Target className="w-6 h-6 text-white/70" />
              <span className="text-white/70 text-lg font-medium">Waiting for guesses...</span>
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
            key="stats"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex justify-center gap-6"
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
              <Users className="w-4 h-4 text-white/70" />
              <span className="text-white/70">{totalResponses} guesses</span>
            </div>
            {showAnswer && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 border border-green-400/30"
              >
                <Target className="w-4 h-4 text-green-400" />
                <span className="text-green-300">
                  {guesses.filter(g => g === correctNumber).length} correct!
                </span>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
