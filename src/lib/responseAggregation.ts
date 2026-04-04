/**
 * Shared aggregation helpers for lecture responses. Used by Present (live), Student (results), and LectureAnalytics.
 * Each function expects an array of response rows with response_data (JSON from DB).
 */
import type { Slide } from "@/types/slides";

/** Shape passed to SlideRenderer as `liveResults` (Presenter + Student full results) */
export function buildLiveResultsPayload(
  slide: Slide | null | undefined,
  responses: { response_data?: unknown }[]
): Record<string, unknown> | null {
  if (!slide) return null;

  switch (slide.type) {
    case "quiz": {
      const quizContent = slide.content as { options?: string[]; correctAnswer?: number };
      return {
        type: "quiz",
        results: aggregateQuizResponses(responses, quizContent.options || []),
        options: quizContent.options || [],
        correctAnswer: quizContent.correctAnswer,
      };
    }
    case "poll": {
      const pollContent = slide.content as { options?: string[] };
      return {
        type: "poll",
        results: aggregatePollResponses(responses, pollContent.options || []),
        options: pollContent.options || [],
      };
    }
    case "poll_quiz": {
      const pollQuizContent = slide.content as { options?: string[]; correctAnswer?: number };
      return {
        type: "poll_quiz",
        results: aggregatePollResponses(responses, pollQuizContent.options || []),
        options: pollQuizContent.options || [],
        correctAnswer: pollQuizContent.correctAnswer,
      };
    }
    case "yesno":
      return {
        type: "yesno",
        results: aggregateYesNoResponses(responses),
      };
    case "wordcloud":
      return {
        type: "wordcloud",
        words: aggregateWordCloudResponses(responses),
      };
    case "scale":
      return {
        type: "scale",
        results: aggregateScaleResponses(responses),
      };
    case "guess_number": {
      const guessContent = slide.content as { correctNumber?: number };
      return {
        type: "guess_number",
        results: aggregateGuessResponses(responses, guessContent.correctNumber || 0),
      };
    }
    case "ranking": {
      const rankingContent = slide.content as { items?: string[] };
      return {
        type: "ranking",
        rankings: aggregateRankingResponses(responses, rankingContent.items || []),
      };
    }
    case "sentiment_meter": {
      const { average, distribution } = aggregateSentimentResponses(responses);
      return {
        type: "sentiment_meter",
        average,
        distribution,
        results: { average, distribution },
      };
    }
    case "agree_spectrum": {
      const { average, distribution } = aggregateSentimentResponses(responses);
      return {
        type: "agree_spectrum",
        average,
        positions: distribution,
        distribution,
        results: { average, distribution },
      };
    }
    default:
      return null;
  }
}
export function aggregateQuizResponses(responses: { response_data?: any }[], options: string[]) {
  const counts = options.map(() => 0);
  responses.forEach((r) => {
    const answer = r.response_data?.answer;
    if (typeof answer === "number" && answer >= 0 && answer < options.length) counts[answer]++;
  });
  return counts;
}

export function aggregatePollResponses(responses: { response_data?: any }[], options: string[]) {
  const counts = options.map(() => 0);
  responses.forEach((r) => {
    const answer = r.response_data?.answer;
    if (typeof answer === "number" && answer >= 0 && answer < options.length) counts[answer]++;
  });
  return counts;
}

export function aggregateYesNoResponses(responses: { response_data?: any }[]) {
  let yes = 0,
    no = 0;
  responses.forEach((r) => {
    if (r.response_data?.answer === true) yes++;
    else if (r.response_data?.answer === false) no++;
  });
  return { yes, no };
}

export function aggregateWordCloudResponses(responses: { response_data?: any }[]) {
  const words: Record<string, number> = {};
  responses.forEach((r) => {
    const word = r.response_data?.word ?? r.response_data?.text;
    if (word) {
      const k = String(word).toLowerCase();
      words[k] = (words[k] || 0) + 1;
    }
  });
  return Object.entries(words).map(([text, count]) => ({ text, count }));
}

export function aggregateScaleResponses(responses: { response_data?: any }[]) {
  const values: number[] = [];
  responses.forEach((r) => {
    const value = r.response_data?.value;
    if (typeof value === "number") values.push(value);
  });
  if (values.length === 0) return { average: 0, distribution: [] };
  const average = values.reduce((a, b) => a + b, 0) / values.length;
  return { average, distribution: values };
}

export function aggregateGuessResponses(
  responses: { response_data?: any }[],
  correctNumber: number
) {
  const guesses: number[] = [];
  responses.forEach((r) => {
    const guess = r.response_data?.guess;
    if (typeof guess === "number") guesses.push(guess);
  });
  return { guesses, correctNumber };
}

export function aggregateRankingResponses(
  responses: { response_data?: any }[],
  items: string[]
) {
  if (responses.length === 0) return { rankings: [] };
  const rankSums: Record<string, number[]> = {};
  items.forEach((item) => {
    rankSums[item] = [];
  });
  responses.forEach((r) => {
    const ranking = r.response_data?.ranking;
    if (Array.isArray(ranking)) {
      ranking.forEach((item: string, index: number) => {
        if (rankSums[item]) rankSums[item].push(index + 1);
      });
    }
  });
  const rankings = items.map((item) => ({
    item,
    avgRank:
      rankSums[item].length > 0
        ? rankSums[item].reduce((a, b) => a + b, 0) / rankSums[item].length
        : 0,
  }));
  return { rankings };
}

export function aggregateSentimentResponses(responses: { response_data?: any }[]) {
  const values: number[] = [];
  responses.forEach((r) => {
    const value = r.response_data?.value;
    if (typeof value === "number") values.push(value);
  });
  if (values.length === 0) return { average: 50, distribution: [] };
  const average = values.reduce((a, b) => a + b, 0) / values.length;
  return { average, distribution: values };
}

