import { gradeAnswer } from "./check";
import * as db from "./db";
import { keepIfTopicExists } from "./filters";
import { insertIndexAfterCurrent, pickSession, review, shouldRequeueInSession, shuffle } from "./srs";
import "./style.css";
import {
  SESSION_CAP,
  newTopic,
  newWordDraft,
  type BackupFile,
  type Grade,
  type Topic,
  type Word,
} from "./types";

type View = "study" | "words" | "topics" | "backup";

type StudyPhase = "idle" | "prompt" | "result" | "done";

const POLISH_CHARS = ["ą", "ć", "ę", "ł", "ń", "ó", "ś", "ź", "ż"] as const;

const GRADE_COPY: Record<Grade, string> = {
  correct: "Exactly right",
  almost: "Almost — watch the accents",
  wrong: "Not quite",
};

function requireApp(): HTMLDivElement {
  const el = document.querySelector<HTMLDivElement>("#app");
  if (!el) throw new Error("Missing #app");
  return el;
}

const app = requireApp();

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const state = {
  view: "study" as View,
  topics: [] as Topic[],
  words: [] as Word[],
  flash: "",
  flashOk: false,
  studyTopic: "all" as string | "all",
  session: [] as Word[],
  index: 0,
  phase: "idle" as StudyPhase,
  lastGrade: null as Grade | null,
  stats: { correct: 0, almost: 0, wrong: 0 },
  editingWordId: null as string | null,
  editingTopicId: null as string | null,
  wordFilter: "all" as string | "all",
  extraRequeues: {} as Record<string, number>,
  cram: false,
  sessionMisses: [] as Word[],
};

async function reload(): Promise<void> {
  await db.ensureSeeded();
  const [topics, words] = await Promise.all([db.listTopics(), db.listWords()]);
  state.topics = topics;
  state.words = words;
  const topicIds = topics.map((t) => t.id);
  state.studyTopic = keepIfTopicExists(state.studyTopic, topicIds);
  state.wordFilter = keepIfTopicExists(state.wordFilter, topicIds);
}

function dueCount(): number {
  const now = Date.now();
  return state.words.filter((w) => w.nextReviewAt <= now).length;
}

function topicName(id: string): string {
  return state.topics.find((t) => t.id === id)?.name ?? "Unknown topic";
}

function wordsInStudyTopic(): Word[] {
  return state.words.filter((w) => state.studyTopic === "all" || w.topicId === state.studyTopic);
}

function startSession(): void {
  state.cram = false;
  state.session = pickSession(state.words, state.studyTopic, SESSION_CAP);
  state.index = 0;
  state.stats = { correct: 0, almost: 0, wrong: 0 };
  state.lastGrade = null;
  state.extraRequeues = {};
  state.sessionMisses = [];
  state.phase = state.session.length === 0 ? "idle" : "prompt";
}

function startCram(): void {
  const pool = wordsInStudyTopic();
  state.cram = true;
  state.session = shuffle(pool).slice(0, SESSION_CAP);
  state.index = 0;
  state.stats = { correct: 0, almost: 0, wrong: 0 };
  state.lastGrade = null;
  state.extraRequeues = {};
  state.sessionMisses = [];
  state.phase = state.session.length === 0 ? "idle" : "prompt";
  if (state.phase === "idle") state.flash = "No words in this topic yet.";
}

function startRetryMisses(): void {
  if (state.cram) {
    startCram();
    return;
  }
  const misses = state.sessionMisses;
  if (misses.length === 0) {
    startSession();
    return;
  }
  state.session = shuffle(misses.slice());
  state.index = 0;
  state.stats = { correct: 0, almost: 0, wrong: 0 };
  state.lastGrade = null;
  state.extraRequeues = {};
  state.sessionMisses = [];
  state.phase = "prompt";
}

function currentCard(): Word | undefined {
  return state.session[state.index];
}

function setView(view: View): void {
  state.view = view;
  state.flash = "";
  if (view === "study") startSession();
  render();
}

function render(): void {
  app.innerHTML = `
    <header class="top">
      <h1 class="wordmark">Słów<span>ka</span></h1>
      <div class="due-pill">${dueCount()} due</div>
    </header>
    ${state.flash ? `<div class="flash ${state.flashOk ? "ok-flash" : ""}">${escapeHtml(state.flash)}</div>` : ""}
    ${viewHtml()}
    <nav class="nav">
      ${navBtn("study", "Study")}
      ${navBtn("words", "Words")}
      ${navBtn("topics", "Topics")}
      ${navBtn("backup", "Backup")}
    </nav>
  `;
  bind();
}

function navBtn(view: View, label: string): string {
  return `<button type="button" data-nav="${view}" class="${state.view === view ? "active" : ""}">${label}</button>`;
}

