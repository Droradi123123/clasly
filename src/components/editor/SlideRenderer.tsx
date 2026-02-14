import {
  Slide,
  SlideContent,
  QuizSlideContent,
  PollSlideContent,
  WordCloudSlideContent,
  YesNoSlideContent,
  RankingSlideContent,
  GuessNumberSlideContent,
  ScaleSlideContent,
  FinishSentenceSlideContent,
  SentimentMeterSlideContent,
  AgreeSpectrumSlideContent,
  SplitContentSlideContent,
  BeforeAfterSlideContent,
  BulletPointsSlideContent,
  TimelineSlideContent,
  BarChartSlideContent,
} from "@/types/slides";
import { ThemeId } from "@/types/themes";
import { DesignStyleId } from "@/types/designStyles";
import {
  QuizSlide,
  PollSlide,
  WordCloudSlide,
  YesNoSlide,
  RankingSlide,
  GuessNumberSlide,
  ScaleSlide,
  SlideWrapper,
  FinishSentenceSlide,
  SentimentMeterSlide,
  AgreeSpectrumSlide,
  SplitContentSlide,
  BeforeAfterSlide,
  BulletPointsSlide,
  TimelineSlide,
  BarChartSlide,
} from "./slides";
import { motion } from "framer-motion";
import { Image } from "lucide-react";
import { AutoResizeTextarea } from "@/components/ui/AutoResizeTextarea";

interface SlideRendererProps {
  slide: Slide;
  isEditing?: boolean;
  showResults?: boolean;
  onUpdateContent?: (content: SlideContent) => void;
  // Live response data for presentation mode
  liveResults?: any;
  totalResponses?: number;
  // Theme system
  themeId?: ThemeId;
  // Design style (minimal/dynamic)
  designStyleId?: DesignStyleId;
  // Hide footer (for presenter mode where footer is in top bar)
  hideFooter?: boolean;
  // Show correct answer (for quiz slides)
  showCorrectAnswer?: boolean;
}

