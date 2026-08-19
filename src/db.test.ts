import { describe, expect, it } from "vitest";
import { parseBackup } from "./db";

describe("parseBackup", () => {
  const valid = {
    version: 1 as const,
    exportedAt: "2026-08-19T00:00:00.000Z",
    topics: [{ id: "t1", name: "Food" }],
    words: [
      {
        id: "w1",
        english: "cat",
        polish: "kot",
        topicId: "t1",
        createdAt: 1,
        easeFactor: 2.5,
        intervalDays: 0,
        repetitions: 0,
        nextReviewAt: 0,
      },
    ],
  };

  it("accepts a version 1 backup", () => {
    expect(parseBackup(valid).words).toHaveLength(1);
  });

  it("rejects a wrong version", () => {
    expect(() => parseBackup({ ...valid, version: 2 })).toThrow(/version/);
  });

  it("rejects a word missing polish", () => {
    const broken = {
      ...valid,
      words: [{ ...valid.words[0], polish: undefined }],
    };
    expect(() => parseBackup(broken)).toThrow(/invalid/);
  });
});
