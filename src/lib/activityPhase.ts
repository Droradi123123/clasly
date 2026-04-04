import type { Slide } from "@/types/slides";
import {
  getResolvedActivitySettings,
  isParticipativeSlide,
  isQuizSlide,
} from "@/types/slides";

/**
 * Single source of truth for voting/results phases (presenter + students).
 * - Presenter: pass `clockOffsetMs: 0` (reference clock).
 * - Students: pass `clockOffsetMs` from broadcast skew so elapsed time aligns with the presenter.
 */
export type ActivityPhaseState = {
  participative: boolean;
  hasTimer: boolean;
  durationSeconds: number;
  startedAtMs: number;
  elapsedMs: number;
  inVotingPhase: boolean;
  inResultsPhase: boolean;
  /** Presenter SlideRenderer: show aggregate bars / live updates */
  showLiveResults: boolean;
  /** Presenter SlideRenderer: reveal correct answer (quiz types) */
  showCorrectAnswer: boolean;
  remainingSec: number;
};

export function getActivityPhaseState(
  slide: Slide | null | undefined,
  activityStartedAtIso: string | null | undefined,
  args: { nowMs: number; clockOffsetMs?: number }
): ActivityPhaseState {
  const clockOffsetMs = args.clockOffsetMs ?? 0;
  const effectiveNowMs = args.nowMs + clockOffsetMs;

  const participative = !!(slide && isParticipativeSlide(slide.type));
  const activityResolved =
    participative && slide ? getResolvedActivitySettings(slide) : null;
  const hasTimer = !!(activityResolved?.hasTimer);
  const durationSeconds = activityResolved?.durationSeconds ?? 0;

  const startedAtMs = activityStartedAtIso ? Date.parse(activityStartedAtIso) : NaN;
  const elapsedMs =
    participative && activityResolved && !Number.isNaN(startedAtMs)
      ? effectiveNowMs - startedAtMs
      : 0;

  const inVotingPhase =
    participative &&
    activityResolved &&
    hasTimer &&
    (Number.isNaN(startedAtMs) || elapsedMs < durationSeconds * 1000);

  const inResultsPhase =
    participative &&
    activityResolved &&
    hasTimer &&
    !Number.isNaN(startedAtMs) &&
    elapsedMs >= durationSeconds * 1000;

  const remainingSec =
    participative && activityResolved && hasTimer && !Number.isNaN(startedAtMs)
      ? Math.max(0, Math.ceil(durationSeconds - elapsedMs / 1000))
      : 0;

  /** Timed activities: show live aggregates during voting; correct answers stay gated via `showCorrectAnswer`. */
  const showLiveResults =
    !participative || !hasTimer || inVotingPhase || inResultsPhase;
  const showCorrectAnswer =
    !slide ||
    !isQuizSlide(slide.type) ||
    !participative ||
    !hasTimer ||
    inResultsPhase;

  return {
    participative,
    hasTimer,
    durationSeconds,
    startedAtMs,
    elapsedMs,
    inVotingPhase,
    inResultsPhase,
    showLiveResults,
    showCorrectAnswer,
    remainingSec,
  };
}
