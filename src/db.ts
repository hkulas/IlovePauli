import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { CAR_TRIP_TOPIC, I_FORMS_TOPIC, LEGACY_TOPIC_RENAMES, planCarTripSplit, planClarifyKnowPrompts, planDropJade, planEnsureCar, planEnsureIForms, planHowToSayMerge, planWelcomePolish, SEED_TOPIC_NAMES, SEED_WORDS } from "./seed";
import { newTopic, newWordDraft, type BackupFile, type Topic, type Word } from "./types";

interface WordDB extends DBSchema {
  topics: {
    key: string;
    value: Topic;
  };
  words: {
    key: string;
    value: Word;
    indexes: { "by-topic": string; "by-due": number };
  };
}

const DB_NAME = "slowka";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<WordDB>> | undefined;

function getDb(): Promise<IDBPDatabase<WordDB>> {
  if (!dbPromise) {
    dbPromise = openDB<WordDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore("topics", { keyPath: "id" });
        const words = db.createObjectStore("words", { keyPath: "id" });
        words.createIndex("by-topic", "topicId");
        words.createIndex("by-due", "nextReviewAt");
      },
    });
  }
  return dbPromise;
}

export async function ensureSeeded(): Promise<void> {
  const db = await getDb();
  if ((await db.count("words")) === 0) {
    const tx = db.transaction(["topics", "words"], "readwrite");
    await tx.objectStore("topics").clear();
    const topicIdByName = new Map<string, string>();
    for (const name of SEED_TOPIC_NAMES) {
      const topic = newTopic(name);
      topicIdByName.set(name, topic.id);
      await tx.objectStore("topics").put(topic);
    }
    for (const row of SEED_WORDS) {
      const topicId = topicIdByName.get(row.topic);
      if (!topicId) throw new Error(`Missing seed topic: ${row.topic}`);
      await tx.objectStore("words").put(newWordDraft(row.english, row.polish, topicId));
    }
    await tx.done;
  }
  await renameLegacyTopics();
  await mergeHowToSayCards();
  await splitCarTripCards();
  await expandWelcomePolish();
  await clarifyKnowPrompts();
  await ensureIFormsTopic();
  await dropJadeCards();
  await ensureCarCard();
}

async function renameLegacyTopics(): Promise<void> {
  const db = await getDb();
  const topics = await db.getAll("topics");
  const updates = topics.filter((topic) => LEGACY_TOPIC_RENAMES[topic.name]);
  if (updates.length === 0) return;
  const tx = db.transaction("topics", "readwrite");
  for (const topic of updates) {
    const name = LEGACY_TOPIC_RENAMES[topic.name];
    if (!name) continue;
    await tx.store.put({ ...topic, name });
  }
  await tx.done;
}

async function mergeHowToSayCards(): Promise<void> {
  const db = await getDb();
  const words = await db.getAll("words");
  const topics = await db.getAll("topics");
  const plan = planHowToSayMerge(words, topics);
  if (!plan) return;
  const tx = db.transaction("words", "readwrite");
  await tx.store.put(plan.keep);
  for (const id of plan.deleteIds) {
    await tx.store.delete(id);
  }
  await tx.done;
}

async function splitCarTripCards(): Promise<void> {
  const db = await getDb();
  const words = await db.getAll("words");
  const plan = planCarTripSplit(words);
  if (!plan) return;
  const tx = db.transaction("words", "readwrite");
  for (const word of plan.put) {
    await tx.store.put(word);
  }
  for (const row of plan.add) {
    await tx.store.put(newWordDraft(row.english, row.polish, row.topicId));
  }
  for (const id of plan.deleteIds) {
    await tx.store.delete(id);
  }
  await tx.done;
}

async function expandWelcomePolish(): Promise<void> {
  const db = await getDb();
  const words = await db.getAll("words");
  const updates = planWelcomePolish(words);
  if (!updates) return;
  const tx = db.transaction("words", "readwrite");
  for (const word of updates) {
    await tx.store.put(word);
  }
  await tx.done;
}

async function clarifyKnowPrompts(): Promise<void> {
  const db = await getDb();
  const words = await db.getAll("words");
  const updates = planClarifyKnowPrompts(words);
  if (!updates) return;
  const tx = db.transaction("words", "readwrite");
  for (const word of updates) {
    await tx.store.put(word);
  }
  await tx.done;
}

