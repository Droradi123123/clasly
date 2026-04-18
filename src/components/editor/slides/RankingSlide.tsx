import { motion, AnimatePresence } from "framer-motion";
import { GripVertical, Plus, Trash2, Users, Crown } from "lucide-react";
import { SlideWrapper, QuestionHeader, ActivityFooter } from "./index";
import { Slide, RankingSlideContent } from "@/types/slides";
import { ThemeId, getTheme } from "@/types/themes";
import { DesignStyleId, getDesignStyle } from "@/types/designStyles";
import { Button } from "@/components/ui/button";
import { ShowcaseShell } from "@/components/editor/slides/showcase/ShowcasePrimitives";
import { cn } from "@/lib/utils";

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
  /** When false (timed quiz, voting phase), hide aggregated ranking results */
  showResults?: boolean;
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
  themeId = 'academic-pro',
  designStyleId = 'dynamic',
  hideFooter = false,
  showCorrectAnswer = false,
  showResults = true,
}: RankingSlideProps) {
  const content = slide.content as RankingSlideContent;
  const theme = getTheme(themeId);
  const designStyle = getDesignStyle(designStyleId);
  const styleConfig = designStyle.config;

  const hasResults = totalResponses > 0;
  const revealStats = isEditing || showResults;
  const isCompact = designStyleId === 'compact';
  const isShowcase = slide.design?.rankingVariant === "showcase";
  const isPodium = slide.design?.rankingVariant === 'podium';

  // Sort items by average rank if we have results
  const displayItems =
    revealStats && hasResults && liveResults?.rankings
      ? [...liveResults.rankings].sort((a, b) => a.avgRank - b.avgRank).map((r) => r.item)
      : content.items;

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
          subtitle={isEditing ? "Ranking: Order items by importance" : undefined}
          textColor={textColor}
        />
        
        <div className="flex-1 flex items-center justify-center px-4 md:px-6 pb-4 min-h-0 overflow-y-auto">
          <div className={`w-full max-h-full ${isCompact ? 'flex flex-row flex-wrap justify-center gap-2 md:gap-3 max-w-2xl' : 'max-w-lg space-y-2 md:space-y-3'}`}>
            {isShowcase ? (
            <ShowcaseShell className="max-w-xl w-full space-y-3 mx-auto">
              {isEditing ? (
                content.items.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group relative flex items-center gap-3 rounded-3xl border border-white/10 bg-[hsl(var(--theme-surface)/0.45)] px-4 py-3 md:px-5 md:py-4 shadow-sm"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-[hsl(var(--theme-text-primary)/0.06)] text-sm font-semibold tabular-nums text-[hsl(var(--theme-text-primary))]">
                      {index + 1}
                    </span>
                    <GripVertical className="w-4 h-4 text-[hsl(var(--theme-text-secondary))] shrink-0" />
                    <input
                      value={item}
                      onChange={(e) => handleItemChange(index, e.target.value)}
                      className="flex-1 min-w-0 bg-transparent text-sm md:text-base font-medium text-[hsl(var(--theme-text-primary))] outline-none"
                      placeholder={`Item ${index + 1}`}
                    />
                    {content.items.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full p-1.5 text-red-400 hover:bg-red-500/20"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </motion.div>
                ))
              ) : revealStats && hasResults && liveResults?.rankings ? (
                [...liveResults.rankings]
                  .sort((a, b) => a.avgRank - b.avgRank)
                  .map((r, index) => {
                    const place = index + 1;
                    return (
                      <motion.div
                        key={r.item}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.06 }}
                        className={cn(
                          "flex items-center gap-3 rounded-3xl border px-4 py-3 md:px-5 md:py-4 shadow-sm",
                          place === 1
                            ? "border-[hsl(var(--theme-accent))] bg-[hsl(var(--theme-accent)/0.08)]"
                            : "border-white/10 bg-[hsl(var(--theme-surface)/0.45)]",
                        )}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-[hsl(var(--theme-text-primary)/0.06)]">
                          {place === 1 ? (
                            <Crown className="h-5 w-5 text-[hsl(var(--theme-accent))]" aria-hidden />
                          ) : (
                            <span className="text-sm font-semibold tabular-nums text-[hsl(var(--theme-text-primary))]">
                              {place}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm md:text-base font-medium leading-snug text-[hsl(var(--theme-text-primary))] break-words">
                            {r.item}
                          </p>
                          <p className="mt-0.5 text-xs text-[hsl(var(--theme-text-secondary))]">
                            Avg rank {r.avgRank.toFixed(2)}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })
              ) : (
                content.items.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 rounded-3xl border border-white/10 bg-[hsl(var(--theme-surface)/0.45)] px-4 py-3"
                  >
                    <span className="text-sm font-semibold tabular-nums text-[hsl(var(--theme-text-secondary))]">
                      {index + 1}.
                    </span>
                    <span className="text-sm md:text-base font-medium text-[hsl(var(--theme-text-primary))]">
                      {item}
                    </span>
                  </motion.div>
                ))
              )}
              {isEditing && content.items.length < 6 && (
                <Button
                  variant="outline"
                  onClick={addItem}
                  size="sm"
                  className="mt-2 w-full border-white/15 bg-[hsl(var(--theme-text-primary)/0.06)] text-[hsl(var(--theme-text-primary))] hover:bg-[hsl(var(--theme-text-primary)/0.1)]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              )}
              {!isEditing && !hasResults && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="pt-4 text-center"
                >
                  <div className="inline-flex items-center gap-2 rounded-3xl border border-white/10 bg-[hsl(var(--theme-surface)/0.4)] px-4 py-2 text-sm text-[hsl(var(--theme-text-secondary))]">
                    <Users className="w-4 h-4" />
                    <span>Waiting for rankings…</span>
                  </div>
                </motion.div>
              )}
              {!isEditing && hasResults && !revealStats && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="pt-4 text-center"
                >
                  <div className="inline-flex max-w-lg flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/15 bg-[hsl(var(--theme-surface)/0.35)] px-4 py-2 text-sm text-[hsl(var(--theme-text-secondary))]">
                    <Users className="w-4 h-4 shrink-0" />
                    <span>
                      {totalResponses} response{totalResponses === 1 ? "" : "s"} — ranking revealed when timer ends
                    </span>
                  </div>
                </motion.div>
              )}
            </ShowcaseShell>
            ) : isPodium && revealStats && hasResults && liveResults?.rankings ? (
            /* Podium: 1st, 2nd, 3rd with visual bars / medals */
            <div className="flex flex-col gap-4 w-full max-w-md mx-auto">
              {liveResults.rankings.sort((a, b) => a.avgRank - b.avgRank).map((r, index) => {
                const place = index + 1;
                const heightPercent = 100 - (index / Math.max(liveResults.rankings.length - 1, 1)) * 45;
                return (
                  <motion.div
                    key={r.item}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08 }}
                    className="flex items-center gap-3"
                  >
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                      place === 1 ? 'bg-amber-500' : place === 2 ? 'bg-gray-400' : place === 3 ? 'bg-amber-700' : 'bg-white/20'
                    }`}>
                      {place}
                    </div>
                    <div className="flex-1 min-w-0 rounded-xl overflow-hidden bg-white/10 border border-white/20" style={{ minHeight: 48 }}>
                      <motion.div
                        className={`h-full min-h-[48px] flex items-center px-3 py-2 bg-gradient-to-r ${ITEM_COLORS[index % ITEM_COLORS.length]}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${heightPercent}%` }}
                        transition={{ type: 'spring', stiffness: 150, damping: 25 }}
                      >
                        <span className="text-white font-semibold text-sm md:text-base break-words leading-snug">{r.item}</span>
                      </motion.div>
                    </div>
                    <span className="text-white/80 text-sm font-medium flex-shrink-0">avg {r.avgRank.toFixed(1)}</span>
                  </motion.div>
                );
              })}
            </div>
            ) : (
            <>
            {displayItems.map((item, index) => {
              const originalIndex = content.items.indexOf(item);
              const colorIndex = isEditing ? index : originalIndex;
              
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
                      flex items-center gap-3 rounded-2xl 
                      bg-gradient-to-r ${ITEM_COLORS[colorIndex % ITEM_COLORS.length]} 
                      shadow-lg border border-white/20
                      ${isCompact ? 'p-2 md:p-3 min-w-[160px] flex-1 max-w-[200px] gap-2' : 'p-3 md:p-4 gap-3'}
                    `}
                    whileHover={!isEditing ? { scale: isCompact ? 1.02 : 1.01, x: isCompact ? 2 : 5 } : undefined}
                    style={{ fontFamily: theme.tokens.fontFamily }}
                  >
                    {/* Rank number */}
                    <div className={`rounded-xl bg-white/20 flex items-center justify-center font-bold text-white flex-shrink-0 ${isCompact ? 'w-6 h-6 md:w-8 md:h-8 text-sm md:text-base' : 'w-8 h-8 md:w-10 md:h-10 text-base md:text-lg'}`}>
                      {index + 1}
                    </div>
                    
                    {/* Drag handle - editor only */}
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
                      <span className="flex-1 min-w-0 text-white font-semibold text-sm md:text-base break-words">
                        {item}
                      </span>
                    )}

                    {/* Live rank indicator */}
                    {!isEditing && revealStats && hasResults && liveResults?.rankings && (
                      <div className="flex items-center gap-1 text-white/80 text-xs md:text-sm flex-shrink-0">
                        <span>דירוג ממוצע: {liveResults.rankings.find(r => r.item === item)?.avgRank.toFixed(1)}</span>
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
            {!isEditing && hasResults && !revealStats && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 text-center px-2"
              >
                <div className="inline-flex flex-wrap items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white/10 border border-white/20 max-w-lg mx-auto text-white/80 text-sm">
                  <Users className="w-5 h-5 shrink-0" />
                  <span>
                    <span className="text-lg font-bold tabular-nums">{totalResponses}</span> response{totalResponses === 1 ? "" : "s"} — ranking revealed when timer ends
                  </span>
                </div>
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
            </>
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