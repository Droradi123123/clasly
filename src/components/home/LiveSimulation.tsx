import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Users, MessageCircle, ThumbsUp, BarChart3 } from "lucide-react";

const emojis = ["👍", "❤️", "🎉", "🤔", "💡", "👏"];

const LiveSimulation = () => {
  const [activeEmoji, setActiveEmoji] = useState(0);
  const [studentCount, setStudentCount] = useState(127);

  useEffect(() => {
    const emojiInterval = setInterval(() => {
      setActiveEmoji((prev) => (prev + 1) % emojis.length);
    }, 2000);

    const countInterval = setInterval(() => {
      setStudentCount((prev) => prev + Math.floor(Math.random() * 3));
    }, 3000);

    return () => {
      clearInterval(emojiInterval);
      clearInterval(countInterval);
    };
  }, []);

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* Main Slide Preview */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="bg-card rounded-2xl shadow-xl overflow-hidden border border-border/50"
      >
        {/* Slide Header */}
        <div className="bg-gradient-primary px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-primary-foreground/30" />
            <div className="w-3 h-3 rounded-full bg-primary-foreground/30" />
            <div className="w-3 h-3 rounded-full bg-primary-foreground/30" />
          </div>
          <div className="flex items-center gap-4 text-primary-foreground">
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4" />
              <span className="font-medium">{studentCount}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MessageCircle className="w-4 h-4" />
              <span className="font-medium">24</span>
            </div>
          </div>
        </div>

        {/* Slide Content */}
        <div className="p-8 md:p-12 min-h-[300px] flex flex-col items-center justify-center text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-2xl md:text-4xl font-display font-bold text-foreground mb-4"
          >
            What's your favorite learning style?
          </motion.h2>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-2 gap-4 mt-6 w-full max-w-md"
          >
            {["Visual", "Auditory", "Reading", "Kinesthetic"].map((option, index) => (
              <motion.div
                key={option}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  index === 0 
                    ? "border-primary bg-primary/10 shadow-md" 
                    : "border-border bg-muted/50 hover:border-primary/50"
                }`}
              >
                <span className="font-medium text-foreground">{option}</span>
                {index === 0 && (
                  <div className="mt-2 h-2 bg-primary/20 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "65%" }}
                      transition={{ delay: 1, duration: 0.8 }}
                      className="h-full bg-primary rounded-full"
                    />
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Reactions Bar */}
        <div className="bg-muted/50 px-6 py-4 flex items-center justify-between border-t border-border/50">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Live Results</span>
          </div>
          <div className="flex items-center gap-3">
            {emojis.map((emoji, index) => (
              <motion.button
                key={emoji}
                animate={{ 
                  scale: activeEmoji === index ? 1.3 : 1,
                  y: activeEmoji === index ? -5 : 0 
                }}
                className="text-xl hover:scale-125 transition-transform"
              >
                {emoji}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Floating Reactions */}
      <div className="absolute -right-4 top-1/4 space-y-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }}
            className="w-12 h-12 bg-card rounded-full shadow-lg flex items-center justify-center text-2xl border border-border/50"
          >
            {emojis[(activeEmoji + i) % emojis.length]}
          </motion.div>
        ))}
      </div>

      {/* Engagement Stats */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.8 }}
        className="absolute -left-4 bottom-1/4 bg-card p-4 rounded-xl shadow-lg border border-border/50"
      >
        <div className="flex items-center gap-2 text-success mb-1">
          <ThumbsUp className="w-4 h-4" />
          <span className="text-sm font-medium">94% Engaged</span>
        </div>
        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "94%" }}
            transition={{ delay: 1, duration: 1 }}
            className="h-full bg-success rounded-full"
          />
        </div>
      </motion.div>
    </div>
  );
};

export default LiveSimulation;
