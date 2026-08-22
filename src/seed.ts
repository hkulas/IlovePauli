import type { Topic, Word } from "./types";

export const SEED_TOPIC_NAMES = ["Shop Walk", "Car trip", "BRI 1", "Memrise 1"] as const;

export type SeedTopicName = (typeof SEED_TOPIC_NAMES)[number];

export const LEGACY_TOPIC_RENAMES: Record<string, SeedTopicName> = {
  Everyday: "Shop Walk",
  "More words": "Car trip",
};

export const HOW_TO_SAY_ENGLISH = "how do you say this in Polish";

export const HOW_TO_SAY_POLISH =
  "jak powiedzieć / jak się mówi / jak się mówi po polsku / jak to się mówi po polsku";

export const LEGACY_HOW_TO_SAY_ENGLISH = ["how do you say", "how to say", HOW_TO_SAY_ENGLISH] as const;

const LEGACY_HOW_TO_SAY_KEYS = new Set(
  LEGACY_HOW_TO_SAY_ENGLISH.map((english) => english.toLocaleLowerCase("en")),
);

export function isHowToSayEnglish(english: string): boolean {
  return LEGACY_HOW_TO_SAY_KEYS.has(english.trim().toLocaleLowerCase("en"));
}

function isCanonicalHowToSay(english: string): boolean {
  return english.trim().toLocaleLowerCase("en") === HOW_TO_SAY_ENGLISH.toLocaleLowerCase("en");
}

/** Prefer the card she actually studied; tie-break canonical English, then id. */
function compareHowToSayKeepers(a: Word, b: Word): number {
  const byReps = b.repetitions - a.repetitions;
  if (byReps) return byReps;
  const byInterval = b.intervalDays - a.intervalDays;
  if (byInterval) return byInterval;
  const byStep = (b.learningStep ?? 0) - (a.learningStep ?? 0);
  if (byStep) return byStep;
  const aSeen = a.nextReviewAt > 0 ? 1 : 0;
  const bSeen = b.nextReviewAt > 0 ? 1 : 0;
  if (bSeen !== aSeen) return bSeen - aSeen;
  const aCanon = isCanonicalHowToSay(a.english) ? 1 : 0;
  const bCanon = isCanonicalHowToSay(b.english) ? 1 : 0;
  if (bCanon !== aCanon) return bCanon - aCanon;
  return a.id.localeCompare(b.id);
}

/** Keep one how-to-say card, combined Polish, BRI 1 when that topic exists. */
export function planHowToSayMerge(
  words: Word[],
  topics: Topic[],
): { keep: Word; deleteIds: string[] } | null {
  const matches = words.filter((word) => isHowToSayEnglish(word.english));
  if (matches.length === 0) return null;

  const preferred = [...matches].sort(compareHowToSayKeepers)[0];
  if (!preferred) return null;

  const bri = topics.find((topic) => topic.name === "BRI 1");
  const keep: Word = {
    ...preferred,
    english: HOW_TO_SAY_ENGLISH,
    polish: HOW_TO_SAY_POLISH,
    topicId: bri?.id ?? preferred.topicId,
  };
  const deleteIds = matches.filter((word) => word.id !== keep.id).map((word) => word.id);
  if (
    deleteIds.length === 0 &&
    preferred.english === keep.english &&
    preferred.polish === keep.polish &&
    preferred.topicId === keep.topicId
  ) {
    return null;
  }
  return { keep, deleteIds };
}

export const CAR_ENGLISH = "car";
export const CAR_POLISH = "samochód";
export const TRIP_ENGLISH = "trip";
export const TRIP_POLISH = "wycieczka";

const LEGACY_CAR_TRIP_ENGLISH = "car trip";

function englishKey(english: string): string {
  return english.trim().toLocaleLowerCase("en");
}

export type CarTripAdd = {
  english: string;
  polish: string;
  topicId: string;
};

export type CarTripSplitPlan = {
  put: Word[];
  add: CarTripAdd[];
  deleteIds: string[];
};

