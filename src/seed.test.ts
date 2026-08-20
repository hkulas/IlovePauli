import { describe, expect, it } from "vitest";
import { LEGACY_TOPIC_RENAMES, SEED_TOPIC_NAMES, SEED_WORDS } from "./seed";

describe("SEED_WORDS", () => {
  it("has english, polish, and a known topic on every row", () => {
    const topics = new Set<string>(SEED_TOPIC_NAMES);
    expect(SEED_WORDS.length).toBeGreaterThan(30);
    for (const row of SEED_WORDS) {
      expect(row.english.trim().length).toBeGreaterThan(0);
      expect(row.polish.trim().length).toBeGreaterThan(0);
      expect(topics.has(row.topic)).toBe(true);
    }
  });

  it("keeps notebook diacritics", () => {
    const polish = SEED_WORDS.map((w) => w.polish);
    expect(polish).toContain("ponieważ");
    expect(polish).toContain("ręcznik");
    expect(polish).toContain("ładne");
    expect(polish).toContain("myśl");
    expect(polish).toContain("jakiś");
    expect(polish).toContain("trochę");
    expect(polish).toContain("włosy");
    expect(polish).toContain("słowo");
    expect(polish).toContain("jak to się mówi po polsku");
    expect(polish).toContain("mieszkać");
    expect(polish).toContain("rozumieć");
    expect(polish).toContain("ja też nie");
    expect(polish).toContain("to świetnie!");
  });

  it("does not repeat the same english+polish pair", () => {
    const keys = SEED_WORDS.map((w) => `${w.english}\0${w.polish}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("renames the old notebook section titles", () => {
    expect(LEGACY_TOPIC_RENAMES.Everyday).toBe("Shop Walk");
    expect(LEGACY_TOPIC_RENAMES["More words"]).toBe("Car trip");
  });
});
