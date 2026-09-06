import type { Topic, Word } from "./types";

export const SEED_TOPIC_NAMES = [
  "Shop Walk",
  "Car trip",
  "BRI 1",
  "Memrise 1",
  "I-forms",
  "Connectors",
  "Good",
  "Bad",
  "Comparing",
  "Clothes",
  "Things",
  "Kitchen",
] as const;

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

export const WELCOME_ENGLISH = "welcome";
export const WELCOME_POLISH = "witam / witaj / witamy";

const WELCOME_FORMS = new Set(["witam", "witaj", "witamy"]);

function isWelcomeFormSet(polish: string): boolean {
  const parts = polish
    .split(/\s*\/\s*/)
    .map((part) => part.trim().toLocaleLowerCase("pl"))
    .filter((part) => part.length > 0);
  return parts.length > 0 && parts.every((part) => WELCOME_FORMS.has(part));
}

/** Expand seed welcome cards so witam, witaj, and witamy all count. */
export function planWelcomePolish(words: Word[]): Word[] | null {
  const updates = words
    .filter(
      (word) =>
        englishKey(word.english) === WELCOME_ENGLISH &&
        isWelcomeFormSet(word.polish) &&
        word.polish !== WELCOME_POLISH,
    )
    .map((word) => ({ ...word, polish: WELCOME_POLISH }));
  return updates.length === 0 ? null : updates;
}

export type SeedWord = {
  english: string;
  polish: string;
  topic: SeedTopicName;
};

export const GREAT_ENGLISH = "that's great";
export const GREAT_POLISH = "to świetnie / to dobrze";

const LEGACY_GREAT_ENGLISH = ["that's great!", "that's great"] as const;
const LEGACY_GREAT_POLISH = new Set(["to świetnie!", "to świetnie"]);

function isGreatCard(word: Word): boolean {
  const english = englishKey(word.english);
  return LEGACY_GREAT_ENGLISH.some((prompt) => englishKey(prompt) === english);
}

/** Drop the exclamation mark and accept to dobrze as well as to świetnie. */
export function planExpandGreatPolish(words: Word[]): Word[] | null {
  const updates = words
    .filter(
      (word) =>
        isGreatCard(word) &&
        LEGACY_GREAT_POLISH.has(word.polish.trim()) &&
        (word.english !== GREAT_ENGLISH || word.polish !== GREAT_POLISH),
    )
    .map((word) => ({ ...word, english: GREAT_ENGLISH, polish: GREAT_POLISH }));
  return updates.length === 0 ? null : updates;
}

export const I_FORMS_TOPIC = "I-forms" satisfies SeedTopicName;

export const KNOW_FACT_ENGLISH = "I know (a fact)";
export const KNOW_PERSON_ENGLISH = "I know (a person or place)";

const LEGACY_KNOW_FACT_ENGLISH = "I know";
const LEGACY_KNOW_PERSON_ENGLISH = "I know / I'm familiar with";

export const NEED_ENGLISH = "I need";
export const NEED_POLISH = "potrzebuję / potrzebujemy";

const LEGACY_NEED_POLISH = new Set(["potrzebuję"]);

/** Accept potrzebujemy (we need) too, in case she types the we-form here. */
export function planExpandNeedPolish(words: Word[]): Word[] | null {
  const updates = words
    .filter(
      (word) =>
        englishKey(word.english) === englishKey(NEED_ENGLISH) &&
        LEGACY_NEED_POLISH.has(word.polish.trim()) &&
        word.polish !== NEED_POLISH,
    )
    .map((word) => ({ ...word, polish: NEED_POLISH }));
  return updates.length === 0 ? null : updates;
}

export const WANT_ENGLISH = "I want";
export const WANT_POLISH = "chcieć / chcę";

const LEGACY_WANT_POLISH = new Set(["chcieć", "chcę"]);

/** Accept chcę on the Shop Walk I want card, not only the infinitive chcieć. */
export function planExpandWantPolish(words: Word[]): Word[] | null {
  const updates = words
    .filter(
      (word) =>
        englishKey(word.english) === englishKey(WANT_ENGLISH) &&
        LEGACY_WANT_POLISH.has(word.polish.trim()) &&
        word.polish !== WANT_POLISH,
    )
    .map((word) => ({ ...word, polish: WANT_POLISH }));
  return updates.length === 0 ? null : updates;
}

export const NICE_ENGLISH = "nice";
export const NICE_POLISH = "ładne / ładny / ładna / ładnie";

const LEGACY_NICE_POLISH = new Set(["ładne"]);

/** Accept all common genders of the adjective plus the ładnie adverb form. */
export function planExpandNicePolish(words: Word[]): Word[] | null {
  const updates = words
    .filter(
      (word) =>
        englishKey(word.english) === englishKey(NICE_ENGLISH) &&
        LEGACY_NICE_POLISH.has(word.polish.trim()) &&
        word.polish !== NICE_POLISH,
    )
    .map((word) => ({ ...word, polish: NICE_POLISH }));
  return updates.length === 0 ? null : updates;
}

