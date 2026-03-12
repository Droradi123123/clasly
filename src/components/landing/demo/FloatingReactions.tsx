import { motion, AnimatePresence } from "framer-motion";
import { FloatingEmoji } from "./types";

interface FloatingReactionsProps {
  reactions: FloatingEmoji[];
}

export function FloatingReactions({ reactions }: FloatingReactionsProps) {
  return (
    <AnimatePresence>
      {reactions.map((reaction) => (
        <motion.div
          key={reaction.id}
          initial={{
            left: reaction.startX,
            bottom: reaction.startY,
            scale: 1,
            opacity: 1,
          }}
          animate={{
            left: [reaction.startX, reaction.startX - 20, reaction.startX + 10, "50%"],
            bottom: [reaction.startY, reaction.startY + 50, reaction.startY + 100, "80%"],
            scale: [1, 1.3, 1.1, 0.8],
            opacity: [1, 1, 0.8, 0],
          }}
          exit={{ opacity: 0 }}
          transition={{
            duration: 1.5,
            ease: "easeOut",
          }}
          className="absolute pointer-events-none z-50 text-2xl"
        >
          {reaction.emoji}
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
