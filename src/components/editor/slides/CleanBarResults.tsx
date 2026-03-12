/**
 * Clean horizontal bar chart visualization for quiz, poll, yes/no results.
 * Modern, minimal style – numbered items, colored bars on light track, count + percentage.
 */
import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";

interface CleanBarResultsProps {
  options: string[];
  results: number[];
  totalResponses: number;
  correctIndex?: number; // For quiz – which option is correct
  correctIsYes?: boolean; // For yes/no – true = Yes is correct
  isYesNo?: boolean; // Yes/no has 2 options: Yes, No
  textColor?: string;
}

const BAR_COLORS = [
  "#3B82F6", // blue
  "#1E40AF", // navy
  "#EF4444", // red
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#10B981", // emerald
];

export function CleanBarResults({
  options,
  results,
  totalResponses,
  correctIndex,
  correctIsYes,
  isYesNo = false,
  textColor = "#1f2937",
}: CleanBarResultsProps) {
  const hasResults = totalResponses > 0;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5 px-4">
      {options.map((option, index) => {
        const count = results[index] ?? 0;
        const percentage = hasResults ? Math.round((count / totalResponses) * 100) : 0;
        const color = BAR_COLORS[index % BAR_COLORS.length];
        const isCorrect =
          isYesNo
            ? (index === 0 && correctIsYes === true) || (index === 1 && correctIsYes === false)
            : correctIndex === index;

        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06, duration: 0.3 }}
            className="space-y-2"
          >
            {/* Row: number, label, count + icon */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span
                  className="text-xl md:text-2xl font-bold shrink-0 tabular-nums"
                  style={{ color: textColor }}
                >
                  {index + 1}.
                </span>
                <span
                  className="font-semibold text-base md:text-lg truncate"
                  style={{ color: textColor }}
                >
                  {option}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={`${count}-${percentage}`}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="font-bold text-lg md:text-xl tabular-nums"
                    style={{ color: textColor }}
                  >
                    {count}
                  </motion.span>
                </AnimatePresence>
                {hasResults && (
                  <span className="text-sm font-medium opacity-70" style={{ color: textColor }}>
                    ({percentage}%)
                  </span>
                )}
                {((correctIndex !== undefined) || (isYesNo && correctIsYes !== undefined)) && (
                  <span className="shrink-0">
                    {isCorrect ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <X className="w-5 h-5 text-red-500/70" />
                    )}
                  </span>
                )}
              </div>
            </div>

            {/* Bar track + fill */}
            <div className="h-3 md:h-4 rounded-full bg-white/40 dark:bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: color }}
                initial={{ width: 0 }}
                animate={{ width: hasResults ? `${Math.max(percentage, 2)}%` : "0%" }}
                transition={{
                  type: "spring",
                  stiffness: 100,
                  damping: 20,
                  delay: index * 0.05,
                }}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
