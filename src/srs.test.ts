import { describe, expect, it } from "vitest";
import {
  isDue,
  ONE_MINUTE_MS,
  pickSession,
  qualityFor,
  review,
  shouldRequeueInSession,
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
  let card = word();
  card = review(card, "correct", now);
  card = review(card, "correct", now);
  return review(card, "correct", now);
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

  it("puts a new pass back in 1 minute", () => {
    const next = review(word(), "correct", now);
    expect(next.repetitions).toBe(0);
    expect(next.learningStep).toBe(1);
    expect(next.nextReviewAt).toBe(now + ONE_MINUTE_MS);
    expect(shouldRequeueInSession(next, 0)).toBe(true);
  });

  it("puts the second pass back in 10 minutes", () => {
    const next = review(review(word(), "correct", now), "correct", now);
    expect(next.learningStep).toBe(2);
    expect(next.repetitions).toBe(0);
    expect(next.nextReviewAt).toBe(now + TEN_MINUTES_MS);
    expect(shouldRequeueInSession(next, 0)).toBe(false);
  });

  it("graduates the third pass to 1 day", () => {
    const next = learnThenGraduate(now);
    expect(next.repetitions).toBe(1);
    expect(next.intervalDays).toBe(1);
    expect(next.easeFactor).toBeCloseTo(2.8);
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

  it("sends a miss back in 10 minutes and reopens learning", () => {
    const learned = review(learnThenGraduate(now), "correct", now);
    const missed = review(learned, "wrong", now);
    expect(missed.repetitions).toBe(0);
    expect(missed.learningStep).toBe(0);
    expect(missed.intervalDays).toBe(0);
    expect(missed.nextReviewAt).toBe(now + TEN_MINUTES_MS);
    expect(missed.easeFactor).toBeLessThan(learned.easeFactor);
  });

  it("treats almost as a pass on a new card", () => {
    const next = review(word(), "almost", now);
    expect(next.learningStep).toBe(1);
    expect(next.nextReviewAt).toBe(now + ONE_MINUTE_MS);
  });

  it("stops requeueing a card after two extras", () => {
    const next = review(word(), "correct", now);
    expect(shouldRequeueInSession(next, 2)).toBe(false);
  });
});

describe("pickSession", () => {
  it("takes due cards in a topic up to the cap", () => {
    const words = [
      word({ id: "a", topicId: "food", nextReviewAt: 5, createdAt: 2 }),
      word({ id: "b", topicId: "food", nextReviewAt: 1, createdAt: 1 }),
      word({ id: "c", topicId: "verbs", nextReviewAt: 0, createdAt: 1 }),
      word({ id: "d", topicId: "food", nextReviewAt: 9_999, createdAt: 1 }),
    ];
    const session = pickSession(words, "food", 2, 10);
    expect(session.map((w) => w.id)).toEqual(["b", "a"]);
  });

  it("treats nextReviewAt 0 as due", () => {
    expect(isDue(word({ nextReviewAt: 0 }), 1)).toBe(true);
  });
});
