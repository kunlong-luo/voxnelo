import type { LearningState } from './recommend';

const DAY_MS = 24 * 60 * 60 * 1000;
export const REVIEW_INTERVAL_DAYS = [1, 3, 7, 14, 30] as const;

function safeStep(value: unknown): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? Math.min(value, REVIEW_INTERVAL_DAYS.length)
    : 0;
}

function validTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/** A user-marked review is due immediately until a real recording or manual
 * confirmation schedules it. Historical states with no schedule keep a
 * conservative one-day interval from their last recorded practice.
 * Dates are elapsed 24-hour intervals, not local-midnight/streak claims. */
export function reviewSchedule(
  state: Pick<LearningState, 'review'|'lastPracticedAt'|'nextReviewAt'|'reviewStep'>,
  asOf = Date.now(),
): { dueAt: number; due: boolean; intervalDays: number } | undefined {
  if (!state.review) return undefined;
  const dueAt = validTimestamp(state.nextReviewAt) ? state.nextReviewAt
    : validTimestamp(state.lastPracticedAt) ? state.lastPracticedAt + DAY_MS
    : 0;
  const index = Math.min(Math.max(safeStep(state.reviewStep) - 1, 0), REVIEW_INTERVAL_DAYS.length - 1);
  return { dueAt, due: dueAt <= asOf, intervalDays: REVIEW_INTERVAL_DAYS[index]! };
}

/** Advance only on explicit self-confirmation or a finished recording.
 * This is NOT automated pronunciation grading or a claim of mastery. */
export function nextReviewSchedule(
  state: Pick<LearningState, 'reviewStep'>,
  at = Date.now(),
): Pick<LearningState, 'reviewStep'|'nextReviewAt'> {
  const step = safeStep(state.reviewStep);
  const days = REVIEW_INTERVAL_DAYS[Math.min(step, REVIEW_INTERVAL_DAYS.length - 1)]!;
  return {
    reviewStep: Math.min(step + 1, REVIEW_INTERVAL_DAYS.length),
    nextReviewAt: at + days * DAY_MS,
  };
}
