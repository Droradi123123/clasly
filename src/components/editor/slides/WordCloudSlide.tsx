import { useMemo } from "react";
import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { SlideWrapper, QuestionHeader, ActivityFooter } from "./index";
import { Slide, WordCloudSlideContent } from "@/types/slides";
import { ThemeId, getTheme } from "@/types/themes";

interface WordCloudSlideProps {
  slide: Slide;
  isEditing?: boolean;
  onUpdate?: (content: WordCloudSlideContent) => void;
  liveWords?: { text: string; count: number }[];
  totalResponses?: number;
  themeId?: ThemeId;
  hideFooter?: boolean;
}

/** Pastel palette inspired by clean word-cloud UIs (horizontal, readable) */
const PASTEL_HEX = [
  "#7c8fd9",
  "#5eb8d4",
  "#e07a8a",
  "#c4a574",
  "#9b8fd4",
  "#6ba3c8",
  "#d4a574",
  "#8ec5a8",
];

function fontSizeForRank(rank: number, total: number, maxCount: number, count: number): number {
  const rankFactor = total <= 1 ? 1 : 1 - rank / Math.max(total - 1, 1) * 0.45;
  const weightFactor = 0.5 + (count / maxCount) * 0.5;
  const base = 26;
  const scale = base + rankFactor * 22 + weightFactor * 18;
  return Math.round(Math.min(Math.max(scale, 22), 72));
}

export function WordCloudSlide({
  slide,
  isEditing = false,
  onUpdate,
  liveWords = [],
  totalResponses = 0,
  themeId = "neon-cyber",
  hideFooter = false,
}: WordCloudSlideProps) {
  const content = slide.content as WordCloudSlideContent;
  const questionText =
    typeof content.question === "string" ? content.question : "";
  const theme = useMemo(() => getTheme(themeId), [themeId]);
  const hasResults = liveWords.length > 0;

  const handleQuestionChange = (question: string) => {
    onUpdate?.({ ...content, question });
  };

  const placeholderWords = [
    { text: "creative", count: 5 },
    { text: "fast", count: 4 },
    { text: "leader", count: 4 },
    { text: "focus", count: 3 },
    { text: "bold", count: 3 },
    { text: "inspiration", count: 2 },
  ];

  const displayWords = isEditing ? placeholderWords : [...liveWords];
  const sorted = useMemo(() => {
    return [...displayWords].sort((a, b) => b.count - a.count);
  }, [displayWords]);

  const topFive = useMemo(() => sorted.slice(0, 5), [sorted]);

  const maxCount = Math.max(...sorted.map((w) => w.count), 1);

  const textColor = slide.design?.textColor || "#ffffff";

  return (
    <SlideWrapper slide={slide} themeId={themeId}>
      <div className="flex flex-col h-full min-h-0 overflow-hidden">
        <QuestionHeader
          question={questionText}
          onEdit={handleQuestionChange}
          editable={isEditing}
          subtitle={
            isEditing
              ? "Word Cloud: Participants submit words"
              : hasResults
                ? `${totalResponses} response${totalResponses === 1 ? "" : "s"} · ${sorted.length} unique word${sorted.length === 1 ? "" : "s"}`
                : undefined
          }
          textColor={textColor}
        />

        <div className="flex-1 flex items-center justify-center px-4 md:px-10 pb-3 min-h-0 overflow-hidden">
          <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row gap-4 lg:gap-6 items-stretch justify-center min-h-0">
            <motion.div
              className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 md:gap-x-6 md:gap-y-4 w-full min-w-0 flex-1 max-w-4xl px-2 py-4"
              style={{ fontFamily: theme.tokens.fontFamily }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {sorted.length > 0 ? (
                sorted.map((word, index) => {
                  const size = fontSizeForRank(
                    index,
                    sorted.length,
                    maxCount,
                    word.count
                  );
                  const color = PASTEL_HEX[index % PASTEL_HEX.length];

                  return (
                    <motion.span
                      key={`${word.text}-${index}`}
                      className="inline-block font-semibold tracking-tight leading-none whitespace-nowrap"
                      style={{
                        fontSize: `${size}px`,
                        color,
                      }}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.04, duration: 0.25 }}
                    >
                      {word.text}
                      {!isEditing && (
                        <sup
                          className="ml-1 font-semibold tabular-nums text-white/70"
                          style={{ fontSize: "0.45em" }}
                        >
                          ×{word.count}
                        </sup>
                      )}
                    </motion.span>
                  );
                })
              ) : (
                <div className="flex flex-wrap items-center justify-center gap-3 opacity-30">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-full bg-white/20"
                      style={{
                        width: `${48 + i * 12}px`,
                        height: `${20 + i * 4}px`,
                      }}
                    />
                  ))}
                </div>
              )}
            </motion.div>

            {!isEditing && hasResults && topFive.length > 0 && (
              <div className="w-full lg:w-56 shrink-0 rounded-xl border border-white/15 bg-black/25 px-3 py-3 max-h-[min(40vh,320px)] overflow-y-auto self-start">
                <p className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-2">
                  Top 5
                </p>
                <ol className="space-y-2">
                  {topFive.map((w, i) => (
                    <li
                      key={`${w.text}-${i}`}
                      className="flex items-center justify-between gap-2 text-sm text-white/95"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="text-white/40 font-mono w-4">{i + 1}</span>
                        <span className="truncate font-medium">{w.text}</span>
                      </span>
                      <span className="tabular-nums text-white/70 shrink-0">{w.count}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {!isEditing && !hasResults && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mt-4 w-full lg:col-span-2"
              >
                <motion.div
                  animate={{
                    scale: [1, 1.02, 1],
                    opacity: [0.65, 1, 0.65],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20"
                >
                  <Users className="w-5 h-5 text-white/70" />
                  <span className="text-white/70 text-base font-medium">
                    Waiting for words...
                  </span>
                </motion.div>
              </motion.div>
            )}

            {isEditing && (
              <p className="text-center text-white/55 mt-3 text-xs md:text-sm">
                Preview: words sort by frequency; larger = more responses
              </p>
            )}
          </div>
        </div>

        {!isEditing && !hideFooter && (
          <ActivityFooter
            participantCount={totalResponses}
            showTimer={false}
            isActive={true}
          />
        )}
      </div>
    </SlideWrapper>
  );
}
