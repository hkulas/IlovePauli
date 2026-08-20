import type { Grade, Word } from "./types";

export const ONE_MINUTE_MS = 60_000;
export const TEN_MINUTES_MS = 10 * 60_000;
const MS_PER_DAY = 86_400_000;
const MAX_SESSION_REQUEUES = 2;

export function qualityFor(grade: Grade): number {
  if (grade === "correct") return 5;
  if (grade === "almost") return 4;
  return 1;
}

export function learningStepOf(word: Word): number {
  return word.learningStep ?? 0;
}

function withEase(word: Word, q: number): Word {
  let easeFactor = word.easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;
  return { ...word, easeFactor };
}

/** Anki-style: 1 minute, 10 minutes, then SM-2 (1 day, 6 days, ease × interval). */
export function review(word: Word, grade: Grade, now = Date.now()): Word {
  const q = qualityFor(grade);
  const step = learningStepOf(word);
  const previousEase = word.easeFactor;
  const eased = withEase(word, q);

  if (q < 3) {
    return {
      ...eased,
      repetitions: 0,
      intervalDays: 0,
      learningStep: 0,
      nextReviewAt: now + TEN_MINUTES_MS,
    };
  }

  if (eased.repetitions === 0) {
    if (step === 0) {
      return {
        ...eased,
        learningStep: 1,
        intervalDays: 0,
        nextReviewAt: now + ONE_MINUTE_MS,
      };
    }
    if (step === 1) {
      return {
        ...eased,
        learningStep: 2,
        intervalDays: 0,
        nextReviewAt: now + TEN_MINUTES_MS,
      };
    }
    return {
      ...eased,
      learningStep: 2,
      repetitions: 1,
      intervalDays: 1,
      nextReviewAt: now + MS_PER_DAY,
    };
  }

  let { intervalDays, repetitions } = eased;
  if (repetitions === 1) {
    intervalDays = 6;
    repetitions = 2;
  } else {
    intervalDays = Math.max(1, Math.round(intervalDays * previousEase));
    repetitions += 1;
  }

  return {
    ...eased,
    intervalDays,
    repetitions,
    nextReviewAt: now + intervalDays * MS_PER_DAY,
  };
}

export function shouldRequeueInSession(updated: Word, extrasAlready: number): boolean {
  if (extrasAlready >= MAX_SESSION_REQUEUES) return false;
  return updated.repetitions === 0 && learningStepOf(updated) <= 1;
}

export function isDue(word: Word, now = Date.now()): boolean {
  return word.nextReviewAt <= now;
}

export function pickSession(
  words: Word[],
  topicId: string | "all",
  cap: number,
  now = Date.now(),
): Word[] {
  return words
    .filter((w) => (topicId === "all" || w.topicId === topicId) && isDue(w, now))
    .sort((a, b) => a.nextReviewAt - b.nextReviewAt || a.createdAt - b.createdAt)
    .slice(0, cap);
}
