import { describe, expect, it } from "vitest";
import {
  insertIndexAfterCurrent,
  isDue,
  pickSession,
  qualityFor,
  review,
  shouldRequeueInSession,
  shuffle,
  TEN_MINUTES_MS,
} from "./srs";
import { DEFAULT_EASE, type Word } from "./types";

function word(overrides: Partial<Word> = {}): Word {
  return {
    id: "1",
    english: "cat",
    polish: "kot",
    topicId: "t",
    createdAt: 1,
    easeFactor: DEFAULT_EASE,
    intervalDays: 0,
    repetitions: 0,
    nextReviewAt: 0,
    learningStep: 0,
    ...overrides,
  };
}

function learnThenGraduate(now: number): Word {
  return review(review(word(), "correct", now), "correct", now);
}

describe("qualityFor", () => {
  it("maps grades to SM-2 qualities", () => {
    expect(qualityFor("correct")).toBe(5);
    expect(qualityFor("almost")).toBe(4);
    expect(qualityFor("wrong")).toBe(1);
  });
});

describe("review learning steps", () => {
  const now = 1_000_000;

  it("puts a first pass back in 10 minutes and does not requeue", () => {
    const next = review(word(), "correct", now);
    expect(next.repetitions).toBe(0);
    expect(next.learningStep).toBe(2);
    expect(next.nextReviewAt).toBe(now + TEN_MINUTES_MS);
    expect(shouldRequeueInSession(0, "correct")).toBe(false);
  });

  it("graduates the second pass to 1 day", () => {
    const next = learnThenGraduate(now);
    expect(next.repetitions).toBe(1);
    expect(next.intervalDays).toBe(1);
    expect(next.easeFactor).toBeCloseTo(2.7);
    expect(next.nextReviewAt).toBe(now + 86_400_000);
  });

  it("schedules the next review after graduation for 6 days", () => {
    const next = review(learnThenGraduate(now), "correct", now);
    expect(next.repetitions).toBe(2);
    expect(next.intervalDays).toBe(6);
  });

  it("multiplies interval by previous ease on later successes", () => {
    let card = learnThenGraduate(now);
    card = review(card, "correct", now);
    const easeBefore = card.easeFactor;
    card = review(card, "correct", now);
    expect(card.intervalDays).toBe(Math.round(6 * easeBefore));
    expect(card.repetitions).toBe(3);
  });

  it("keeps a miss due now and requeues it", () => {
    const learned = review(learnThenGraduate(now), "correct", now);
    const missed = review(learned, "wrong", now);
    expect(missed.repetitions).toBe(0);
    expect(missed.learningStep).toBe(0);
    expect(missed.intervalDays).toBe(0);
    expect(missed.nextReviewAt).toBe(now);
    expect(missed.easeFactor).toBeLessThan(learned.easeFactor);
    expect(shouldRequeueInSession(0, "wrong")).toBe(true);
  });

  it("treats almost as a pass on a new card", () => {
    const next = review(word(), "almost", now);
    expect(next.learningStep).toBe(2);
    expect(next.nextReviewAt).toBe(now + TEN_MINUTES_MS);
    expect(shouldRequeueInSession(0, "almost")).toBe(false);
  });

  it("gives a legacy 1-minute step another 10 minutes instead of graduating", () => {
    const legacy = word({ learningStep: 1, nextReviewAt: now });
    const next = review(legacy, "correct", now);
    expect(next.repetitions).toBe(0);
    expect(next.learningStep).toBe(2);
    expect(next.nextReviewAt).toBe(now + TEN_MINUTES_MS);
  });

  it("stops requeueing a miss after two extras", () => {
    expect(shouldRequeueInSession(2, "wrong")).toBe(false);
  });
});

describe("shuffle", () => {
  const keepOrder = () => 0.999;

  it("keeps order when rng always picks the current index", () => {
    expect(shuffle(["a", "b", "c"], keepOrder)).toEqual(["a", "b", "c"]);
  });

  it("permutes when rng always picks 0", () => {
    expect(shuffle(["a", "b", "c"], () => 0)).toEqual(["b", "c", "a"]);
  });
});

describe("insertIndexAfterCurrent", () => {
  it("inserts just after the current card when rng is 0", () => {
    expect(insertIndexAfterCurrent(0, 3, () => 0)).toBe(1);
  });

  it("can insert at the end", () => {
    expect(insertIndexAfterCurrent(0, 3, () => 0.99)).toBe(3);
  });
});

describe("pickSession", () => {
  const keepOrder = () => 0.999;

  it("takes due cards in a topic up to the cap", () => {
    const words = [
      word({ id: "a", topicId: "food", nextReviewAt: 5, createdAt: 2 }),
      word({ id: "b", topicId: "food", nextReviewAt: 1, createdAt: 1 }),
      word({ id: "c", topicId: "verbs", nextReviewAt: 0, createdAt: 1 }),
      word({ id: "d", topicId: "food", nextReviewAt: 9_999, createdAt: 1 }),
    ];
    const session = pickSession(words, "food", 2, 10, keepOrder);
    expect(session.map((w) => w.id)).toEqual(["a", "b"]);
  });

  it("treats nextReviewAt 0 as due", () => {
    expect(isDue(word({ nextReviewAt: 0 }), 1)).toBe(true);
  });

  it("includes immediate misses and skips a 10-minute pass", () => {
    const now = 1_000;
    const words = [
      word({ id: "good", nextReviewAt: now + TEN_MINUTES_MS }),
      word({ id: "bad", nextReviewAt: now }),
    ];
    expect(pickSession(words, "all", 20, now, keepOrder).map((w) => w.id)).toEqual(["bad"]);
  });

  it("does not sort due cards by nextReviewAt", () => {
    const words = [
      word({ id: "later", nextReviewAt: 8 }),
      word({ id: "sooner", nextReviewAt: 1 }),
    ];
    expect(pickSession(words, "all", 20, 10, keepOrder).map((w) => w.id)).toEqual(["later", "sooner"]);
  });
});
