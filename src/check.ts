import type { Grade } from "./types";

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

export function gradeAnswer(expected: string, given: string): Grade {
  const got = normalizeAnswer(given);
  if (got.length === 0) return "wrong";
  let almost = false;
  for (const alt of polishAlternatives(expected)) {
    if (normalizeAnswer(alt) === got) return "correct";
    if (foldPolish(alt) === foldPolish(got)) almost = true;
  }
  return almost ? "almost" : "wrong";
}
