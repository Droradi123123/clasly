import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  Trophy,
  BarChart3,
  MessageCircle,
  Loader2,
  Presentation,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/layout/Header";
import {
  getLecture,
  getStudents,
  getAllResponsesForLecture,
} from "@/lib/lectureService";
import {
  aggregateQuizResponses,
  aggregatePollResponses,
  aggregateYesNoResponses,
  aggregateWordCloudResponses,
  aggregateScaleResponses,
  aggregateGuessResponses,
  aggregateRankingResponses,
  aggregateSentimentResponses,
  aggregateFinishSentenceResponses,
} from "@/lib/responseAggregation";
import { supabase } from "@/integrations/supabase/client";
import { Slide } from "@/types/slides";

const INTERACTIVE_TYPES = new Set([
  "quiz",
  "poll",
  "yesno",
  "wordcloud",
  "scale",
  "guess_number",
  "ranking",
  "sentiment_meter",
  "agree_spectrum",
  "finish_sentence",
]);

interface QuestionRow {
  id: string;
  question: string;
  is_answered: boolean;
  created_at: string;
  answered_at: string | null;
}

export default function LectureAnalytics() {
  const { lectureId } = useParams<{ lectureId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [lecture, setLecture] = useState<any>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [allResponses, setAllResponses] = useState<any[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);

  useEffect(() => {
    if (!lectureId) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    const load = async () => {
      try {
        const [lectureData, studentsData, responsesData] = await Promise.all([
          getLecture(lectureId),
          getStudents(lectureId),
          getAllResponsesForLecture(lectureId),
        ]);
        if (cancelled) return;
        setLecture(lectureData);
        setSlides((lectureData?.slides as Slide[]) || []);
        setStudents(studentsData || []);
        setAllResponses(responsesData || []);

        const { data: questionsData } = await supabase
          .from("questions")
          .select("id, question, is_answered, created_at, answered_at")
          .eq("lecture_id", lectureId)
          .order("created_at", { ascending: false });
        if (!cancelled) setQuestions(questionsData || []);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [lectureId]);

  const responsesBySlide = allResponses.reduce<Record<number, any[]>>((acc, r) => {
    const idx = r.slide_index;
    if (!acc[idx]) acc[idx] = [];
    acc[idx].push(r);
    return acc;
  }, {});

  const getSlideSummary = (slide: Slide, slideIndex: number) => {
    const responses = responsesBySlide[slideIndex] || [];
    if (responses.length === 0) return null;
    const content = slide.content as any;

    switch (slide.type) {
      case "quiz":
        return {
          type: "quiz",
          options: content?.options || [],
          correctAnswer: content?.correctAnswer,
          counts: aggregateQuizResponses(responses, content?.options || []),
          total: responses.length,
        };
      case "poll":
        return {
          type: "poll",
          options: content?.options || [],
          counts: aggregatePollResponses(responses, content?.options || []),
          total: responses.length,
        };
      case "yesno":
        return {
          type: "yesno",
          ...aggregateYesNoResponses(responses),
          total: responses.length,
        };
      case "wordcloud":
        return {
          type: "wordcloud",
          words: aggregateWordCloudResponses(responses),
          total: responses.length,
        };
      case "scale":
        return {
          type: "scale",
          ...aggregateScaleResponses(responses),
          total: responses.length,
        };
      case "guess_number":
        return {
          type: "guess_number",
          ...aggregateGuessResponses(responses, content?.correctNumber ?? 0),
          total: responses.length,
        };
      case "ranking":
        return {
          type: "ranking",
          ...aggregateRankingResponses(responses, content?.items || []),
          total: responses.length,
        };
      case "sentiment_meter":
      case "agree_spectrum":
        return {
          type: slide.type,
          ...aggregateSentimentResponses(responses),
          total: responses.length,
        };
      case "finish_sentence":
        return {
          type: "finish_sentence",
          ...aggregateFinishSentenceResponses(responses),
          total: responses.length,
        };
      default:
        return null;
    }
  };

  const interactiveSlides = slides
    .map((slide, index) => ({ slide, index }))
    .filter(({ slide }) => INTERACTIVE_TYPES.has(slide.type));

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!lecture) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Lecture not found</p>
        <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
      </div>
    );
  }

  const isEnded = lecture.status === "ended";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-12 px-4">
        <div className="container max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">
                {lecture.title}
              </h1>
              <p className="text-muted-foreground">Lecture analytics</p>
            </div>
          </div>

          {!isEnded && (
            <Card className="mb-8 border-amber-500/30 bg-amber-500/5">
              <CardContent className="pt-6">
                <p className="text-foreground">
                  This lecture has not ended yet. End it from the Present view to
                  see full analytics. You can still view current data below.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => navigate(`/present/${lectureId}`)}
                >
                  <Presentation className="w-4 h-4 mr-2" />
                  Go to Present
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Participants */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Participants ({students.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <p className="text-muted-foreground">No participants joined.</p>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-muted-foreground border-b pb-2">
                    <span>Name</span>
                    <span className="flex items-center gap-1">
                      <Trophy className="w-4 h-4" />
                      Points
                    </span>
                  </div>
                  {students
                    .sort((a, b) => (b.points || 0) - (a.points || 0))
                    .map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-xl">{s.emoji || "😊"}</span>
                          <span className="font-medium">{s.name}</span>
                        </span>
                        <span className="font-mono text-primary">
                          {s.points ?? 0}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Interactive slides results */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Activity by slide
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Answers and results for each interactive slide
              </p>
            </CardHeader>
            <CardContent className="space-y-8">
              {interactiveSlides.length === 0 ? (
                <p className="text-muted-foreground">
                  No interactive slides in this lecture.
                </p>
              ) : (
                interactiveSlides.map(({ slide, index }) => {
                  const summary = getSlideSummary(slide, index);
                  if (!summary) return null;
                  const content = slide.content as any;

                  return (
                    <div
                      key={`${index}-${slide.id}`}
                      className="rounded-xl border border-border bg-card p-4"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Target className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">
                          Slide {index + 1}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-muted capitalize">
                          {summary.type.replace("_", " ")}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {summary.total} response{summary.total !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {slide.type === "quiz" && "options" in summary && (
                        <div className="space-y-2">
                          {(summary.options as string[]).map((opt, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-sm w-8">
                                {i === content?.correctAnswer ? "✓" : ""}
                              </span>
                              <div className="flex-1 flex items-center gap-2">
                                <div
                                  className="h-6 bg-primary/20 rounded min-w-[4rem] flex items-center px-2"
                                  style={{
                                    width: `${
                                      Math.max(
                                        10,
                                        (summary.counts[i] / summary.total) * 100
                                      )}%`,
                                  }}
                                >
                                  <span className="text-xs font-medium">
                                    {summary.counts[i]}
                                  </span>
                                </div>
                                <span className="text-sm">{opt}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {slide.type === "poll" && "options" in summary && (
                        <div className="space-y-2">
                          {(summary.options as string[]).map((opt, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <div
                                className="h-6 bg-primary/20 rounded min-w-[4rem] flex items-center px-2"
                                style={{
                                  width: `${
                                    Math.max(
                                      10,
                                      (summary.counts[i] / summary.total) * 100
                                    )}%`,
                                  }}
                                >
                                  <span className="text-xs font-medium">
                                    {summary.counts[i]}
                                  </span>
                                </div>
                                <span className="text-sm">{opt}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {"yes" in summary && "no" in summary && (
                        <div className="flex gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Yes:</span>
                            <span className="font-mono text-primary">
                              {summary.yes}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">No:</span>
                            <span className="font-mono text-primary">
                              {summary.no}
                            </span>
                          </div>
                        </div>
                      )}

                      {"average" in summary && typeof summary.average === "number" && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Average:</span>
                          <span className="font-mono text-primary">
                            {Math.round(summary.average)}%
                          </span>
                        </div>
                      )}

                      {"words" in summary && Array.isArray(summary.words) && (
                        <div className="flex flex-wrap gap-2">
                          {(summary.words as { text: string; count: number }[])
                            .sort((a, b) => b.count - a.count)
                            .slice(0, 20)
                            .map((w, i) => (
                              <span
                                key={i}
                                className="px-2 py-1 rounded bg-muted text-sm"
                              >
                                {w.text} ({w.count})
                              </span>
                            ))}
                        </div>
                      )}

                      {"texts" in summary && Array.isArray(summary.texts) && (
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {(summary.texts as string[]).slice(0, 10).map((t, i) => (
                            <li key={i}>{t}</li>
                          ))}
                          {(summary.texts as string[]).length > 10 && (
                            <li className="text-muted-foreground">
                              +{(summary.texts as string[]).length - 10} more
                            </li>
                          )}
                        </ul>
                      )}

                      {"rankings" in summary &&
                        Array.isArray(summary.rankings) &&
                        (summary.rankings as { item: string; avgRank: number }[]).length > 0 && (
                          <div className="space-y-1 text-sm">
                            {(summary.rankings as { item: string; avgRank: number }[])
                              .sort((a, b) => a.avgRank - b.avgRank)
                              .map((r, i) => (
                                <div key={i} className="flex justify-between">
                                  <span>{r.item}</span>
                                  <span className="text-muted-foreground">
                                    Avg rank: {r.avgRank.toFixed(1)}
                                  </span>
                                </div>
                              ))}
                          </div>
                        )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Q&A */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Student questions ({questions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {questions.length === 0 ? (
                <p className="text-muted-foreground">No questions submitted.</p>
              ) : (
                <ul className="space-y-3">
                  {questions.map((q) => (
                    <li
                      key={q.id}
                      className={`p-3 rounded-lg border ${
                        q.is_answered
                          ? "bg-muted/50 border-border/50"
                          : "border-primary/20"
                      }`}
                    >
                      <p className="font-medium text-foreground">{q.question}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(q.created_at).toLocaleString()}
                        {q.is_answered && " · Answered"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
