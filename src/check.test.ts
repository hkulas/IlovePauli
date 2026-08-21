import { describe, expect, it } from "vitest";
import {
  checkAnswer,
  editDistanceAtMost1,
  foldPolish,
  gradeAnswer,
  normalizeAnswer,
  polishAlternatives,
} from "./check";
import { HOW_TO_SAY_POLISH, SEED_WORDS } from "./seed";

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

  it("forgives one letter on a longer word", () => {
    expect(gradeAnswer("powiedzieć", "powiedziec")).toBe("almost");
    expect(gradeAnswer("powiedzieć", "powiedzieś")).toBe("almost");
    expect(gradeAnswer("powiedzieć", "powiedziećć")).toBe("almost");
    expect(gradeAnswer("dziękuję", "dziekje")).toBe("almost");
  });

  it("keeps short one-letter pairs from her deck wrong", () => {
    expect(gradeAnswer("drogi", "droga")).toBe("wrong");
    expect(gradeAnswer("droga", "drogi")).toBe("wrong");
    expect(gradeAnswer("co", "to")).toBe("wrong");
    expect(gradeAnswer("jak", "tak")).toBe("wrong");
    expect(gradeAnswer("kto", "kot")).toBe("wrong");
    expect(gradeAnswer("myśl", "myśli")).toBe("wrong");
  });

  it("still rejects two letters off", () => {
    expect(gradeAnswer("powiedzieć", "powiedzcc")).toBe("wrong");
    expect(gradeAnswer("mieszkać", "mieskc")).toBe("wrong");
  });

  it("forgives a typo against one slash alternative", () => {
    expect(gradeAnswer(HOW_TO_SAY_POLISH, "jak powiedziec")).toBe("almost");
  });
});

describe("checkAnswer", () => {
  it("names why an answer passed", () => {
    expect(checkAnswer("dziękuję", "Dziękuję")).toEqual({ grade: "correct", reason: "exact" });
    expect(checkAnswer("dziękuję", "dziekuje")).toEqual({ grade: "almost", reason: "diacritics" });
    expect(checkAnswer("dziękuję", "dziekje")).toEqual({ grade: "almost", reason: "typo" });
    expect(checkAnswer("dziękuję", "kot")).toEqual({ grade: "wrong", reason: "none" });
    expect(checkAnswer("dziękuję", "  ")).toEqual({ grade: "wrong", reason: "none" });
  });

  it("prefers the closest alternative, not the first one", () => {
    const expected = "powiedzieć / rozumieć";
    expect(checkAnswer(expected, "rozumieć")).toEqual({ grade: "correct", reason: "exact" });
    expect(checkAnswer(expected, "rozumiec")).toEqual({ grade: "almost", reason: "diacritics" });
  });
});

describe("editDistanceAtMost1", () => {
  it("accepts equal, one substitution, one insert, one delete", () => {
    expect(editDistanceAtMost1("", "")).toBe(true);
    expect(editDistanceAtMost1("", "a")).toBe(true);
    expect(editDistanceAtMost1("ja tez nie", "jatez nie")).toBe(true);
    expect(editDistanceAtMost1("kot", "kot")).toBe(true);
    expect(editDistanceAtMost1("kot", "kob")).toBe(true);
    expect(editDistanceAtMost1("kot", "koty")).toBe(true);
    expect(editDistanceAtMost1("koty", "kot")).toBe(true);
    expect(editDistanceAtMost1("okot", "kot")).toBe(true);
  });

  it("rejects two or more edits", () => {
    expect(editDistanceAtMost1("kot", "bob")).toBe(false);
    expect(editDistanceAtMost1("kot", "kotyy")).toBe(false);
    expect(editDistanceAtMost1("kot", "tok")).toBe(false);
  });
});

describe("typo tolerance against the real deck", () => {
  it("cannot accept one seed answer as a typo of another", () => {
    const answers = SEED_WORDS.flatMap((row) => polishAlternatives(row.polish)).map(foldPolish);
    const collisions: string[] = [];
    for (const answer of answers) {
      for (const other of answers) {
        if (answer === other) continue;
        if (answer.length >= 6 && editDistanceAtMost1(answer, other)) {
          collisions.push(`${answer} / ${other}`);
        }
      }
    }
    expect(collisions).toEqual([]);
  });
});

describe("foldPolish", () => {
  it("folds ł which NFD does not split", () => {
    expect(foldPolish("Łódź")).toBe("lodz");
  });
});
