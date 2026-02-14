import type React from "react";
import { motion } from "framer-motion";
import { AutoResizeTextarea } from "@/components/ui/AutoResizeTextarea";

interface QuestionHeaderProps {
  question: string;
  onEdit?: (value: string) => void;
  editable?: boolean;
  subtitle?: string;
  textColor?: string;
}

export function QuestionHeader({
  question,
  onEdit,
  editable = false,
  subtitle,
  textColor = "#ffffff",
}: QuestionHeaderProps) {
  const alignVar =
    "var(--slide-text-align)" as unknown as React.CSSProperties["textAlign"];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-4 md:px-8 py-3 md:py-4 relative flex-shrink-0"
      style={{ textAlign: alignVar }}
    >
      {/* Question */}
      {editable ? (
        <AutoResizeTextarea
          value={question}
          onChange={(e) => onEdit?.(e.target.value)}
          className="slide-question w-full font-bold bg-transparent border-0 outline-none placeholder:opacity-50 drop-shadow-lg"
          placeholder="Enter your question..."
          minRows={2}
          style={{ color: textColor, textAlign: alignVar }}
        />
      ) : (
        <motion.h2
          className="slide-question font-bold drop-shadow-lg leading-tight"
          style={{ wordBreak: "break-word", color: textColor, textAlign: alignVar }}
        >
          {question}
        </motion.h2>
      )}

      {/* Subtitle */}
      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-1 text-xs md:text-sm"
          style={{ color: textColor, opacity: 0.6 }}
        >
          {subtitle}
        </motion.p>
      )}
    </motion.div>
  );
}
