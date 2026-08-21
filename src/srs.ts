import type { Grade, Word } from "./types";

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

/** First pass waits 10 minutes; a miss stays due now. Then SM-2 (1 day, 6 days, ease × interval). */
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
      nextReviewAt: now,
    };
  }

  if (eased.repetitions === 0) {
    if (step === 0 || step === 1) {
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

export function shouldRequeueInSession(extrasAlready: number, grade: Grade): boolean {
  if (extrasAlready >= MAX_SESSION_REQUEUES) return false;
  return grade === "wrong";
}

export function isDue(word: Word, now = Date.now()): boolean {
  return word.nextReviewAt <= now;
}

/** Never asked yet, so typing it blind would be a guess. A miss sets nextReviewAt to now. */
export function isNewWord(word: Word): boolean {
  return word.nextReviewAt === 0 && word.repetitions === 0;
}

export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const current = out[i];
    const swap = out[j];
    if (current === undefined || swap === undefined) continue;
    out[i] = swap;
    out[j] = current;
  }
  return out;
}

export function insertIndexAfterCurrent(
  current: number,
  length: number,
  rng: () => number = Math.random,
): number {
  const from = current + 1;
  const slots = length - from + 1;
  if (slots <= 0) return length;
  return from + Math.floor(rng() * slots);
}

export function pickSession(
  words: Word[],
  topicId: string | "all",
  cap: number,
  now = Date.now(),
  rng: () => number = Math.random,
): Word[] {
  const due = words.filter((w) => (topicId === "all" || w.topicId === topicId) && isDue(w, now));
  return shuffle(due, rng).slice(0, cap);
}
