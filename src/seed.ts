export const SEED_TOPIC_NAMES = ["Shop Walk", "Car trip", "BRI 1", "Memrise 1"] as const;

export type SeedTopicName = (typeof SEED_TOPIC_NAMES)[number];

export const LEGACY_TOPIC_RENAMES: Record<string, SeedTopicName> = {
  Everyday: "Shop Walk",
  "More words": "Car trip",
};

export type SeedWord = {
  english: string;
  polish: string;
  topic: SeedTopicName;
};

/** First notebook pages. Loaded only when this browser has no words yet. */
export const SEED_WORDS: SeedWord[] = [
  { english: "shop", polish: "sklep", topic: "Shop Walk" },
  { english: "walk", polish: "spacer", topic: "Shop Walk" },
  { english: "how do you say", polish: "jak się mówi", topic: "Shop Walk" },
  { english: "how to say", polish: "jak powiedzieć", topic: "Shop Walk" },
  { english: "because", polish: "ponieważ", topic: "Shop Walk" },
  { english: "I want", polish: "chcieć", topic: "Shop Walk" },
  { english: "buy", polish: "kupić", topic: "Shop Walk" },
  { english: "notebook", polish: "zeszyt", topic: "Shop Walk" },
  { english: "towel", polish: "ręcznik", topic: "Shop Walk" },
  { english: "path", polish: "droga", topic: "Shop Walk" },
  { english: "expensive", polish: "drogi", topic: "Shop Walk" },

  { english: "car trip", polish: "wycieczka samochodowa", topic: "Car trip" },
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
  { english: "how do you say this in Polish", polish: "jak to się mówi po polsku", topic: "BRI 1" },
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
