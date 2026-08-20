export type Topic = {
  id: string;
  name: string;
};

export type Word = {
  id: string;
  english: string;
  polish: string;
  topicId: string;
  createdAt: number;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReviewAt: number;
  /** 0 new, 1 after first look (1 min), 2 after second look (10 min). Missing on old data. */
  learningStep?: number;
};

export type Grade = "correct" | "almost" | "wrong";

export type BackupFile = {
  version: 1;
  exportedAt: string;
  topics: Topic[];
  words: Word[];
};

export const DEFAULT_EASE = 2.5;
export const SESSION_CAP = 20;

export function newWordDraft(
  english: string,
  polish: string,
  topicId: string,
  now = Date.now(),
): Word {
  return {
    id: crypto.randomUUID(),
    english,
    polish,
    topicId,
    createdAt: now,
    easeFactor: DEFAULT_EASE,
    intervalDays: 0,
    repetitions: 0,
    nextReviewAt: 0,
    learningStep: 0,
  };
}

export function newTopic(name: string): Topic {
  return { id: crypto.randomUUID(), name };
}