export function SlideRenderer({
  slide,
  isEditing = false,
  showResults = false,
  onUpdateContent,
  liveResults,
  totalResponses = 0,
  themeId = "neon-cyber",
  designStyleId = "dynamic",
  hideFooter = false,
  showCorrectAnswer = false,
}: SlideRendererProps) {
  // Get designStyleId from slide design or use prop
  const effectiveDesignStyleId =
    (slide.design?.designStyleId as DesignStyleId) || designStyleId;

  switch (slide.type) {
    case "quiz":
      return (
        <QuizSlide
          slide={slide}
          isEditing={isEditing}
          showResults={showResults}
          onUpdate={(content) => onUpdateContent?.(content)}
          liveResults={liveResults?.results}
          totalResponses={totalResponses}
          themeId={themeId}
          designStyleId={effectiveDesignStyleId}
          hideFooter={hideFooter}
          showCorrectAnswer={showCorrectAnswer}
        />
      );

    case "poll":
      return (
        <PollSlide
          slide={slide}
          isEditing={isEditing}
          showResults={showResults}
          onUpdate={(content) => onUpdateContent?.(content)}
          liveResults={liveResults?.results}
          totalResponses={totalResponses}
          themeId={themeId}
          designStyleId={effectiveDesignStyleId}
          hideFooter={hideFooter}
        />
      );

    case "wordcloud":
      return (
        <WordCloudSlide
          slide={slide}
          isEditing={isEditing}
          onUpdate={(content) => onUpdateContent?.(content)}
          liveWords={liveResults?.words}
          totalResponses={totalResponses}
          themeId={themeId}
          hideFooter={hideFooter}
        />
      );

    case "yesno":
      return (
        <YesNoSlide
          slide={slide}
          isEditing={isEditing}
          showResults={showResults}
          onUpdate={(content) => onUpdateContent?.(content)}
          liveResults={liveResults?.results}
          totalResponses={totalResponses}
          themeId={themeId}
          designStyleId={effectiveDesignStyleId}
          hideFooter={hideFooter}
          showCorrectAnswer={showCorrectAnswer}
        />
      );

    case "ranking":
      return (
        <RankingSlide
          slide={slide}
          isEditing={isEditing}
          onUpdate={(content) => onUpdateContent?.(content)}
          liveResults={liveResults?.rankings}
          totalResponses={totalResponses}
          themeId={themeId}
          designStyleId={effectiveDesignStyleId}
          hideFooter={hideFooter}
          showCorrectAnswer={showCorrectAnswer}
        />
      );

    case "guess_number":
      return (
        <GuessNumberSlide
          slide={slide}
          isEditing={isEditing}
          onUpdate={(content) => onUpdateContent?.(content)}
          liveResults={liveResults?.results}
          totalResponses={totalResponses}
          showAnswer={showCorrectAnswer}
          themeId={themeId}
          designStyleId={effectiveDesignStyleId}
          hideFooter={hideFooter}
        />
      );

    case "scale":
      return (
        <ScaleSlide
          slide={slide}
          isEditing={isEditing}
          onUpdate={(content) => onUpdateContent?.(content)}
          liveResults={liveResults?.results}
          totalResponses={totalResponses}
          themeId={themeId}
          designStyleId={effectiveDesignStyleId}
          hideFooter={hideFooter}
        />
      );

    // Advanced interactive slides
    case "finish_sentence":
      return (
        <FinishSentenceSlide
          slide={slide}
          isEditing={isEditing}
          onUpdate={(content) => onUpdateContent?.(content)}
          liveResults={liveResults}
          totalResponses={totalResponses}
          themeId={themeId}
          designStyleId={effectiveDesignStyleId}
          hideFooter={hideFooter}
        />
      );

    case "sentiment_meter":
      return (
        <SentimentMeterSlide
          slide={slide}
          isEditing={isEditing}
          onUpdate={(content) => onUpdateContent?.(content)}
          liveResults={liveResults}
          totalResponses={totalResponses}
          themeId={themeId}
          designStyleId={effectiveDesignStyleId}
          hideFooter={hideFooter}
        />
      );

    case "agree_spectrum":
      return (
        <AgreeSpectrumSlide
          slide={slide}
          isEditing={isEditing}
          onUpdate={(content) => onUpdateContent?.(content)}
          liveResults={liveResults}
          totalResponses={totalResponses}
          themeId={themeId}
          designStyleId={effectiveDesignStyleId}
          hideFooter={hideFooter}
        />
      );

    case "title":
      return (
        <SlideWrapper slide={slide} themeId={themeId}>
          <div className="flex flex-col items-center justify-center h-full p-12 min-h-0 overflow-y-auto">
            {isEditing ? (
              <>
                <AutoResizeTextarea
                  value={(slide.content as any).title || ""}
                  onChange={(e) =>
                    onUpdateContent?.({ ...slide.content, title: e.target.value })
                  }
                  className="slide-title font-bold bg-transparent border-0 outline-none text-center w-full mb-4 placeholder:opacity-50"
                  placeholder="Enter title..."
                  minRows={1}
                />
                <AutoResizeTextarea
                  value={(slide.content as any).subtitle || ""}
                  onChange={(e) =>
                    onUpdateContent?.({ ...slide.content, subtitle: e.target.value })
                  }
                  className="text-lg md:text-xl opacity-80 bg-transparent border-0 outline-none text-center w-full placeholder:opacity-40"
                  placeholder="Enter subtitle..."
                  minRows={1}
                />
              </>
            ) : (
              <>
                <h1 className="slide-title font-bold text-center drop-shadow-lg break-words">
                  {(slide.content as any).title || "Untitled"}
                </h1>
                {(slide.content as any).subtitle && (
                  <p className="text-lg md:text-xl opacity-80 text-center mt-4 break-words">
                    {(slide.content as any).subtitle}
                  </p>
                )}
              </>
            )}
          </div>
        </SlideWrapper>
      );

    case "content":
      return (
        <SlideWrapper slide={slide} themeId={themeId}>
          <div className="flex flex-col items-center justify-center h-full p-12 min-h-0 overflow-y-auto">
            {isEditing ? (
              <>
                <AutoResizeTextarea
                  value={(slide.content as any).title || ""}
                  onChange={(e) =>
                    onUpdateContent?.({ ...slide.content, title: e.target.value })
                  }
                  className="slide-question font-bold bg-transparent border-0 outline-none text-center w-full mb-6 placeholder:opacity-50"
                  placeholder="Enter title..."
                  minRows={1}
                />
                <AutoResizeTextarea
                  value={(slide.content as any).text || ""}
                  onChange={(e) =>
                    onUpdateContent?.({ ...slide.content, text: e.target.value })
                  }
                  className="opacity-90 bg-transparent border-0 outline-none text-center w-full max-w-3xl placeholder:opacity-40"
                  placeholder="Enter content..."
                  minRows={4}
                />
              </>
            ) : (
              <>
                <h2 className="slide-question font-bold text-center drop-shadow-lg mb-6 break-words">
                  {(slide.content as any).title || "Untitled"}
                </h2>
                <p className="opacity-90 text-center max-w-3xl break-words">
                  {(slide.content as any).text}
                </p>
              </>
            )}
          </div>
        </SlideWrapper>
      );

    case "image":
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          className="w-full h-full overflow-hidden rounded-xl md:rounded-2xl shadow-lg bg-background flex items-center justify-center"
        >
          {(slide.content as any).imageUrl ? (
            <img
              src={(slide.content as any).imageUrl}
              alt={(slide.content as any).title || "Slide image"}
              className="w-full h-full object-contain"
              style={{ objectFit: "contain" }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center">
              <Image className="w-16 h-16 opacity-50 mb-4 text-muted-foreground" />
              <p className="opacity-60 text-muted-foreground">No image uploaded</p>
            </div>
          )}
          {isEditing && (slide.content as any).imageUrl && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
              <input
                value={(slide.content as any).imageUrl || ""}
                onChange={(e) =>
                  onUpdateContent?.({ ...slide.content, imageUrl: e.target.value })
                }
                className="px-4 py-2 rounded-lg bg-black/70 text-white placeholder:text-white/50 text-center w-80"
                placeholder="Paste image URL..."
              />
            </div>
          )}
        </motion.div>
      );

    case "split_content":
      return (
        <SplitContentSlide
          slide={slide}
          isEditing={isEditing}
          onUpdate={(content) => onUpdateContent?.(content)}
          themeId={themeId}
        />
      );

    case "before_after":
      return (
        <BeforeAfterSlide
          slide={slide}
          isEditing={isEditing}
          onUpdate={(content) => onUpdateContent?.(content)}
          themeId={themeId}
        />
      );

    case "bullet_points":
      return (
        <BulletPointsSlide
          slide={slide}
          isEditing={isEditing}
          onUpdate={(content) => onUpdateContent?.(content)}
          themeId={themeId}
        />
      );

    case "timeline":
      return (
        <TimelineSlide
          slide={slide}
          isEditing={isEditing}
          onUpdate={(content) => onUpdateContent?.(content)}
          themeId={themeId}
        />
      );

    case "bar_chart":
      return (
        <BarChartSlide
          slide={slide}
          isEditing={isEditing}
          onUpdate={(content) => onUpdateContent?.(content)}
          themeId={themeId}
        />
      );

    default:
      return (
        <SlideWrapper slide={slide} themeId={themeId}>
          <div className="flex items-center justify-center h-full">
            <p className="opacity-60">Unknown slide type</p>
          </div>
        </SlideWrapper>
      );
  }
}
