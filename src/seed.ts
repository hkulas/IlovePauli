export const SEED_TOPIC_NAMES = ["Everyday", "More words", "BRI 1", "Memrise 1"] as const;

export type SeedTopicName = (typeof SEED_TOPIC_NAMES)[number];

export type SeedWord = {
  english: string;
  polish: string;
  topic: SeedTopicName;
};

/** First notebook pages. Loaded only when this browser has no words yet. */
export const SEED_WORDS: SeedWord[] = [
  { english: "shop", polish: "sklep", topic: "Everyday" },
  { english: "walk", polish: "spacer", topic: "Everyday" },
  { english: "how do you say", polish: "jak się mówi", topic: "Everyday" },
  { english: "how to say", polish: "jak powiedzieć", topic: "Everyday" },
  { english: "because", polish: "ponieważ", topic: "Everyday" },
  { english: "I want", polish: "chcieć", topic: "Everyday" },
  { english: "buy", polish: "kupić", topic: "Everyday" },
  { english: "notebook", polish: "zeszyt", topic: "Everyday" },
  { english: "towel", polish: "ręcznik", topic: "Everyday" },
  { english: "path", polish: "droga", topic: "Everyday" },
  { english: "expensive", polish: "drogi", topic: "Everyday" },

  { english: "car trip", polish: "wycieczka samochodowa", topic: "More words" },
  { english: "different", polish: "inny", topic: "More words" },
  { english: "nice", polish: "ładne", topic: "More words" },
  { english: "straight", polish: "prosto", topic: "More words" },
  { english: "think", polish: "myśl", topic: "More words" },
  { english: "some", polish: "jakiś", topic: "More words" },
  { english: "a bit", polish: "trochę", topic: "More words" },
  { english: "end", polish: "koniec", topic: "More words" },
  { english: "tree", polish: "drzewo", topic: "More words" },
  { english: "hair", polish: "włosy", topic: "More words" },
  { english: "word", polish: "słowo", topic: "More words" },

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
