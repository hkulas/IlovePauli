import type { Grade, Word } from "./types";

const MS_PER_DAY = 86_400_000;

export function qualityFor(grade: Grade): number {
  if (grade === "correct") return 5;
  if (grade === "almost") return 4;
  return 1;
}

/** SuperMemo SM-2. Interval uses the ease factor from before this review. */
export function review(word: Word, grade: Grade, now = Date.now()): Word {
  const q = qualityFor(grade);
  let { easeFactor, intervalDays, repetitions } = word;

  if (q < 3) {
    repetitions = 0;
    intervalDays = 1;
  } else if (repetitions === 0) {
    intervalDays = 1;
    repetitions = 1;
  } else if (repetitions === 1) {
    intervalDays = 6;
    repetitions = 2;
  } else {
    intervalDays = Math.max(1, Math.round(intervalDays * easeFactor));
    repetitions += 1;
  }

  easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  return {
    ...word,
    easeFactor,
    intervalDays,
    repetitions,
    nextReviewAt: now + intervalDays * MS_PER_DAY,
  };
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
