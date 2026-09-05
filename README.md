# Słówka: Polish spaced repetition

A small site for learning Polish vocabulary. You add cards with English on one side and Polish on the other, sort them into topics, then practice by typing the Polish when you see the English. It uses SM-2 for scheduling, the same idea as Anki.

Everything stays in **this browser** (IndexedDB). GitHub Pages has no server, so there is no shared database.

## Add words

On a fresh browser, the first notebook pages (Shop Walk, Car trip, BRI 1, Memrise 1) load on their own. If a topic like I-forms or Connectors is missing, it gets added the next time you visit.

1. Open **Words** to add more. Enter the English, the Polish, pick a topic, tap **Add**.
2. Open **Topics** to create groups or rename the starter ones.
3. Use the character bar for `ą ć ę ł ń ó ś ź ż`.

## Study

1. Open **Study**. You can filter by topic if you want.
2. New words show the Polish first. Tap **Let me type it**, then type your answer.
3. Type the Polish and tap **Check** (or press Enter). Stuck? **I don't know** shows the answer and sends the word back later in the session.
4. Exact match is correct. Missing diacritics only counts as *almost* (still a pass). So does one wrong, missing, or extra letter on words with six letters or more. Shorter words are strict: `drogi` and `droga` are not the same word.
5. Missed words return in the same session. Correct ones wait about 10 minutes, then follow the 1 day / 6 day SM-2 intervals. Nothing due? **Practice this topic anyway** runs through the words without touching the schedule.

## Backup

Nothing is synced to GitHub. Your data lives on whatever phone or laptop you used.

After a big import, open **Backup**, tap **Export JSON**, and save the file somewhere safe. On a new device (or after clearing browser data), use **Import JSON**. That **replaces** everything in the browser. Stick to the same browser and avoid wiping site data, or you will need that export again.

## Local development

Node 18 or newer.

```bash
npm install
npm test
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173/`).

## GitHub Pages

Pushing to `main` triggers a GitHub Actions build and deploys `dist/`.

Repo: `https://github.com/hkulas/IlovePauli`. Live site: `https://hkulas.github.io/IlovePauli/`.

1. Push this project to `main`.
2. In the repo, go to **Settings**, **Pages**, **Build and deployment**, and set **Source** to **GitHub Actions**.
3. Wait for the **Deploy to GitHub Pages** workflow to finish.

For a production build (same as CI), asset URLs are prefixed with `/IlovePauli/`:

```bash
GITHUB_PAGES=true npm run build
npm run preview
```