export const THINK_ENGLISH = "think";
export const THINK_POLISH = "myśl / myślę / myślisz / myśli";

const LEGACY_THINK_POLISH = new Set(["myśl"]);

/** Accept the I/you/he-she conjugations too, not just the bare stem. */
export function planExpandThinkPolish(words: Word[]): Word[] | null {
  const updates = words
    .filter(
      (word) =>
        englishKey(word.english) === englishKey(THINK_ENGLISH) &&
        LEGACY_THINK_POLISH.has(word.polish.trim()) &&
        word.polish !== THINK_POLISH,
    )
    .map((word) => ({ ...word, polish: THINK_POLISH }));
  return updates.length === 0 ? null : updates;
}

/**
 * Usable I-forms, not infinitives. Skip "I want" / chcę: that card is already in Shop Walk.
 */
export const I_FORM_WORDS: SeedWord[] = [
  { english: "I am", polish: "jestem", topic: "I-forms" },
  { english: "I have", polish: "mam", topic: "I-forms" },
  { english: "I can", polish: "mogę", topic: "I-forms" },
  { english: "I can't", polish: "nie mogę", topic: "I-forms" },
  { english: "I have to / I must", polish: "muszę", topic: "I-forms" },
  { english: "I do / I'm doing", polish: "robię", topic: "I-forms" },
  { english: "I speak / I'm saying", polish: "mówię", topic: "I-forms" },
  { english: KNOW_FACT_ENGLISH, polish: "wiem", topic: "I-forms" },
  { english: KNOW_PERSON_ENGLISH, polish: "znam", topic: "I-forms" },
  { english: "I like", polish: "lubię", topic: "I-forms" },
  { english: NEED_ENGLISH, polish: NEED_POLISH, topic: "I-forms" },
  { english: "I'm going (on foot)", polish: "idę", topic: "I-forms" },
  { english: "I'm eating / I eat", polish: "jem", topic: "I-forms" },
  { english: "I'm drinking / I drink", polish: "piję", topic: "I-forms" },
  { english: "I see", polish: "widzę", topic: "I-forms" },
];

export type IFormAdd = {
  english: string;
  polish: string;
};

export type EnsureIFormsPlan = {
  newTopicName: string | null;
  add: IFormAdd[];
};

/** Add the I-forms topic and any missing cards to a deck that already has words. */
export function planEnsureIForms(topics: Topic[], words: Word[]): EnsureIFormsPlan | null {
  const hasTopic = topics.some((topic) => topic.name === I_FORMS_TOPIC);
  const existingEnglish = new Set(words.map((word) => englishKey(word.english)));
  const add = I_FORM_WORDS.filter((row) => !existingEnglish.has(englishKey(row.english))).map(
    ({ english, polish }) => ({ english, polish }),
  );
  if (add.length === 0) return null;
  return {
    newTopicName: hasTopic ? null : I_FORMS_TOPIC,
    add,
  };
}

const KNOW_PROMPT_RENAMES: Record<string, string> = {
  [englishKey(LEGACY_KNOW_FACT_ENGLISH)]: KNOW_FACT_ENGLISH,
  [englishKey(LEGACY_KNOW_PERSON_ENGLISH)]: KNOW_PERSON_ENGLISH,
};

/** Split the two I know cards so wiem (facts) and znam (people/places) are obvious. */
export function planClarifyKnowPrompts(words: Word[]): Word[] | null {
  const taken = new Set(words.map((word) => englishKey(word.english)));
  const updates: Word[] = [];
  for (const word of words) {
    const next = KNOW_PROMPT_RENAMES[englishKey(word.english)];
    if (!next || englishKey(word.english) === englishKey(next)) continue;
    if (taken.has(englishKey(next))) continue;
    updates.push({ ...word, english: next });
    taken.add(englishKey(next));
  }
  return updates.length === 0 ? null : updates;
}

export const CAR_TRIP_TOPIC = "Car trip" satisfies SeedTopicName;

const LEGACY_JADE_ENGLISH = ["I'm going (by vehicle)"] as const;
const JADE_POLISH = "jadę";

function isJadeCard(word: Word): boolean {
  const english = englishKey(word.english);
  if (LEGACY_JADE_ENGLISH.some((prompt) => englishKey(prompt) === english)) return true;
  return word.polish.trim().toLocaleLowerCase("pl") === JADE_POLISH;
}

/** Remove leftover jadę cards after that I-form was dropped. */
export function planDropJade(words: Word[]): string[] | null {
  const deleteIds = words.filter(isJadeCard).map((word) => word.id);
  return deleteIds.length === 0 ? null : deleteIds;
}

