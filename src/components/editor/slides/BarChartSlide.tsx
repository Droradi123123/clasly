import { motion } from "framer-motion";
import { BarChart3, Plus, Trash2 } from "lucide-react";
import { SlideWrapper } from "./SlideWrapper";
import { Slide } from "@/types/slides";
import { ThemeId } from "@/types/themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface BarChartSlideContent {
  title: string;
  subtitle?: string;
  bars: { label: string; value: number }[];
}

export interface BarChartSlideProps {
  slide: Slide;
  isEditing?: boolean;
  onUpdate?: (content: BarChartSlideContent) => void;
  themeId?: ThemeId;
}

const MAX_BARS = 6;

const BAR_COLORS = [
  'from-indigo-500 to-purple-500',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
  'from-violet-500 to-fuchsia-500',
];

export function BarChartSlide({
  slide,
  isEditing = false,
  onUpdate,
  themeId = 'neon-cyber',
}: BarChartSlideProps) {
  const content = slide.content as BarChartSlideContent;
  const textColor = slide.design?.textColor || '#ffffff';
  const textAlign = (slide.design?.textAlign || "center") as "left" | "center" | "right";
  
  const bars = content.bars || [
    { label: 'Item 1', value: 25 },
    { label: 'Item 2', value: 50 },
    { label: 'Item 3', value: 75 },
    { label: 'Item 4', value: 100 },
  ];

  const maxValue = Math.max(...bars.map(b => b.value), 1);

  const handleTitleChange = (title: string) => {
    onUpdate?.({ ...content, title });
  };

  const handleSubtitleChange = (subtitle: string) => {
    onUpdate?.({ ...content, subtitle });
  };

  const handleBarLabelChange = (index: number, label: string) => {
    const newBars = [...bars];
    newBars[index] = { ...newBars[index], label };
    onUpdate?.({ ...content, bars: newBars });
  };

  const handleBarValueChange = (index: number, value: number) => {
    const newBars = [...bars];
    newBars[index] = { ...newBars[index], value: Math.max(0, value) };
    onUpdate?.({ ...content, bars: newBars });
  };

  const addBar = () => {
    if (bars.length < MAX_BARS) {
      onUpdate?.({ 
        ...content, 
        bars: [...bars, { label: `Item ${bars.length + 1}`, value: 50 }] 
      });
    }
  };

  const removeBar = (index: number) => {
    if (bars.length > 1) {
      const newBars = bars.filter((_, i) => i !== index);
      onUpdate?.({ ...content, bars: newBars });
    }
  };

  return (
    <SlideWrapper slide={slide} themeId={themeId}>
      <div className="flex flex-col h-full p-8" dir={slide.design?.direction}>
        {/* Title */}
        <div className="mb-8 w-full" style={{ textAlign }}>
          {isEditing ? (
            <input
              value={content.title || ''}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="text-3xl md:text-4xl font-bold bg-transparent border-0 outline-none w-full"
              style={{ color: textColor, textAlign }}
              placeholder="Add your title here"
            />
          ) : (
            <h2 className="text-3xl md:text-4xl font-bold w-full" style={{ color: textColor, textAlign }}>
              {content.title || 'Add your title here'}
            </h2>
          )}
          
          {(isEditing || content.subtitle) && (
            isEditing ? (
              <input
                value={content.subtitle || ''}
                onChange={(e) => handleSubtitleChange(e.target.value)}
                className="text-lg md:text-xl bg-transparent border-0 outline-none w-full mt-2 opacity-80"
                style={{ color: textColor, textAlign }}
                placeholder="Optional subtitle..."
              />
            ) : (
              <p className="text-lg md:text-xl mt-2 opacity-80 w-full" style={{ color: textColor, textAlign }}>
                {content.subtitle}
              </p>
            )
          )}
        </div>

        {/* Chart */}
        <div className="flex-1 flex items-end justify-center gap-4 md:gap-8 pb-8">
          {bars.map((bar, index) => {
            const heightPercent = (bar.value / maxValue) * 100;
            const colorClass = BAR_COLORS[index % BAR_COLORS.length];

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex flex-col items-center flex-1 max-w-32 group"
              >
                {/* Value input */}
                {isEditing ? (
                  <Input
                    type="number"
                    value={bar.value}
                    onChange={(e) => handleBarValueChange(index, parseInt(e.target.value) || 0)}
                    className="w-16 h-8 text-center text-sm mb-2 bg-white/10 border-white/20 text-white"
                  />
                ) : (
                  <span 
                    className="text-lg font-bold mb-2"
                    style={{ color: textColor }}
                  >
                    {bar.value}
                  </span>
                )}

                {/* Bar */}
                <div 
                  className="relative w-full rounded-t-lg overflow-hidden"
                  style={{ height: `${Math.max(20, heightPercent * 2)}px` }}
                >
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: '100%' }}
                    transition={{ duration: 0.8, delay: 0.2 + index * 0.1, ease: 'easeOut' }}
                    className={`absolute bottom-0 w-full bg-gradient-to-t ${colorClass}`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-transparent" />
                  </motion.div>
                </div>

                {/* Label */}
                <div className="mt-3 flex flex-col items-center gap-1">
                  {isEditing ? (
                    <>
                      <Input
                        value={bar.label}
                        onChange={(e) => handleBarLabelChange(index, e.target.value)}
                        className="w-full h-7 text-xs text-center bg-white/10 border-white/20 text-white"
                        placeholder="Label..."
                      />
                      {bars.length > 1 && (
                        <button
                          onClick={() => removeBar(index)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-opacity"
                        >
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                      )}
                    </>
                  ) : (
                    <span 
                      className="text-sm font-medium text-center"
                      style={{ color: textColor, opacity: 0.9 }}
                    >
                      {bar.label}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Add bar button */}
        {isEditing && bars.length < MAX_BARS && (
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={addBar}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Bar
            </Button>
          </div>
        )}
      </div>
    </SlideWrapper>
  );
}
