import { describe, expect, it } from "vitest";
import { HOW_TO_SAY_ENGLISH, HOW_TO_SAY_POLISH, I_FORM_WORDS, I_FORMS_TOPIC, isHowToSayEnglish, LEGACY_TOPIC_RENAMES, planCarTripSplit, planEnsureIForms, planHowToSayMerge, planWelcomePolish, SEED_TOPIC_NAMES, SEED_WORDS, WELCOME_ENGLISH, WELCOME_POLISH } from "./seed";
import { DEFAULT_EASE, type Topic, type Word } from "./types";

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
    expect(polish).toContain("samochód");
    expect(polish).toContain("wycieczka");
    expect(polish).toContain(HOW_TO_SAY_POLISH);
    expect(polish).toContain("mieszkać");
    expect(polish).toContain("rozumieć");
    expect(polish).toContain("ja też nie");
    expect(polish).toContain("to świetnie!");
    expect(polish).toContain("mogę");
    expect(polish).toContain("muszę");
    expect(polish).toContain("mówię");
    expect(polish).toContain("potrzebuję");
    expect(polish).toContain("idę");
    expect(polish).toContain("jadę");
  });

  it("does not repeat the same english+polish pair", () => {
    const keys = SEED_WORDS.map((w) => `${w.english}\0${w.polish}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("does not reuse the same english prompt", () => {
    const keys = SEED_WORDS.map((w) => w.english.trim().toLocaleLowerCase("en"));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("renames the old notebook section titles", () => {
    expect(LEGACY_TOPIC_RENAMES.Everyday).toBe("Shop Walk");
    expect(LEGACY_TOPIC_RENAMES["More words"]).toBe("Car trip");
  });

  it("keeps one how-to-say prompt on BRI 1", () => {
    const howToSay = SEED_WORDS.filter((row) => isHowToSayEnglish(row.english));
    expect(howToSay).toEqual([
      { english: HOW_TO_SAY_ENGLISH, polish: HOW_TO_SAY_POLISH, topic: "BRI 1" },
    ]);
    expect(SEED_WORDS.some((row) => row.english === "how")).toBe(true);
  });

  it("splits car trip into two Car trip cards", () => {
    const carTrip = SEED_WORDS.filter((row) => row.topic === "Car trip");
    expect(carTrip).toContainEqual({ english: "car", polish: "samochód", topic: "Car trip" });
    expect(carTrip).toContainEqual({ english: "trip", polish: "wycieczka", topic: "Car trip" });
    expect(carTrip.some((row) => row.english === "car trip")).toBe(false);
  });

  it("accepts several welcome forms", () => {
    expect(SEED_WORDS).toContainEqual({
      english: WELCOME_ENGLISH,
      polish: WELCOME_POLISH,
      topic: "Memrise 1",
    });
  });

  it("tests I-forms as usable conjugated prompts", () => {
    expect(SEED_TOPIC_NAMES).toContain(I_FORMS_TOPIC);
    expect(I_FORM_WORDS).toHaveLength(16);
    for (const row of I_FORM_WORDS) {
      expect(row.topic).toBe(I_FORMS_TOPIC);
      expect(SEED_WORDS).toContainEqual(row);
    }
    expect(I_FORM_WORDS).toContainEqual({ english: "I can", polish: "mogę", topic: I_FORMS_TOPIC });
    expect(I_FORM_WORDS).toContainEqual({ english: "I know", polish: "wiem", topic: I_FORMS_TOPIC });
    expect(I_FORM_WORDS).toContainEqual({
      english: "I know / I'm familiar with",
      polish: "znam",
      topic: I_FORMS_TOPIC,
    });
    expect(I_FORM_WORDS).toContainEqual({
      english: "I'm going (on foot)",
      polish: "idę",
      topic: I_FORMS_TOPIC,
    });
    expect(I_FORM_WORDS).toContainEqual({
      english: "I'm going (by vehicle)",
      polish: "jadę",
      topic: I_FORMS_TOPIC,
    });
    expect(I_FORM_WORDS.some((row) => row.english === "I want" || row.polish === "chcę")).toBe(false);
    expect(I_FORM_WORDS.some((row) => row.english.toLocaleLowerCase("en").startsWith("to "))).toBe(
      false,
    );
    const polishForms = I_FORM_WORDS.map((row) => row.polish);
    for (const infinitive of ["być", "mieć", "móc", "musieć", "robić", "mówić", "iść", "jechać"]) {
      expect(polishForms).not.toContain(infinitive);
    }
    expect(SEED_WORDS).toContainEqual({ english: "I want", polish: "chcieć", topic: "Shop Walk" });
  });
});

describe("planHowToSayMerge", () => {
  function topic(id: string, name: string): Topic {
    return { id, name };
  }

  function word(id: string, english: string, polish: string, topicId: string): Word {
    return {
      id,
      english,
      polish,
      topicId,
      createdAt: 1,
      easeFactor: DEFAULT_EASE,
      intervalDays: 0,
      repetitions: 0,
      nextReviewAt: 0,
      learningStep: 0,
    };
  }

  it("merges the three old cards onto the BRI 1 prompt", () => {
    const shop = topic("shop", "Shop Walk");
    const bri = topic("bri", "BRI 1");
    const first = word("w1", "how do you say", "jak się mówi", shop.id);
    const second = word("w2", "how to say", "jak powiedzieć", shop.id);
    const third = word("w3", HOW_TO_SAY_ENGLISH, "jak to się mówi po polsku", bri.id);
    const other = word("w4", "how", "jak", bri.id);

    const plan = planHowToSayMerge([first, second, third, other], [shop, bri]);
    expect(plan).not.toBeNull();
    expect(plan?.keep.id).toBe(third.id);
    expect(plan?.keep.english).toBe(HOW_TO_SAY_ENGLISH);
    expect(plan?.keep.polish).toBe(HOW_TO_SAY_POLISH);
    expect(plan?.keep.topicId).toBe(bri.id);
    expect(plan?.deleteIds.sort()).toEqual([first.id, second.id].sort());
  });

  it("keeps SRS from the most-reviewed duplicate, not the canonical prompt", () => {
    const shop = topic("shop", "Shop Walk");
    const bri = topic("bri", "BRI 1");
    const studied = {
      ...word("w1", "how do you say", "jak się mówi", shop.id),
      repetitions: 4,
      intervalDays: 15,
      easeFactor: 2.7,
      nextReviewAt: 9_000,
      learningStep: 2,
    };
    const untouched = word("w3", HOW_TO_SAY_ENGLISH, "jak to się mówi po polsku", bri.id);

    const plan = planHowToSayMerge([untouched, studied], [shop, bri]);
    expect(plan?.keep.id).toBe(studied.id);
    expect(plan?.keep.repetitions).toBe(4);
    expect(plan?.keep.intervalDays).toBe(15);
    expect(plan?.keep.easeFactor).toBe(2.7);
    expect(plan?.keep.nextReviewAt).toBe(9_000);
    expect(plan?.keep.english).toBe(HOW_TO_SAY_ENGLISH);
    expect(plan?.keep.polish).toBe(HOW_TO_SAY_POLISH);
    expect(plan?.keep.topicId).toBe(bri.id);
    expect(plan?.deleteIds).toEqual([untouched.id]);
  });

  it("picks the more-reviewed card when only legacy prompts exist", () => {
    const shop = topic("shop", "Shop Walk");
    const weaker = { ...word("aaa", "how do you say", "jak się mówi", shop.id), repetitions: 1 };
    const stronger = { ...word("zzz", "how to say", "jak powiedzieć", shop.id), repetitions: 3 };

    const plan = planHowToSayMerge([weaker, stronger], [shop]);
    expect(plan?.keep.id).toBe(stronger.id);
    expect(plan?.keep.repetitions).toBe(3);
    expect(plan?.deleteIds).toEqual([weaker.id]);
  });

  it("breaks ties with canonical English, then stable id", () => {
    const shop = topic("shop", "Shop Walk");
    const bri = topic("bri", "BRI 1");
    const laterId = word("zzz", "how do you say", "jak się mówi", shop.id);
    const earlierId = word("aaa", "how to say", "jak powiedzieć", shop.id);
    expect(planHowToSayMerge([laterId, earlierId], [shop])?.keep.id).toBe(earlierId.id);

    const canonical = word("zzz", HOW_TO_SAY_ENGLISH, "jak to się mówi po polsku", bri.id);
    const legacy = word("aaa", "how do you say", "jak się mówi", shop.id);
    expect(planHowToSayMerge([legacy, canonical], [shop, bri])?.keep.id).toBe(canonical.id);
  });

  it("is a no-op when the merged card is already in place", () => {
    const bri = topic("bri", "BRI 1");
    const card = word("w1", HOW_TO_SAY_ENGLISH, HOW_TO_SAY_POLISH, bri.id);
    expect(planHowToSayMerge([card], [bri])).toBeNull();
  });

  it("does not treat the separate how / jak card as a duplicate", () => {
    const bri = topic("bri", "BRI 1");
    const how = word("w1", "how", "jak", bri.id);
    expect(planHowToSayMerge([how], [bri])).toBeNull();
  });
});

describe("planCarTripSplit", () => {
  function word(id: string, english: string, polish: string, topicId: string): Word {
    return {
      id,
      english,
      polish,
      topicId,
      createdAt: 1,
      easeFactor: DEFAULT_EASE,
      intervalDays: 0,
      repetitions: 0,
      nextReviewAt: 0,
      learningStep: 0,
    };
  }

  it("rewrites the compound card to trip and adds car", () => {
    const compound = {
      ...word("w1", "car trip", "wycieczka samochodowa", "car-topic"),
      repetitions: 2,
    };
    const other = word("w2", "tree", "drzewo", "car-topic");

    const plan = planCarTripSplit([compound, other]);
    expect(plan).not.toBeNull();
    expect(plan?.put).toEqual([{ ...compound, english: "trip", polish: "wycieczka" }]);
    expect(plan?.add).toEqual([{ english: "car", polish: "samochód", topicId: "car-topic" }]);
    expect(plan?.deleteIds).toEqual([]);
  });

  it("does not duplicate a car or trip card that already exists", () => {
    const compound = word("w1", "car trip", "wycieczka samochodowa", "car-topic");
    const trip = word("w2", "trip", "wycieczka", "car-topic");
    const plan = planCarTripSplit([compound, trip]);
    expect(plan?.put).toEqual([{ ...compound, english: "car", polish: "samochód" }]);
    expect(plan?.add).toEqual([]);
    expect(plan?.deleteIds).toEqual([]);
  });

  it("deletes leftover compounds when both cards already exist", () => {
    const compound = word("w1", "car trip", "wycieczka samochodowa", "car-topic");
    const car = word("w2", "car", "samochód", "car-topic");
    const trip = word("w3", "trip", "wycieczka", "car-topic");
    const plan = planCarTripSplit([compound, car, trip]);
    expect(plan?.put).toEqual([]);
    expect(plan?.add).toEqual([]);
    expect(plan?.deleteIds).toEqual(["w1"]);
  });

  it("is a no-op when there is no compound card", () => {
    expect(planCarTripSplit([word("w1", "car", "samochód", "car-topic")])).toBeNull();
  });
});

describe("planWelcomePolish", () => {
  function word(id: string, english: string, polish: string): Word {
    return {
      id,
      english,
      polish,
      topicId: "memrise",
      createdAt: 1,
      easeFactor: DEFAULT_EASE,
      intervalDays: 0,
      repetitions: 0,
      nextReviewAt: 0,
      learningStep: 0,
    };
  }

  it("expands the old witamy-only card", () => {
    const card = word("w1", "welcome", "witamy");
    const plan = planWelcomePolish([card, word("w2", "me too", "ja też")]);
    expect(plan).toEqual([{ ...card, polish: WELCOME_POLISH }]);
  });

  it("is a no-op when the combined polish is already stored", () => {
    expect(planWelcomePolish([word("w1", "welcome", WELCOME_POLISH)])).toBeNull();
  });

  it("leaves a custom welcome translation alone", () => {
    expect(planWelcomePolish([word("w1", "welcome", "cześć")])).toBeNull();
  });
});

describe("planEnsureIForms", () => {
  function word(id: string, english: string, topicId: string): Word {
    return {
      id,
      english,
      polish: "x",
      topicId,
      createdAt: 1,
      easeFactor: DEFAULT_EASE,
      intervalDays: 0,
      repetitions: 0,
      nextReviewAt: 0,
      learningStep: 0,
    };
  }

  it("creates the topic and all I-form cards on an existing deck", () => {
    const plan = planEnsureIForms([{ id: "t1", name: "Shop Walk" }], [word("w1", "shop", "t1")]);
    expect(plan?.newTopicName).toBe(I_FORMS_TOPIC);
    expect(plan?.add).toEqual(I_FORM_WORDS.map(({ english, polish }) => ({ english, polish })));
  });

  it("does not add I want, which is already in Shop Walk", () => {
    const plan = planEnsureIForms(
      [{ id: "t1", name: "Shop Walk" }],
      [word("w1", "I want", "t1"), word("w2", "shop", "t1")],
    );
    expect(plan?.add.some((row) => row.english === "I want" || row.polish === "chcę")).toBe(false);
  });

  it("adds only missing cards when the I-forms topic already exists", () => {
    const topic = { id: "if", name: I_FORMS_TOPIC };
    const plan = planEnsureIForms([topic], [word("w1", "I am", topic.id), word("w2", "I can", topic.id)]);
    expect(plan?.newTopicName).toBeNull();
    expect(plan?.add.some((row) => row.english === "I am")).toBe(false);
    expect(plan?.add.some((row) => row.english === "I need")).toBe(true);
  });

  it("is a no-op when the I-forms batch is already present", () => {
    const topic = { id: "if", name: I_FORMS_TOPIC };
    const words = I_FORM_WORDS.map((row, i) => word(`w${i}`, row.english, topic.id));
    expect(planEnsureIForms([topic], words)).toBeNull();
  });
});