export type EnsureCarPlan = {
  newTopicName: string | null;
  add: { english: string; polish: string };
};

/** Add car / samochód when a deck never got that card. */
export function planEnsureCar(topics: Topic[], words: Word[]): EnsureCarPlan | null {
  if (words.some((word) => englishKey(word.english) === CAR_ENGLISH)) return null;
  const hasTopic = topics.some((topic) => topic.name === CAR_TRIP_TOPIC);
  return {
    newTopicName: hasTopic ? null : CAR_TRIP_TOPIC,
    add: { english: CAR_ENGLISH, polish: CAR_POLISH },
  };
}

export const CONNECTORS_TOPIC = "Connectors" satisfies SeedTopicName;

/**
 * Prepositions and connectors that came up in real messages, not a person form of a verb
 * already covered elsewhere (mogę already covers can, so możemy does not get its own card).
 */
export const CONNECTOR_WORDS: SeedWord[] = [
  { english: "forest", polish: "las", topic: "Connectors" },
  { english: "nature", polish: "natura", topic: "Connectors" },
  { english: "to / until", polish: "do", topic: "Connectors" },
  { english: "on / at / to", polish: "na", topic: "Connectors" },
  { english: "with / from", polish: "z", topic: "Connectors" },
  { english: "or", polish: "albo", topic: "Connectors" },
  { english: "together", polish: "razem", topic: "Connectors" },
  { english: "each other", polish: "siebie", topic: "Connectors" },
  { english: "it looks", polish: "wygląda", topic: "Connectors" },
  { english: "before", polish: "przed", topic: "Connectors" },
  { english: "now", polish: "teraz", topic: "Connectors" },
  { english: "after", polish: "po", topic: "Connectors" },
];

export type ConnectorAdd = {
  english: string;
  polish: string;
};

export type EnsureConnectorsPlan = {
  newTopicName: string | null;
  add: ConnectorAdd[];
};

/** Add the Connectors topic and any missing cards to a deck that already has words. */
export function planEnsureConnectors(topics: Topic[], words: Word[]): EnsureConnectorsPlan | null {
  const hasTopic = topics.some((topic) => topic.name === CONNECTORS_TOPIC);
  const existingEnglish = new Set(words.map((word) => englishKey(word.english)));
  const add = CONNECTOR_WORDS.filter((row) => !existingEnglish.has(englishKey(row.english))).map(
    ({ english, polish }) => ({ english, polish }),
  );
  if (add.length === 0) return null;
  return {
    newTopicName: hasTopic ? null : CONNECTORS_TOPIC,
    add,
  };
}

export const GOOD_TOPIC = "Good" satisfies SeedTopicName;
export const BAD_TOPIC = "Bad" satisfies SeedTopicName;
export const COMPARING_TOPIC = "Comparing" satisfies SeedTopicName;
export const CLOTHES_TOPIC = "Clothes" satisfies SeedTopicName;
export const THINGS_TOPIC = "Things" satisfies SeedTopicName;
export const KITCHEN_TOPIC = "Kitchen" satisfies SeedTopicName;

export const GOOD_WORDS: SeedWord[] = [
  { english: "good", polish: "dobry / dobrze", topic: "Good" },
  { english: "tasty", polish: "pyszne / smaczne", topic: "Good" },
  { english: "easy", polish: "łatwy / łatwo", topic: "Good" },
  { english: "happy", polish: "szczęśliwa / zadowolona", topic: "Good" },
  { english: "beautiful", polish: "piękny / piękna", topic: "Good" },
  { english: "right / correct", polish: "dobrze / racja", topic: "Good" },
  { english: "thank you", polish: "dziękuję", topic: "Good" },
];

export const BAD_WORDS: SeedWord[] = [
  { english: "difficult", polish: "trudny / trudno", topic: "Bad" },
  { english: "problem", polish: "problem", topic: "Bad" },
  { english: "boring", polish: "nudny / nudne", topic: "Bad" },
  { english: "mistake", polish: "błąd", topic: "Bad" },
  { english: "sorry", polish: "przepraszam", topic: "Bad" },
  { english: "I don't know", polish: "nie wiem", topic: "Bad" },
];

export const COMPARING_WORDS: SeedWord[] = [
  { english: "better", polish: "lepszy / lepiej", topic: "Comparing" },
  { english: "worse", polish: "gorszy / gorzej", topic: "Comparing" },
  { english: "more", polish: "więcej", topic: "Comparing" },
  { english: "less", polish: "mniej", topic: "Comparing" },
  { english: "the same", polish: "taki sam / to samo", topic: "Comparing" },
  { english: "than", polish: "niż", topic: "Comparing" },
];

