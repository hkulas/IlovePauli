import { describe, expect, it } from "vitest";
import { isDue, pickSession, qualityFor, review } from "./srs";
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
    ...overrides,
  };
}

describe("qualityFor", () => {
  it("maps grades to SM-2 qualities", () => {
    expect(qualityFor("correct")).toBe(5);
    expect(qualityFor("almost")).toBe(4);
    expect(qualityFor("wrong")).toBe(1);
  });
});

describe("review", () => {
  const now = 1_000_000;

  it("schedules first success for 1 day and raises ease", () => {
    const next = review(word(), "correct", now);
    expect(next.repetitions).toBe(1);
    expect(next.intervalDays).toBe(1);
    expect(next.easeFactor).toBeCloseTo(2.6);
    expect(next.nextReviewAt).toBe(now + 86_400_000);
  });

  it("schedules second success for 6 days", () => {
    const first = review(word(), "correct", now);
    const second = review(first, "correct", now);
    expect(second.repetitions).toBe(2);
    expect(second.intervalDays).toBe(6);
  });

  it("multiplies interval by previous ease on later successes", () => {
    let card = word();
    card = review(card, "correct", now);
    card = review(card, "correct", now);
    const easeBefore = card.easeFactor;
    card = review(card, "correct", now);
    expect(card.intervalDays).toBe(Math.round(6 * easeBefore));
    expect(card.repetitions).toBe(3);
  });

  it("resets repetitions on a miss and reviews tomorrow", () => {
    const learned = review(review(word(), "correct", now), "correct", now);
    const missed = review(learned, "wrong", now);
    expect(missed.repetitions).toBe(0);
    expect(missed.intervalDays).toBe(1);
    expect(missed.easeFactor).toBeLessThan(learned.easeFactor);
  });

  it("treats almost as a pass (quality 4)", () => {
    const next = review(word(), "almost", now);
    expect(next.repetitions).toBe(1);
    expect(next.intervalDays).toBe(1);
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
