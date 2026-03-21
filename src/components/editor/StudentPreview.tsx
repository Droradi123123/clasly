import { useState } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { 
  Presentation, 
  Send, 
  Trophy, 
  CheckCircle,
  ThumbsUp,
  ThumbsDown,
  GripVertical
} from "lucide-react";
import { Slide, SLIDE_TYPES, QuizSlideContent, PollSlideContent, YesNoSlideContent, ScaleSlideContent, WordCloudSlideContent, GuessNumberSlideContent, RankingSlideContent, SentimentMeterSlideContent, AgreeSpectrumSlideContent, FinishSentenceSlideContent } from "@/types/slides";
import { ThemeId, getTheme } from "@/types/themes";

interface StudentPreviewProps {
  slide: Slide;
  themeId: ThemeId;
}

export function StudentPreview({ slide, themeId }: StudentPreviewProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [wordInput, setWordInput] = useState("");
  const [numberInput, setNumberInput] = useState("");
  const [scaleValue, setScaleValue] = useState([3]);
  const [rankingOrder, setRankingOrder] = useState<string[]>([]);
  const [sentimentValue, setSentimentValue] = useState([50]);
  const [agreeValue, setAgreeValue] = useState([50]);
  const [sentenceInput, setSentenceInput] = useState("");
  
  const theme = getTheme(themeId);
  const slideType = SLIDE_TYPES.find(t => t.type === slide.type);
  const isInteractive = slideType?.category === 'interactive' || slideType?.category === 'quiz';

  const handleReset = () => {
    setSelectedOption(null);
    setHasAnswered(false);
    setWordInput("");
    setNumberInput("");
    setScaleValue([3]);
    setRankingOrder([]);
    setSentimentValue([50]);
    setAgreeValue([50]);
    setSentenceInput("");
  };

  const handleVote = (index: number) => {
    if (hasAnswered) return;
    setSelectedOption(index);
    setHasAnswered(true);
  };

  const handleYesNo = (answer: boolean) => {
    if (hasAnswered) return;
    setSelectedOption(answer ? 0 : 1);
    setHasAnswered(true);
  };

  const handleSubmit = () => {
    setHasAnswered(true);
  };

  const content = slide.content;
  const question = (content as any)?.question || (content as any)?.statement || (content as any)?.sentenceStart || (content as any)?.title || "Question";

  // Get option colors from theme
  const getOptionColor = (index: number) => {
    return theme.optionColors[index % theme.optionColors.length];
  };

  // Initialize ranking order if not set
  if (slide.type === 'ranking' && rankingOrder.length === 0) {
    const items = (content as RankingSlideContent)?.items || [];
    if (items.length > 0) {
      setRankingOrder([...items]);
    }
  }

  return (
    <div className="flex flex-col h-full bg-background rounded-2xl overflow-hidden shadow-2xl border border-border">
      {/* Phone Status Bar */}
      <div className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-primary to-primary/80">
        <div className="flex items-center justify-between text-primary-foreground">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center text-lg">
              🎓
            </div>
            <div>
              <p className="font-medium text-sm">Student</p>
              <div className="flex items-center gap-1 text-xs text-primary-foreground/80">
                <Trophy className="w-3 h-3" />
                <span>320 pts</span>
              </div>
            </div>
          </div>
          <span className="text-xs text-primary-foreground/80 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            Connected
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {!isInteractive ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Presentation className="w-12 h-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-display font-bold text-foreground mb-2">
              Content Slide
            </h2>
            <p className="text-muted-foreground text-sm">
              No interaction needed - view only
            </p>
          </div>
        ) : (
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 text-xs text-primary font-medium">
              <Presentation className="w-3 h-3" />
              {slideType?.label || slide.type}
            </div>

            <h2 className="text-lg font-display font-bold text-foreground">
              {question}
            </h2>

            {/* Quiz/Poll Options */}
            {(slide.type === 'quiz' || slide.type === 'poll') && (
              <div className="space-y-2">
                {((content as QuizSlideContent | PollSlideContent).options || []).map((option, index) => (
                  <motion.button
                    key={index}
                    onClick={() => handleVote(index)}
                    disabled={hasAnswered}
                    whileTap={{ scale: hasAnswered ? 1 : 0.98 }}
                    className={`w-full p-3 rounded-xl text-left transition-all text-white font-medium ${
                      selectedOption === index
                        ? "ring-2 ring-white shadow-lg"
                        : hasAnswered
                        ? "opacity-50"
                        : ""
                    } ${getOptionColor(index)}`}
                  >
                    {option}
                  </motion.button>
                ))}
              </div>
            )}

            {/* Yes/No */}
            {slide.type === 'yesno' && (
              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  onClick={() => handleYesNo(true)}
                  disabled={hasAnswered}
                  whileTap={{ scale: hasAnswered ? 1 : 0.95 }}
                  className={`p-6 rounded-xl text-center transition-all ${
                    hasAnswered && selectedOption === 0
                      ? "ring-2 ring-white"
                      : hasAnswered
                      ? "opacity-50"
                      : ""
                  } bg-gradient-to-br from-emerald-500 to-green-500 text-white shadow-lg`}
                >
                  <ThumbsUp className="w-8 h-8 mx-auto mb-2" />
                  <span className="text-lg font-bold">
                    {(content as any).yesLabel || 'Yes'}
                  </span>
                </motion.button>
                <motion.button
                  onClick={() => handleYesNo(false)}
                  disabled={hasAnswered}
                  whileTap={{ scale: hasAnswered ? 1 : 0.95 }}
                  className={`p-6 rounded-xl text-center transition-all ${
                    hasAnswered && selectedOption === 1
                      ? "ring-2 ring-white"
                      : hasAnswered
                      ? "opacity-50"
                      : ""
                  } bg-gradient-to-br from-rose-500 to-red-500 text-white shadow-lg`}
                >
                  <ThumbsDown className="w-8 h-8 mx-auto mb-2" />
                  <span className="text-lg font-bold">
                    {(content as any).noLabel || 'No'}
                  </span>
                </motion.button>
              </div>
            )}

            {/* Word Cloud Input */}
            {slide.type === 'wordcloud' && (
              <div className="space-y-3">
                <Input
                  value={wordInput}
                  onChange={(e) => setWordInput(e.target.value)}
                  placeholder="Enter a word..."
                  disabled={hasAnswered}
                />
                <Button
                  variant="hero"
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={!wordInput.trim() || hasAnswered}
                >
                  <Send className="w-4 h-4" />
                  Submit
                </Button>
              </div>
            )}

            {/* Guess Number */}
            {slide.type === 'guess_number' && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center">
                  Range: {(content as GuessNumberSlideContent).minRange || 1} - {(content as GuessNumberSlideContent).maxRange || 100}
                </p>
                <Input
                  type="number"
                  value={numberInput}
                  onChange={(e) => setNumberInput(e.target.value)}
                  placeholder="Enter your guess..."
                  className="text-center"
                  disabled={hasAnswered}
                />
                <Button
                  variant="hero"
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={!numberInput || hasAnswered}
                >
                  <Send className="w-4 h-4" />
                  Submit Guess
                </Button>
              </div>
            )}

            {/* Scale */}
            {slide.type === 'scale' && (
              <div className="space-y-4">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{(content as ScaleSlideContent).scaleOptions?.minLabel || 'Low'}</span>
                  <span>{(content as ScaleSlideContent).scaleOptions?.maxLabel || 'High'}</span>
                </div>
                <Slider
                  value={scaleValue}
                  onValueChange={setScaleValue}
                  min={1}
                  max={(content as ScaleSlideContent).scaleOptions?.steps || 5}
                  step={1}
                  disabled={hasAnswered}
                />
                <div className="text-center">
                  <span className="text-2xl font-bold text-primary">{scaleValue[0]}</span>
                </div>
                <Button
                  variant="hero"
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={hasAnswered}
                >
                  <Send className="w-4 h-4" />
                  Submit
                </Button>
              </div>
            )}

            {/* Sentiment Meter */}
            {slide.type === 'sentiment_meter' && (
              <div className="space-y-4">
                <div className="flex justify-between text-2xl">
                  <span>{(content as SentimentMeterSlideContent).leftEmoji || '😡'}</span>
                  <span>{(content as SentimentMeterSlideContent).rightEmoji || '😍'}</span>
                </div>
                <Slider
                  value={sentimentValue}
                  onValueChange={setSentimentValue}
                  min={0}
                  max={100}
                  step={1}
                  disabled={hasAnswered}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{(content as SentimentMeterSlideContent).leftLabel || 'Not great'}</span>
                  <span>{(content as SentimentMeterSlideContent).rightLabel || 'Amazing'}</span>
                </div>
                <div className="text-center">
                  <span className="text-xl font-bold text-primary">{sentimentValue[0]}%</span>
                </div>
                <Button
                  variant="hero"
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={hasAnswered}
                >
                  <Send className="w-4 h-4" />
                  Submit
                </Button>
              </div>
            )}

            {/* Agree/Disagree Spectrum */}
            {slide.type === 'agree_spectrum' && (
              <div className="space-y-4">
                <Slider
                  value={agreeValue}
                  onValueChange={setAgreeValue}
                  min={0}
                  max={100}
                  step={1}
                  disabled={hasAnswered}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{(content as AgreeSpectrumSlideContent).leftLabel || 'Strongly Disagree'}</span>
                  <span>{(content as AgreeSpectrumSlideContent).rightLabel || 'Strongly Agree'}</span>
                </div>
                <div className="text-center">
                  <span className="text-xl font-bold text-primary">{agreeValue[0]}%</span>
                </div>
                <Button
                  variant="hero"
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={hasAnswered}
                >
                  <Send className="w-4 h-4" />
                  Submit
                </Button>
              </div>
            )}

            {/* Finish the Sentence */}
            {slide.type === 'finish_sentence' && (
              <div className="space-y-3">
                <p className="text-base font-medium text-foreground italic">
                  "{(content as FinishSentenceSlideContent).sentenceStart}"
                </p>
                <Textarea
                  value={sentenceInput}
                  onChange={(e) => setSentenceInput(e.target.value.slice(0, (content as FinishSentenceSlideContent).maxCharacters || 100))}
                  placeholder="Complete the sentence..."
                  className="min-h-[80px]"
                  disabled={hasAnswered}
                />
                <div className="text-xs text-muted-foreground">
                  {sentenceInput.length} / {(content as FinishSentenceSlideContent).maxCharacters || 100}
                </div>
                <Button
                  variant="hero"
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={!sentenceInput.trim() || hasAnswered}
                >
                  <Send className="w-4 h-4" />
                  Submit
                </Button>
              </div>
            )}

            {/* Ranking with Reorder */}
            {slide.type === 'ranking' && (
              <div className="space-y-2">
                <Reorder.Group
                  axis="y"
                  values={rankingOrder.length > 0 ? rankingOrder : ((content as RankingSlideContent).items || [])}
                  onReorder={setRankingOrder}
                  className="space-y-2"
                >
                  {(rankingOrder.length > 0 ? rankingOrder : ((content as RankingSlideContent).items || [])).map((item, index) => (
                    <Reorder.Item
                      key={item}
                      value={item}
                      className={`p-3 rounded-xl flex items-center gap-3 cursor-grab active:cursor-grabbing text-white ${getOptionColor(index)} ${hasAnswered ? 'opacity-60' : ''}`}
                      drag={!hasAnswered ? "y" : false}
                      whileDrag={{ scale: 1.02, boxShadow: "0 8px 20px rgba(0,0,0,0.2)" }}
                    >
                      <span className="w-6 h-6 rounded-full bg-white/20 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {index + 1}
                      </span>
                      <span className="font-medium flex-1 text-sm">{item}</span>
                      <GripVertical className="w-4 h-4 text-white/60 flex-shrink-0" />
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
                <Button
                  variant="hero"
                  className="w-full mt-2"
                  onClick={handleSubmit}
                  disabled={hasAnswered}
                >
                  <Send className="w-4 h-4" />
                  Submit
                </Button>
              </div>
            )}

            {/* Answer Submitted */}
            {hasAnswered && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 text-center"
              >
                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-green-500/10 text-green-600 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-medium">Submitted!</span>
                </div>
                <button
                  onClick={handleReset}
                  className="block mx-auto mt-2 text-xs text-primary hover:underline"
                >
                  Reset preview
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>

      {/* Bottom reaction bar */}
      <div className="flex-shrink-0 p-3 border-t border-border/50 bg-card/50">
        <div className="flex items-center justify-center gap-2">
          {["👍", "❤️", "🎉", "🤔", "💡", "👏"].map((emoji) => (
            <button
              key={emoji}
              className="text-xl p-1.5 hover:bg-muted rounded-lg transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