async function ensureIFormsTopic(): Promise<void> {
  const db = await getDb();
  const [topics, words] = await Promise.all([db.getAll("topics"), db.getAll("words")]);
  const plan = planEnsureIForms(topics, words);
  if (!plan) return;
  const tx = db.transaction(["topics", "words"], "readwrite");
  let topicId = topics.find((topic) => topic.name === I_FORMS_TOPIC)?.id;
  if (plan.newTopicName) {
    const topic = newTopic(plan.newTopicName);
    topicId = topic.id;
    await tx.objectStore("topics").put(topic);
  }
  if (!topicId) throw new Error("Missing I-forms topic");
  for (const row of plan.add) {
    await tx.objectStore("words").put(newWordDraft(row.english, row.polish, topicId));
  }
  await tx.done;
}

async function dropJadeCards(): Promise<void> {
  const db = await getDb();
  const words = await db.getAll("words");
  const deleteIds = planDropJade(words);
  if (!deleteIds) return;
  const tx = db.transaction("words", "readwrite");
  for (const id of deleteIds) {
    await tx.store.delete(id);
  }
  await tx.done;
}

async function ensureCarCard(): Promise<void> {
  const db = await getDb();
  const [topics, words] = await Promise.all([db.getAll("topics"), db.getAll("words")]);
  const plan = planEnsureCar(topics, words);
  if (!plan) return;
  const tx = db.transaction(["topics", "words"], "readwrite");
  let topicId = topics.find((topic) => topic.name === CAR_TRIP_TOPIC)?.id;
  if (plan.newTopicName) {
    const topic = newTopic(plan.newTopicName);
    topicId = topic.id;
    await tx.objectStore("topics").put(topic);
  }
  if (!topicId) throw new Error("Missing Car trip topic");
  await tx.objectStore("words").put(newWordDraft(plan.add.english, plan.add.polish, topicId));
  await tx.done;
}

export async function listTopics(): Promise<Topic[]> {
  const db = await getDb();
  const topics = await db.getAll("topics");
  return topics.sort((a, b) => a.name.localeCompare(b.name, "en"));
}

export async function listWords(): Promise<Word[]> {
  const db = await getDb();
  const words = await db.getAll("words");
  return words.sort((a, b) => a.english.localeCompare(b.english, "en"));
}

export async function putTopic(topic: Topic): Promise<void> {
  const db = await getDb();
  await db.put("topics", topic);
}

export async function putWord(word: Word): Promise<void> {
  const db = await getDb();
  await db.put("words", word);
}

export async function deleteWord(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("words", id);
}

export async function countWordsInTopic(topicId: string): Promise<number> {
  const db = await getDb();
  return db.countFromIndex("words", "by-topic", topicId);
}

export async function deleteTopic(id: string): Promise<void> {
  const n = await countWordsInTopic(id);
  if (n > 0) {
    throw new Error(`This topic still has ${n} word${n === 1 ? "" : "s"}. Move or delete them first.`);
  }
  const db = await getDb();
  await db.delete("topics", id);
}

function isTopic(value: unknown): value is Topic {
  if (typeof value !== "object" || value === null) return false;
  const t = value as Topic;
  return typeof t.id === "string" && typeof t.name === "string";
}

function isWord(value: unknown): value is Word {
  if (typeof value !== "object" || value === null) return false;
  const w = value as Word;
  return (
    typeof w.id === "string" &&
    typeof w.english === "string" &&
    typeof w.polish === "string" &&
    typeof w.topicId === "string" &&
    typeof w.createdAt === "number" &&
    typeof w.easeFactor === "number" &&
    typeof w.intervalDays === "number" &&
    typeof w.repetitions === "number" &&
    typeof w.nextReviewAt === "number"
  );
}

export function parseBackup(raw: unknown): BackupFile {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Backup file is not an object.");
  }
  const data = raw as Partial<BackupFile>;
  if (data.version !== 1) {
    throw new Error("Unknown backup version. Expected version 1.");
  }
  if (!Array.isArray(data.topics) || !Array.isArray(data.words)) {
    throw new Error("Backup must include topics and words arrays.");
  }
  if (!data.topics.every(isTopic) || !data.words.every(isWord)) {
    throw new Error("Backup contains an invalid topic or word.");
  }
  return {
    version: 1,
    exportedAt: typeof data.exportedAt === "string" ? data.exportedAt : new Date().toISOString(),
    topics: data.topics,
    words: data.words.map((w) => ({
      ...w,
      learningStep: typeof w.learningStep === "number" ? w.learningStep : 0,
    })),
  };
}

export async function exportBackup(): Promise<BackupFile> {
  const [topics, words] = await Promise.all([listTopics(), listWords()]);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    topics,
    words,
  };
}

export async function importBackup(backup: BackupFile): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(["topics", "words"], "readwrite");
  await tx.objectStore("topics").clear();
  await tx.objectStore("words").clear();
  for (const topic of backup.topics) {
    await tx.objectStore("topics").put(topic);
  }
  for (const word of backup.words) {
    await tx.objectStore("words").put(word);
  }
  await tx.done;
}