function viewHtml(): string {
  switch (state.view) {
    case "study":
      return studyHtml();
    case "words":
      return wordsHtml();
    case "topics":
      return topicsHtml();
    case "backup":
      return backupHtml();
  }
}

function topicOptions(selected: string, includeAll: boolean): string {
  const all = includeAll ? `<option value="all" ${selected === "all" ? "selected" : ""}>All topics</option>` : "";
  return (
    all +
    state.topics
      .map(
        (t) =>
          `<option value="${escapeHtml(t.id)}" ${selected === t.id ? "selected" : ""}>${escapeHtml(t.name)}</option>`,
      )
      .join("")
  );
}

function studyHtml(): string {
  const card = currentCard();
  const remaining = Math.max(0, state.session.length - state.index);

  if (state.phase === "done") {
    const { correct, almost, wrong } = state.stats;
    return `
      <section class="card empty">
        <h2>Session done</h2>
        <p>${correct} exact, ${almost} almost, ${wrong} to retry later.</p>
        <p class="hint">${
          state.cram
            ? "This was extra practice — the real schedule did not change."
            : "Missed words come back now. Words you got right wait about 10 minutes."
        }</p>
        <button type="button" class="primary" data-action="restart">Study again</button>
      </section>
    `;
  }

  if (!card || state.phase === "idle") {
    return `
      <p class="lead">Show English, type Polish. New and due words, up to ${SESSION_CAP}.</p>
      <label for="study-topic">Topic</label>
      <select id="study-topic">${topicOptions(state.studyTopic, true)}</select>
      <section class="empty">
        <p>Nothing due in this topic right now. Words you got right return in about 10 minutes.</p>
        ${
          wordsInStudyTopic().length > 0
            ? `<button type="button" class="primary" data-action="cram">Practice this topic anyway</button>`
            : `<button type="button" class="ghost" data-nav="words">Add words</button>`
        }
      </section>
    `;
  }

  const resultBlock =
    state.phase === "result" && state.lastGrade
      ? `
        <div class="result ${state.lastGrade}">
          <strong>${GRADE_COPY[state.lastGrade]}</strong>
          <p class="answer-reveal">${escapeHtml(card.polish)}</p>
        </div>
        <button type="button" class="primary" data-action="next">${state.index + 1 >= state.session.length ? "Finish" : "Next"}</button>
      `
      : `
        <form id="study-form" class="stack">
          <label for="answer">Polish</label>
          <input id="answer" class="answer-input" type="text" autocomplete="off" autocorrect="off" spellcheck="false" autocapitalize="off" />
          <div class="charset">
            ${POLISH_CHARS.map((c) => `<button type="button" data-char="${c}">${c}</button>`).join("")}
          </div>
          <button type="submit" class="primary">Check</button>
        </form>
      `;

  return `
      <p class="lead">${remaining} left in this session${state.cram ? " (extra practice)" : ""}</p>
    <label for="study-topic">Topic</label>
    <select id="study-topic">${topicOptions(state.studyTopic, true)}</select>
    <section class="card prompt-card">
      <div class="prompt-label">English</div>
      <p class="prompt">${escapeHtml(card.english)}</p>
    </section>
    ${resultBlock}
  `;
}

function wordsHtml(): string {
  const filter = state.wordFilter;
  const editing = state.words.find((w) => w.id === state.editingWordId);
  const shown = state.words.filter((w) => filter === "all" || w.topicId === filter);
  const topicSelectValue = editing?.topicId ?? state.topics[0]?.id ?? "";

  return `
    <h2>${editing ? "Edit word" : "Add a word"}</h2>
    ${
      state.topics.length === 0
        ? `<p class="hint">Create a topic first.</p>`
        : `
      <form id="word-form" class="card stack">
        <label for="en">English</label>
        <input id="en" name="english" type="text" required value="${escapeHtml(editing?.english ?? "")}" />
        <label for="pl">Polish</label>
        <input id="pl" name="polish" type="text" required value="${escapeHtml(editing?.polish ?? "")}" />
        <div class="charset">
          ${POLISH_CHARS.map((c) => `<button type="button" data-char="${c}" data-target="pl">${c}</button>`).join("")}
        </div>
        <label for="topic">Topic</label>
        <select id="topic" name="topicId">${topicOptions(topicSelectValue, false)}</select>
        <div class="row">
          <button type="submit" class="primary">${editing ? "Save" : "Add"}</button>
          ${editing ? `<button type="button" class="ghost" data-action="cancel-edit">Cancel</button>` : ""}
        </div>
      </form>
    `
    }
    <h2 style="margin-top:22px">Word list</h2>
    <label for="word-filter">Filter</label>
    <select id="word-filter">${topicOptions(filter, true)}</select>
    ${
      shown.length === 0
        ? `<p class="empty">No words yet.</p>`
        : `<ul class="list">${shown
            .map(
              (w) => `
            <li>
              <div class="item-title">${escapeHtml(w.english)}</div>
              <div class="item-sub">${escapeHtml(w.polish)}</div>
              <span class="chip">${escapeHtml(topicName(w.topicId))}</span>
              <div class="item-actions">
                <button type="button" class="quiet" data-edit-word="${escapeHtml(w.id)}">Edit</button>
                <button type="button" class="quiet" data-delete-word="${escapeHtml(w.id)}">Delete</button>
              </div>
            </li>`,
            )
            .join("")}</ul>`
    }
  `;
}

