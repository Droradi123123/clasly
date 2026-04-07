import type React from "react";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { AutoResizeTextarea } from "@/components/ui/AutoResizeTextarea";
import { FormattedText } from "@/components/editor/FormattedText";

interface QuestionHeaderProps {
  question: string;
  onEdit?: (value: string) => void;
  editable?: boolean;
  subtitle?: string;
  textColor?: string;
  /** Extra classes on the outer wrapper (e.g. tighter padding on quiz slides) */
  className?: string;
}

export function QuestionHeader({
  question,
  onEdit,
  editable = false,
  subtitle,
  textColor = "#ffffff",
  className,
}: QuestionHeaderProps) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const alignVar =
    "var(--slide-text-align)" as unknown as React.CSSProperties["textAlign"];

  useEffect(() => {
    if (focused && inputRef.current) inputRef.current.focus();
  }, [focused]);

  const showFormatted = !editable || !focused;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`px-4 md:px-8 py-3 md:py-4 relative flex-shrink-0 ${className ?? ""}`}
      style={{ textAlign: alignVar }}
    >
      {/* Question: when editable and not focused show FormattedText (bold visible); click to edit */}
      {showFormatted ? (
        <motion.h2
          className="slide-question w-full font-bold bg-transparent border-0 outline-none drop-shadow-lg leading-tight cursor-text min-h-[2.5rem]"
          style={{ wordBreak: "break-word", color: textColor, textAlign: alignVar }}
          onClick={() => editable && setFocused(true)}
        >
          <FormattedText>{String(question || "")}</FormattedText>
        </motion.h2>
      ) : (
        <AutoResizeTextarea
          ref={inputRef}
          value={question}
          onChange={(e) => onEdit?.(e.target.value)}
          onBlur={() => setFocused(false)}
          className="slide-question w-full font-bold bg-transparent border-0 outline-none placeholder:opacity-50 drop-shadow-lg"
          placeholder="Enter your question..."
          minRows={2}
          style={{ color: textColor, textAlign: alignVar }}
        />
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