export const CLOTHES_WORDS: SeedWord[] = [
  { english: "clothes", polish: "ubrania", topic: "Clothes" },
  { english: "t-shirt", polish: "koszulka", topic: "Clothes" },
  { english: "shoes", polish: "buty", topic: "Clothes" },
  { english: "trousers", polish: "spodnie", topic: "Clothes" },
  { english: "to wear", polish: "nosić", topic: "Clothes" },
];

export const THINGS_WORDS: SeedWord[] = [
  { english: "thing / things", polish: "rzecz / rzeczy", topic: "Things" },
  { english: "nothing", polish: "nic", topic: "Things" },
  { english: "bag", polish: "torba", topic: "Things" },
];

export const KITCHEN_WORDS: SeedWord[] = [
  { english: "to cook", polish: "gotować", topic: "Kitchen" },
  { english: "morning", polish: "rano", topic: "Kitchen" },
  { english: "evening", polish: "wieczorem / wieczór", topic: "Kitchen" },
  { english: "night", polish: "noc", topic: "Kitchen" },
  { english: "hungry", polish: "głodna / głodny", topic: "Kitchen" },
  { english: "full", polish: "pełna", topic: "Kitchen" },
];

export const VOCAB_SECTIONS = [
  { topic: GOOD_TOPIC, words: GOOD_WORDS },
  { topic: BAD_TOPIC, words: BAD_WORDS },
  { topic: COMPARING_TOPIC, words: COMPARING_WORDS },
  { topic: CLOTHES_TOPIC, words: CLOTHES_WORDS },
  { topic: THINGS_TOPIC, words: THINGS_WORDS },
  { topic: KITCHEN_TOPIC, words: KITCHEN_WORDS },
] as const;

export type VocabSectionAdd = {
  english: string;
  polish: string;
};

export type EnsureVocabSectionPlan = {
  topicName: SeedTopicName;
  newTopicName: string | null;
  add: VocabSectionAdd[];
};

/** Add Good, Bad, Comparing, Clothes, Things, and Kitchen topics with any missing cards. */
export function planEnsureVocabSections(topics: Topic[], words: Word[]): EnsureVocabSectionPlan[] | null {
  const existingEnglish = new Set(words.map((word) => englishKey(word.english)));
  const plans: EnsureVocabSectionPlan[] = [];
  for (const { topic, words: sectionWords } of VOCAB_SECTIONS) {
    const add = sectionWords
      .filter((row) => !existingEnglish.has(englishKey(row.english)))
      .map(({ english, polish }) => ({ english, polish }));
    if (add.length === 0) continue;
    for (const row of add) {
      existingEnglish.add(englishKey(row.english));
    }
    const hasTopic = topics.some((entry) => entry.name === topic);
    plans.push({ topicName: topic, newTopicName: hasTopic ? null : topic, add });
  }
  return plans.length === 0 ? null : plans;
}

/** First notebook pages. Loaded only when this browser has no words yet. */
export const SEED_WORDS: SeedWord[] = [
  { english: "shop", polish: "sklep", topic: "Shop Walk" },
  { english: "walk", polish: "spacer", topic: "Shop Walk" },
  { english: "because", polish: "ponieważ", topic: "Shop Walk" },
  { english: WANT_ENGLISH, polish: WANT_POLISH, topic: "Shop Walk" },
  { english: "buy", polish: "kupić", topic: "Shop Walk" },
  { english: "notebook", polish: "zeszyt", topic: "Shop Walk" },
  { english: "towel", polish: "ręcznik", topic: "Shop Walk" },
  { english: "path", polish: "droga", topic: "Shop Walk" },
  { english: "expensive", polish: "drogi", topic: "Shop Walk" },

  { english: "car", polish: "samochód", topic: "Car trip" },
  { english: "trip", polish: "wycieczka", topic: "Car trip" },
  { english: "different", polish: "inny", topic: "Car trip" },
  { english: NICE_ENGLISH, polish: NICE_POLISH, topic: "Car trip" },
  { english: "straight", polish: "prosto", topic: "Car trip" },
  { english: THINK_ENGLISH, polish: THINK_POLISH, topic: "Car trip" },
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
  { english: WELCOME_ENGLISH, polish: WELCOME_POLISH, topic: "Memrise 1" },
  { english: "me neither", polish: "ja też nie", topic: "Memrise 1" },
  { english: "me too", polish: "ja też", topic: "Memrise 1" },
  { english: GREAT_ENGLISH, polish: GREAT_POLISH, topic: "Memrise 1" },
  { english: "no problem", polish: "nie ma sprawy", topic: "Memrise 1" },

  ...I_FORM_WORDS,
  ...CONNECTOR_WORDS,
  ...GOOD_WORDS,
  ...BAD_WORDS,
  ...COMPARING_WORDS,
  ...CLOTHES_WORDS,
  ...THINGS_WORDS,
  ...KITCHEN_WORDS,
];