function topicsHtml(): string {
  return `
    <h2>Topics</h2>
    <p class="lead">Group words however she studies — food, verbs, travel.</p>
    <form id="topic-form" class="card stack">
      <label for="topic-name">${state.editingTopicId ? "Rename topic" : "New topic"}</label>
      <input id="topic-name" name="name" type="text" required value="${escapeHtml(
        state.topics.find((t) => t.id === state.editingTopicId)?.name ?? "",
      )}" />
      <div class="row">
        <button type="submit" class="primary">${state.editingTopicId ? "Save" : "Add topic"}</button>
        ${state.editingTopicId ? `<button type="button" class="ghost" data-action="cancel-topic">Cancel</button>` : ""}
      </div>
    </form>
    <ul class="list">
      ${state.topics
        .map((t) => {
          const n = state.words.filter((w) => w.topicId === t.id).length;
          return `
            <li>
              <div class="item-title">${escapeHtml(t.name)}</div>
              <div class="item-sub">${n} word${n === 1 ? "" : "s"}</div>
              <div class="item-actions">
                <button type="button" class="quiet" data-edit-topic="${escapeHtml(t.id)}">Rename</button>
                <button type="button" class="quiet" data-delete-topic="${escapeHtml(t.id)}">Delete</button>
              </div>
            </li>`;
        })
        .join("")}
    </ul>
  `;
}

function backupHtml(): string {
  return `
    <h2>Backup</h2>
    <p class="lead">Words live in this browser only. Export after adding a batch, and use the same phone or laptop — or import the file on another device.</p>
    <section class="card stack">
      <button type="button" class="primary" data-action="export">Export JSON</button>
      <label class="file-btn">
        Import JSON
        <input id="import-file" type="file" accept="application/json,.json" />
      </label>
    </section>
  `;
}

function insertChar(input: HTMLInputElement, char: string): void {
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  input.setRangeText(char, start, end, "end");
  input.focus();
}

