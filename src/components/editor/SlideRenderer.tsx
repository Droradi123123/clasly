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
import { Image } from "lucide-react";
import { AutoResizeTextarea } from "@/components/ui/AutoResizeTextarea";
import { ImageUploader } from "@/components/editor/ImageUploader";

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

    case "title": {
      const titleTextAlign = (slide.design?.textAlign || "center") as "left" | "center" | "right";
      const titleAlignClass = titleTextAlign === "left" ? "text-left items-start" : titleTextAlign === "right" ? "text-right items-end" : "text-center items-center";
      return (
        <SlideWrapper slide={slide} themeId={themeId}>
          <div
            className={`flex flex-col justify-center h-full p-12 min-h-0 overflow-y-auto ${titleAlignClass}`}
            dir={slide.design?.direction || undefined}
          >
            {isEditing ? (
              <>
                <AutoResizeTextarea
                  value={(slide.content as any).title || ""}
                  onChange={(e) =>
                    onUpdateContent?.({ ...slide.content, title: e.target.value })
                  }
                  className="slide-title font-bold bg-transparent border-0 outline-none w-full mb-4 placeholder:opacity-50"
                  style={{ textAlign: titleTextAlign }}
                  placeholder="Enter title..."
                  minRows={1}
                />
                <AutoResizeTextarea
                  value={(slide.content as any).subtitle || ""}
                  onChange={(e) =>
                    onUpdateContent?.({ ...slide.content, subtitle: e.target.value })
                  }
                  className="text-lg md:text-xl opacity-80 bg-transparent border-0 outline-none w-full placeholder:opacity-40"
                  style={{ textAlign: titleTextAlign }}
                  placeholder="Enter subtitle..."
                  minRows={1}
                />
              </>
            ) : (
              <>
                <h1 className="slide-title font-bold drop-shadow-lg break-words" style={{ textAlign: titleTextAlign }}>
                  {(slide.content as any).title || "Untitled"}
                </h1>
                {(slide.content as any).subtitle && (
                  <p className="text-lg md:text-xl opacity-80 mt-4 break-words" style={{ textAlign: titleTextAlign }}>
                    {(slide.content as any).subtitle}
                  </p>
                )}
              </>
            )}
          </div>
        </SlideWrapper>
      );
    }

    case "content": {
      const contentTextAlign = (slide.design?.textAlign || "center") as "left" | "center" | "right";
      const contentAlignClass = contentTextAlign === "left" ? "text-left items-start" : contentTextAlign === "right" ? "text-right items-end" : "text-center items-center";
      return (
        <SlideWrapper slide={slide} themeId={themeId}>
          <div
            className={`flex flex-col justify-start h-full p-8 md:p-12 min-h-0 overflow-y-auto ${contentAlignClass}`}
            dir={slide.design?.direction || undefined}
          >
            {isEditing ? (
              <>
                <AutoResizeTextarea
                  value={(slide.content as any).title || ""}
                  onChange={(e) =>
                    onUpdateContent?.({ ...slide.content, title: e.target.value })
                  }
                  className="text-lg md:text-xl font-semibold bg-transparent border-0 outline-none w-full mb-4 placeholder:opacity-50 max-w-4xl"
                  style={{ textAlign: contentTextAlign }}
                  placeholder="Enter title..."
                  minRows={1}
                />
                <AutoResizeTextarea
                  value={(slide.content as any).text || ""}
                  onChange={(e) =>
                    onUpdateContent?.({ ...slide.content, text: e.target.value })
                  }
                  className="slide-content-body flex-1 min-h-[200px] bg-transparent border-0 outline-none w-full max-w-4xl placeholder:opacity-40 resize-none"
                  style={{ textAlign: contentTextAlign }}
                  placeholder="Enter your content here... (this slide emphasizes the main text)"
                  minRows={8}
                />
              </>
            ) : (
              <>
                <h2 className="text-lg md:text-xl font-semibold drop-shadow-lg mb-4 break-words max-w-4xl" style={{ textAlign: contentTextAlign }}>
                  {(slide.content as any).title || "Untitled"}
                </h2>
                <div className="slide-content-body flex-1 text-base md:text-lg leading-relaxed break-words max-w-4xl" style={{ textAlign: contentTextAlign }}>
                  {(slide.content as any).text}
                </div>
              </>
            )}
          </div>
        </SlideWrapper>
      );
    }

    case "image":
      return (
        <SlideWrapper slide={slide} themeId={themeId}>
          <div className="relative w-full h-full flex flex-col min-h-0 p-4">
            {(slide.content as any).imageUrl ? (
              <>
                <div className="flex-1 min-h-0 rounded-lg overflow-hidden">
                  <img
                    src={(slide.content as any).imageUrl}
                    alt={(slide.content as any).title || "Slide image"}
                    className="w-full h-full object-cover"
                  />
                </div>
                {isEditing && (
                  <div className="flex-shrink-0 mt-3">
                    <ImageUploader
                      value={(slide.content as any).imageUrl}
                      onChange={(url) =>
                        onUpdateContent?.({ ...slide.content, imageUrl: url })
                      }
                      placeholder="Replace image"
                      className="min-h-[100px]"
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 min-h-0 flex items-center justify-center">
                {isEditing ? (
                  <ImageUploader
                    value=""
                    onChange={(url) =>
                      onUpdateContent?.({ ...slide.content, imageUrl: url })
                    }
                    placeholder="Upload or paste image URL"
                    className="w-full max-w-md min-h-[180px]"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Image className="w-20 h-20 opacity-40 mb-4" />
                    <p className="text-sm">No image added yet</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </SlideWrapper>
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
