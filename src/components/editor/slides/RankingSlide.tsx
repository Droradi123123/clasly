import { motion, AnimatePresence } from "framer-motion";
import { GripVertical, Plus, Trash2, Users } from "lucide-react";
import { SlideWrapper, QuestionHeader, ActivityFooter } from "./index";
import { Slide, RankingSlideContent } from "@/types/slides";
import { ThemeId, getTheme } from "@/types/themes";
import { DesignStyleId, getDesignStyle } from "@/types/designStyles";
import { Button } from "@/components/ui/button";

export interface RankingSlideProps {
  slide: Slide;
  isEditing?: boolean;
  onUpdate?: (content: RankingSlideContent) => void;
  liveResults?: { rankings: { item: string; avgRank: number }[] };
  totalResponses?: number;
  themeId?: ThemeId;
  designStyleId?: DesignStyleId;
  hideFooter?: boolean;
  showCorrectAnswer?: boolean;
}

const ITEM_COLORS = [
  'from-violet-500 to-purple-500', 
  'from-blue-500 to-cyan-500', 
  'from-emerald-500 to-teal-500', 
  'from-amber-500 to-orange-500', 
  'from-rose-500 to-pink-500',
  'from-indigo-500 to-blue-500'
];

export function RankingSlide({ 
  slide, 
  isEditing = false, 
  onUpdate, 
  liveResults,
  totalResponses = 0,
  themeId = 'neon-cyber',
  designStyleId = 'dynamic',
  hideFooter = false,
  showCorrectAnswer = false,
}: RankingSlideProps) {
  const content = slide.content as RankingSlideContent;
  const theme = getTheme(themeId);
  const designStyle = getDesignStyle(designStyleId);
  const styleConfig = designStyle.config;

  const hasResults = totalResponses > 0;

  const sortedRankings =
    hasResults && liveResults?.rankings?.length
      ? [...liveResults.rankings].sort((a, b) => a.avgRank - b.avgRank)
      : null;

  const displayItems = sortedRankings
    ? sortedRankings.map((r) => r.item)
    : content.items;

  const answerKey =
    content.correctOrder && content.correctOrder.length === content.items.length
      ? content.correctOrder
      : content.items;

  const canCompare =
    !!showCorrectAnswer &&
    answerKey.length === displayItems.length &&
    answerKey.every((item) => content.items.includes(item));

  const handleQuestionChange = (q: string) => {
    onUpdate?.({ ...content, question: q });
  };

  const handleItemChange = (index: number, value: string) => {
    const newItems = [...content.items];
    newItems[index] = value;
    onUpdate?.({ ...content, items: newItems });
  };

  const addItem = () => {
    if (content.items.length < 6) {
      onUpdate?.({ ...content, items: [...content.items, `Item ${content.items.length + 1}`] });
    }
  };

  const removeItem = (index: number) => {
    if (content.items.length > 2) {
      const newItems = content.items.filter((_, i) => i !== index);
      onUpdate?.({ ...content, items: newItems });
    }
  };

  // Get text color from slide design
  const textColor = slide.design?.textColor || '#ffffff';

  return (
    <SlideWrapper slide={slide} themeId={themeId}>
      <div className="flex flex-col h-full min-h-0 overflow-hidden">
        <QuestionHeader 
          question={content.question} 
          onEdit={handleQuestionChange} 
          editable={isEditing} 
          subtitle={
            isEditing
              ? "Ranking: Order items by importance"
              : hasResults
                ? `${totalResponses} ranking${totalResponses === 1 ? "" : "s"} · audience consensus below`
                : undefined
          }
          textColor={textColor}
        />
        
        <div className="flex-1 flex items-center justify-center px-4 md:px-6 pb-4 min-h-0 overflow-y-auto">
          <div className="w-full max-w-lg max-h-full space-y-2 md:space-y-3">
            {displayItems.map((item, index) => {
              const originalIndex = content.items.indexOf(item);
              const colorIndex = isEditing ? index : originalIndex;
              const avgRank = sortedRankings?.find((r) => r.item === item)?.avgRank;
              const wrongSlot = canCompare && answerKey[index] !== item;
              
              return (
                <motion.div 
                  key={isEditing ? index : item} 
                  layout
                  initial={{ opacity: 0, x: -20 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  transition={{ 
                    delay: index * 0.08,
                    layout: { type: "spring", stiffness: 300, damping: 30 }
                  }} 
                  className="relative group"
                >
                  <motion.div
                    className={`
                      flex items-center gap-3 p-3 md:p-4 rounded-2xl 
                      bg-gradient-to-r ${ITEM_COLORS[colorIndex % ITEM_COLORS.length]} 
                      shadow-lg border-2
                      ${wrongSlot ? "border-amber-400 ring-2 ring-amber-400/40" : "border-white/20"}
                    `}
                    whileHover={!isEditing ? { scale: 1.01, x: 5 } : undefined}
                    style={{ fontFamily: theme.tokens.fontFamily }}
                  >
                    {/* Rank number */}
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold text-base md:text-lg text-white flex-shrink-0">
                      {index + 1}
                    </div>
                    
                    {/* Drag handle — editor only (students rank on phone) */}
                    {isEditing && (
                      <GripVertical className="w-4 h-4 md:w-5 md:h-5 text-white/60 flex-shrink-0" />
                    )}
                    
                    {/* Item text - editable */}
                    {isEditing ? (
                      <input 
                        value={content.items[index]} 
                        onChange={(e) => handleItemChange(index, e.target.value)} 
                        className="flex-1 bg-transparent text-white font-semibold outline-none text-sm md:text-base min-w-0"
                        placeholder={`Item ${index + 1}`}
                      />
                    ) : (
                      <span className="flex-1 text-white font-semibold text-sm md:text-base truncate">
                        {item}
                      </span>
                    )}

                    {/* Live rank indicator */}
                    {!isEditing && hasResults && avgRank != null && (
                      <div className="flex flex-col items-end gap-0.5 text-white/85 text-xs md:text-sm flex-shrink-0 tabular-nums">
                        <span>Avg rank {avgRank.toFixed(1)}</span>
                        {wrongSlot && (
                          <span className="text-amber-200 font-semibold">Not in answer position</span>
                        )}
                      </div>
                    )}
                  </motion.div>

                  {/* Delete button - editor only */}
                  {isEditing && content.items.length > 2 && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => removeItem(index)}
                      className="absolute -right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 text-red-500 hover:bg-red-100 flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </motion.button>
                  )}
                </motion.div>
              );
            })}

            {/* Add item button - editor only */}
            {isEditing && content.items.length < 6 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 text-center"
              >
                <Button
                  variant="outline"
                  onClick={addItem}
                  size="sm"
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </motion.div>
            )}

            {!isEditing && showCorrectAnswer && answerKey.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-4"
              >
                <p className="text-emerald-200 text-sm font-semibold mb-2">Correct order</p>
                <ol className="space-y-2">
                  {answerKey.map((line, i) => (
                    <li
                      key={`${line}-${i}`}
                      className="flex items-center gap-2 text-white/95 text-sm md:text-base"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/15 font-bold tabular-nums">
                        {i + 1}
                      </span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ol>
              </motion.div>
            )}

            {/* Waiting indicator */}
            {!isEditing && !hasResults && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 text-center"
              >
                <motion.div
                  animate={{ 
                    scale: [1, 1.03, 1],
                    opacity: [0.6, 1, 0.6],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20"
                >
                  <Users className="w-5 h-5 text-white/70" />
                  <span className="text-white/70 text-sm md:text-base font-medium">Waiting for rankings...</span>
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

            {/* Editor hint - How to set correct order */}
            {isEditing && (
              <motion.div
                className="mt-4 p-3 rounded-xl bg-green-500/20 border border-green-500/30"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <p className="text-center text-green-300 text-xs md:text-sm font-medium">
                  ✓ The order shown here IS the correct ranking order
                </p>
                <p className="text-center text-white/50 text-xs mt-1">
                  Students will rank these items on their phones
                </p>
              </motion.div>
            )}
          </div>
        </div>
        
        {!isEditing && !hideFooter && (
          <ActivityFooter participantCount={totalResponses} showTimer={false} isActive={true} />
        )}
      </div>
    </SlideWrapper>
  );
}