function bind(): void {
  app.querySelectorAll<HTMLButtonElement>("[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => setView(btn.dataset.nav as View));
  });

  const studyTopic = app.querySelector<HTMLSelectElement>("#study-topic");
  studyTopic?.addEventListener("change", () => {
    state.studyTopic = studyTopic.value === "all" ? "all" : studyTopic.value;
    startSession();
    render();
  });

  app.querySelectorAll<HTMLButtonElement>("[data-char]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.target ?? "answer";
      const input = app.querySelector<HTMLInputElement>(`#${targetId}`);
      if (input && btn.dataset.char) insertChar(input, btn.dataset.char);
    });
  });

  app.querySelector<HTMLButtonElement>('[data-action="cram"]')?.addEventListener("click", () => {
    startCram();
    render();
  });

  app.querySelector<HTMLButtonElement>('[data-action="restart"]')?.addEventListener("click", () => {
    startRetryMisses();
    if (state.phase === "idle") state.flash = "Still nothing due.";
    render();
  });

  app.querySelector<HTMLButtonElement>('[data-action="next"]')?.addEventListener("click", () => {
    state.index += 1;
    state.lastGrade = null;
    state.phase = state.index >= state.session.length ? "done" : "prompt";
    render();
    app.querySelector<HTMLInputElement>("#answer")?.focus();
  });

  const studyForm = app.querySelector<HTMLFormElement>("#study-form");
  studyForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (state.phase !== "prompt") return;
    const card = currentCard();
    const input = app.querySelector<HTMLInputElement>("#answer");
    if (!card || !input) return;
    state.phase = "result";
    studyForm.querySelectorAll("button").forEach((btn) => {
      btn.disabled = true;
    });
    try {
      const grade = gradeAnswer(card.polish, input.value);
      const updated = state.cram ? card : review(card, grade);
      if (!state.cram) {
        await db.putWord(updated);
        state.words = state.words.map((w) => (w.id === updated.id ? updated : w));
      }
      state.session[state.index] = updated;
      state.lastGrade = grade;
      state.stats[grade] += 1;
      state.sessionMisses = state.sessionMisses.filter((w) => w.id !== updated.id);
      if (grade === "wrong") state.sessionMisses.push(updated);
      const extras = state.extraRequeues[updated.id] ?? 0;
      const alreadyAhead = state.session.slice(state.index + 1).some((w) => w.id === updated.id);
      if (!state.cram && !alreadyAhead && shouldRequeueInSession(extras, grade)) {
        const at = insertIndexAfterCurrent(state.index, state.session.length);
        state.session.splice(at, 0, updated);
        state.extraRequeues[updated.id] = extras + 1;
      }
    } catch (err) {
      state.phase = "prompt";
      state.flash = err instanceof Error ? err.message : "Could not save that review.";
      state.flashOk = false;
    }
    render();
    app.querySelector<HTMLButtonElement>('[data-action="next"]')?.focus();
  });

  const wordFilter = app.querySelector<HTMLSelectElement>("#word-filter");
  wordFilter?.addEventListener("change", () => {
    state.wordFilter = wordFilter.value === "all" ? "all" : wordFilter.value;
    render();
  });

  const wordForm = app.querySelector<HTMLFormElement>("#word-form");
  wordForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(wordForm);
    const english = String(data.get("english") ?? "").trim();
    const polish = String(data.get("polish") ?? "").trim();
    const topicId = String(data.get("topicId") ?? "");
    if (!english || !polish || !topicId) return;

    if (state.editingWordId) {
      const existing = state.words.find((w) => w.id === state.editingWordId);
      if (existing) {
        await db.putWord({ ...existing, english, polish, topicId });
      }
      state.editingWordId = null;
    } else {
      await db.putWord(newWordDraft(english, polish, topicId));
    }
    await reload();
    render();
    app.querySelector<HTMLInputElement>("#en")?.focus();
  });

  app.querySelector('[data-action="cancel-edit"]')?.addEventListener("click", () => {
    state.editingWordId = null;
    render();
  });

  app.querySelectorAll<HTMLButtonElement>("[data-edit-word]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.editingWordId = btn.dataset.editWord ?? null;
      render();
      app.querySelector<HTMLInputElement>("#en")?.focus();
    });
  });

  app.querySelectorAll<HTMLButtonElement>("[data-delete-word]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.deleteWord;
      if (!id || !confirm("Delete this word?")) return;
      await db.deleteWord(id);
      if (state.editingWordId === id) state.editingWordId = null;
      await reload();
      render();
    });
  });

  const topicForm = app.querySelector<HTMLFormElement>("#topic-form");
  topicForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = String(new FormData(topicForm).get("name") ?? "").trim();
    if (!name) return;
    if (state.editingTopicId) {
      const existing = state.topics.find((t) => t.id === state.editingTopicId);
      if (existing) await db.putTopic({ ...existing, name });
      state.editingTopicId = null;
    } else {
      await db.putTopic(newTopic(name));
    }
    await reload();
    render();
  });

  app.querySelector('[data-action="cancel-topic"]')?.addEventListener("click", () => {
    state.editingTopicId = null;
    render();
  });

  app.querySelectorAll<HTMLButtonElement>("[data-edit-topic]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.editingTopicId = btn.dataset.editTopic ?? null;
      render();
      app.querySelector<HTMLInputElement>("#topic-name")?.focus();
    });
  });

  app.querySelectorAll<HTMLButtonElement>("[data-delete-topic]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.deleteTopic;
      if (!id || !confirm("Delete this topic?")) return;
      try {
        await db.deleteTopic(id);
        if (state.editingTopicId === id) state.editingTopicId = null;
        await reload();
        render();
      } catch (err) {
        state.flash = err instanceof Error ? err.message : "Could not delete topic.";
        state.flashOk = false;
        render();
      }
    });
  });

  app.querySelector('[data-action="export"]')?.addEventListener("click", async () => {
    const backup = await db.exportBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const day = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `slowka-backup-${day}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  app.querySelector<HTMLInputElement>("#import-file")?.addEventListener("change", async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!confirm("Import replaces every word and topic in this browser. Continue?")) {
      (event.target as HTMLInputElement).value = "";
      return;
    }
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const backup: BackupFile = db.parseBackup(parsed);
      await db.importBackup(backup);
      await reload();
      state.flash = `Imported ${backup.words.length} words.`;
      state.flashOk = true;
    } catch (err) {
      state.flash = err instanceof Error ? err.message : "Could not import that file.";
      state.flashOk = false;
    }
    render();
  });
}

async function boot(): Promise<void> {
  try {
    await reload();
    startSession();
    render();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    app.innerHTML = `<p class="flash">Could not open the local word database. ${escapeHtml(message)}</p>`;
  }
}

void boot();
