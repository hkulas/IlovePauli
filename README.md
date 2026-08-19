# Słówka — Polish spaced repetition

A small website for learning Polish words. Add English → Polish cards, group them by topic, then type the Polish when the English is shown. Scheduling uses SM-2 (the same family of algorithm as Anki).

Words are stored in **this browser** (IndexedDB). GitHub Pages cannot run a server-side SQLite database.

## Add words

The first notebook pages (Everyday, More words, BRI 1, Memrise 1) load automatically the first time this browser has no words.

1. Open **Words** to add more. Type the English, the Polish, pick a topic, tap **Add**.
2. Open **Topics** to add groups (or rename the starter ones).
3. Use the character bar for `ą ć ę ł ń ó ś ź ż`.

## Study

1. Open **Study**. Optionally filter by topic.
2. Type the Polish and tap **Check** (or press Enter).
3. Exact match counts as correct. Missing only diacritics counts as *almost* (still a pass) and shows the proper spelling.
4. Up to 20 due cards per session. Wrong cards come back tomorrow; correct ones wait longer.

## Backup

Data never goes to GitHub. It lives on the phone or laptop you used.

- After adding a batch of words, open **Backup** → **Export JSON** and keep the file somewhere safe.
- On another device (or after clearing the browser), **Import JSON**. Import **replaces** everything currently in that browser.
- Use the same browser and do not wipe site data, or you will need that export.

## Local development

Needs Node 18+.

```bash
npm install
npm test
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173/`).

## GitHub Pages

The GitHub Actions workflow builds on every push to `main` and deploys `dist/`.

Repo: `https://github.com/hkulas/IlovePauli`. The site is served at `https://hkulas.github.io/IlovePauli/`.

1. Push this project to `main`.
2. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Wait for the **Deploy to GitHub Pages** workflow to finish.

A production build (also used in CI) prefixes asset URLs with `/IlovePauli/`:

```bash
GITHUB_PAGES=true npm run build
npm run preview
```
