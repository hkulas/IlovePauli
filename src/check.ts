import type { Grade } from "./types";

/** Below this length a single letter is usually a different word: drogi / droga, co / to. */
const MIN_TYPO_LENGTH = 6;

export type AnswerReason = "exact" | "diacritics" | "typo" | "none";

export type AnswerCheck = {
  grade: Grade;
  reason: AnswerReason;
};

const POLISH_FOLD: Record<string, string> = {
  ą: "a",
  ć: "c",
  ę: "e",
  ł: "l",
  ń: "n",
  ó: "o",
  ś: "s",
  ź: "z",
  ż: "z",
};

export function normalizeAnswer(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("pl");
}

export function foldPolish(value: string): string {
  const lowered = normalizeAnswer(value);
  let out = "";
  for (const char of lowered) {
    out += POLISH_FOLD[char] ?? char;
  }
  return out.normalize("NFD").replace(/\p{M}/gu, "");
}

export function polishAlternatives(expected: string): string[] {
  return expected
    .split(/\s*\/\s*/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/** True when one insert, delete, or substitution turns a into b. */
export function editDistanceAtMost1(a: string, b: string): boolean {
  if (a === b) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (long.length - short.length > 1) return false;

  let i = 0;
  while (i < short.length && short[i] === long[i]) i += 1;
  if (i === short.length) return true;

  if (short.length === long.length) {
    return short.slice(i + 1) === long.slice(i + 1);
  }
  return short.slice(i) === long.slice(i + 1);
}

export function checkAnswer(expected: string, given: string): AnswerCheck {
  const got = normalizeAnswer(given);
  if (got.length === 0) return { grade: "wrong", reason: "none" };
  const foldedGot = foldPolish(got);

  let diacritics = false;
  let typo = false;
  for (const alt of polishAlternatives(expected)) {
    if (normalizeAnswer(alt) === got) return { grade: "correct", reason: "exact" };
    const foldedAlt = foldPolish(alt);
    if (foldedAlt === foldedGot) {
      diacritics = true;
      continue;
    }
    if (foldedAlt.length >= MIN_TYPO_LENGTH && editDistanceAtMost1(foldedAlt, foldedGot)) {
      typo = true;
    }
  }

  if (diacritics) return { grade: "almost", reason: "diacritics" };
  if (typo) return { grade: "almost", reason: "typo" };
  return { grade: "wrong", reason: "none" };
}

export function gradeAnswer(expected: string, given: string): Grade {
  return checkAnswer(expected, given).grade;
}