/** Turn the old "car trip" card into separate car and trip cards. */
export function planCarTripSplit(words: Word[]): CarTripSplitPlan | null {
  const compounds = words.filter((word) => englishKey(word.english) === LEGACY_CAR_TRIP_ENGLISH);
  if (compounds.length === 0) return null;

  const preferred = [...compounds].sort(compareHowToSayKeepers)[0];
  if (!preferred) return null;

  const hasCar = words.some((word) => englishKey(word.english) === CAR_ENGLISH);
  const hasTrip = words.some((word) => englishKey(word.english) === TRIP_ENGLISH);
  const extras = compounds.filter((word) => word.id !== preferred.id).map((word) => word.id);

  if (hasCar && hasTrip) {
    return { put: [], add: [], deleteIds: compounds.map((word) => word.id) };
  }

  if (!hasTrip) {
    const put: Word[] = [{ ...preferred, english: TRIP_ENGLISH, polish: TRIP_POLISH }];
    const add: CarTripAdd[] = hasCar
      ? []
      : [{ english: CAR_ENGLISH, polish: CAR_POLISH, topicId: preferred.topicId }];
    return { put, add, deleteIds: extras };
  }

  return {
    put: [{ ...preferred, english: CAR_ENGLISH, polish: CAR_POLISH }],
    add: [],
    deleteIds: extras,
  };
}

export type SeedWord = {
  english: string;
  polish: string;
  topic: SeedTopicName;
};

/** First notebook pages. Loaded only when this browser has no words yet. */
export const SEED_WORDS: SeedWord[] = [
  { english: "shop", polish: "sklep", topic: "Shop Walk" },
  { english: "walk", polish: "spacer", topic: "Shop Walk" },
  { english: "because", polish: "ponieważ", topic: "Shop Walk" },
  { english: "I want", polish: "chcieć", topic: "Shop Walk" },
  { english: "buy", polish: "kupić", topic: "Shop Walk" },
  { english: "notebook", polish: "zeszyt", topic: "Shop Walk" },
  { english: "towel", polish: "ręcznik", topic: "Shop Walk" },
  { english: "path", polish: "droga", topic: "Shop Walk" },
  { english: "expensive", polish: "drogi", topic: "Shop Walk" },

  { english: "car", polish: "samochód", topic: "Car trip" },
  { english: "trip", polish: "wycieczka", topic: "Car trip" },
  { english: "different", polish: "inny", topic: "Car trip" },
  { english: "nice", polish: "ładne", topic: "Car trip" },
  { english: "straight", polish: "prosto", topic: "Car trip" },
  { english: "think", polish: "myśl", topic: "Car trip" },
  { english: "some", polish: "jakiś", topic: "Car trip" },
  { english: "a bit", polish: "trochę", topic: "Car trip" },
  { english: "end", polish: "koniec", topic: "Car trip" },
  { english: "tree", polish: "drzewo", topic: "Car trip" },
  { english: "hair", polish: "włosy", topic: "Car trip" },
  { english: "word", polish: "słowo", topic: "Car trip" },

  { english: "what does it mean", polish: "co to znaczy", topic: "BRI 1" },
  { english: HOW_TO_SAY_ENGLISH, polish: HOW_TO_SAY_POLISH, topic: "BRI 1" },
  { english: "what", polish: "co", topic: "BRI 1" },
  { english: "where", polish: "gdzie", topic: "BRI 1" },
  { english: "who", polish: "kto", topic: "BRI 1" },
  { english: "when", polish: "kiedy", topic: "BRI 1" },
  { english: "why", polish: "dlaczego", topic: "BRI 1" },
  { english: "how", polish: "jak", topic: "BRI 1" },
  { english: "how much / how many", polish: "ile", topic: "BRI 1" },

  { english: "to live", polish: "mieszkać", topic: "Memrise 1" },
  { english: "capital", polish: "stolica", topic: "Memrise 1" },
  { english: "for / behind", polish: "za", topic: "Memrise 1" },
  { english: "to meet", polish: "poznać", topic: "Memrise 1" },
  { english: "to understand", polish: "rozumieć", topic: "Memrise 1" },
  { english: "welcome", polish: "witamy", topic: "Memrise 1" },
  { english: "me neither", polish: "ja też nie", topic: "Memrise 1" },
  { english: "me too", polish: "ja też", topic: "Memrise 1" },
  { english: "that's great!", polish: "to świetnie!", topic: "Memrise 1" },
  { english: "no problem", polish: "nie ma sprawy", topic: "Memrise 1" },
];
