import { describe, expect, it } from "vitest";
import { foldPolish, gradeAnswer, normalizeAnswer } from "./check";

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
});

describe("foldPolish", () => {
  it("folds ł which NFD does not split", () => {
    expect(foldPolish("Łódź")).toBe("lodz");
  });
});
