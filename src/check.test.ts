import { describe, expect, it } from "vitest";
import { foldPolish, gradeAnswer, normalizeAnswer } from "./check";
import { HOW_TO_SAY_POLISH } from "./seed";

describe("normalizeAnswer", () => {
  it("trims and collapses spaces", () => {
    expect(normalizeAnswer("  Dzień   dobry  ")).toBe("dzień dobry");
  });
});

describe("gradeAnswer", () => {
  it("marks exact match ignoring case", () => {
    expect(gradeAnswer("Kot", "kot")).toBe("correct");
  });

  it("marks diacritic-only difference as almost", () => {
    expect(gradeAnswer("dziękuję", "dziekuje")).toBe("almost");
    expect(gradeAnswer("łódź", "lodz")).toBe("almost");
    expect(gradeAnswer("żółć", "zolc")).toBe("almost");
  });

  it("marks a wrong stem as wrong", () => {
    expect(gradeAnswer("kot", "pies")).toBe("wrong");
  });

  it("marks empty as wrong", () => {
    expect(gradeAnswer("kot", "   ")).toBe("wrong");
  });

  it("accepts any alternative separated by slash", () => {
    expect(gradeAnswer(HOW_TO_SAY_POLISH, "jak powiedzieć")).toBe("correct");
    expect(gradeAnswer(HOW_TO_SAY_POLISH, "jak się mówi")).toBe("correct");
    expect(gradeAnswer(HOW_TO_SAY_POLISH, "jak się mówi po polsku")).toBe("correct");
    expect(gradeAnswer(HOW_TO_SAY_POLISH, "jak to się mówi po polsku")).toBe("correct");
    expect(gradeAnswer(HOW_TO_SAY_POLISH, "jak sie mowi po polsku")).toBe("almost");
    expect(gradeAnswer(HOW_TO_SAY_POLISH, "kot")).toBe("wrong");
  });

  it("splits alternatives on slash even without spaces", () => {
    expect(gradeAnswer("jak powiedzieć/jak się mówi", "jak powiedzieć")).toBe("correct");
    expect(gradeAnswer("jak powiedzieć/jak się mówi", "jak się mówi")).toBe("correct");
  });
});

describe("foldPolish", () => {
  it("folds ł which NFD does not split", () => {
    expect(foldPolish("Łódź")).toBe("lodz");
  });
});
