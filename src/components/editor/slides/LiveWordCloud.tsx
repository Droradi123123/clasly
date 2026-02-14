import { motion, AnimatePresence } from "framer-motion";
import { Cloud, MessageCircle } from "lucide-react";

interface Word {
  text: string;
  count: number;
}

interface LiveWordCloudProps {
  words: Word[];
  totalResponses: number;
}

// Vibrant color palette
const WORD_COLORS = [
  '#6366F1', // indigo
  '#EC4899', // pink
  '#F59E0B', // amber
  '#10B981', // emerald
  '#8B5CF6', // violet
  '#3B82F6', // blue
  '#EF4444', // red
  '#14B8A6', // teal
];

export function LiveWordCloud({ words, totalResponses }: LiveWordCloudProps) {
  const hasWords = words.length > 0;
  const maxCount = Math.max(...words.map(w => w.count), 1);
  const minCount = Math.min(...words.map(w => w.count), 1);

  // Calculate font size based on word frequency
  const getFontSize = (count: number) => {
    if (!hasWords) return 24;
    const minSize = 16;
    const maxSize = 72;
    const ratio = (count - minCount) / (maxCount - minCount || 1);
    return minSize + ratio * (maxSize - minSize);
  };

  // Get stable color for word based on text hash
  const getWordColor = (text: string) => {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    return WORD_COLORS[Math.abs(hash) % WORD_COLORS.length];
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center px-6 py-4">
      <AnimatePresence mode="wait">
        {hasWords ? (
          <motion.div
            key="words"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative w-full max-w-4xl min-h-[300px] flex flex-wrap items-center justify-center gap-4 p-8"
          >
            <AnimatePresence>
              {words
                .sort((a, b) => b.count - a.count)
                .slice(0, 30)
                .map((word, index) => {
                  const fontSize = getFontSize(word.count);
                  const color = getWordColor(word.text);
                  const rotation = (Math.sin(index * 1.5) * 10);

                  return (
                    <motion.div
                      key={word.text}
                      initial={{ opacity: 0, scale: 0, rotate: -180 }}
                      animate={{ 
                        opacity: 1, 
                        scale: 1, 
                        rotate: rotation,
                      }}
                      exit={{ opacity: 0, scale: 0 }}
                      transition={{ 
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                        delay: index * 0.03,
                      }}
                      whileHover={{ 
                        scale: 1.2, 
                        zIndex: 10,
                        rotate: 0,
                      }}
                      className="relative cursor-default select-none"
                      style={{ 
                        fontSize: `${fontSize}px`,
                        color,
                        textShadow: `0 0 20px ${color}40`,
                      }}
                    >
                      <motion.span
                        className="font-bold"
                        animate={{
                          y: [0, -3, 0],
                        }}
                        transition={{
                          duration: 2 + index * 0.1,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      >
                        {word.text}
                      </motion.span>
                      
                      {/* Count badge on hover */}
                      <motion.span
                        initial={{ opacity: 0, scale: 0.5 }}
                        whileHover={{ opacity: 1, scale: 1 }}
                        className="absolute -top-2 -right-2 text-xs bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5 text-white font-medium"
                      >
                        {word.count}
                      </motion.span>
                    </motion.div>
                  );
                })}
            </AnimatePresence>
          </motion.div>
        ) : (
          /* Zero-state: Elegant empty cloud placeholder */
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative w-full max-w-2xl"
          >
            {/* Cloud shape with animated border */}
            <motion.div
              className="relative mx-auto w-80 h-48 flex flex-col items-center justify-center"
            >
              {/* Animated cloud background */}
              <motion.div
                className="absolute inset-0 rounded-[60px] bg-white/5 border-2 border-dashed border-white/20"
                animate={{
                  borderColor: ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.4)', 'rgba(255,255,255,0.2)'],
                }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              
              {/* Floating placeholder words */}
              <div className="relative z-10 flex flex-wrap items-center justify-center gap-3 px-6">
                {['word', 'answers', 'ideas'].map((placeholder, i) => (
                  <motion.span
                    key={placeholder}
                    className="text-white/20 font-bold"
                    style={{ fontSize: `${24 - i * 4}px` }}
                    animate={{
                      opacity: [0.1, 0.3, 0.1],
                      y: [0, -5, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.3,
                    }}
                  >
                    {placeholder}
                  </motion.span>
                ))}
              </div>
            </motion.div>

            {/* Waiting message */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-8 text-center"
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
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <MessageCircle className="w-6 h-6 text-white/70" />
                </motion.div>
                <span className="text-white/70 text-lg font-medium">Waiting for words...</span>
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Response counter */}
      {hasWords && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
            <span className="text-white/70">{totalResponses} words submitted</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
