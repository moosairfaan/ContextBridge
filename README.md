# ContextBridge

Carry a conversation from one AI chat to another. Paste a transcript (or grab it with a bookmarklet), get a compact handoff summary, then continue in Claude — or any other chat.

## Repo layout

| Path | What it is |
|------|------------|
| **Repo root** | Web app (Vite + React) — paste UI, bookmarklet, Vercel deploy |
| **`extension/`** | Chrome MV3 extension (optional / legacy) |

## Two ways to use the web app

### 1. Manual paste

1. Open the app home page.
2. Paste a conversation into the text box.
3. Pick a platform (or leave **Auto**).
4. Click **Format for Claude**.
5. **Copy** or **Open in Claude** (copies + opens `claude.ai/new` so you can paste).

Label formats that work best:

```text
You: …
ChatGPT: …

Human: …
Claude: …

You: …
Gemini: …
```

If there are no labels, blank-line-separated blocks are treated as alternating user / assistant turns.

### 2. Bookmarklet

1. Open **/bookmarklet** in the app.
2. Drag **📋 ContextBridge** to your bookmarks bar (or copy the `javascript:` URL).
3. On ChatGPT, Claude, Gemini, or Perplexity, click the bookmark.
4. A toast confirms the summary was copied — paste it into the next chat.

The bookmarklet is self-contained (~10 KB), with no network calls and no React.

## Supported platforms

| Platform   | Paste labels                         | Bookmarklet (live DOM)   |
|------------|--------------------------------------|--------------------------|
| ChatGPT    | `You:` / `ChatGPT:`                  | chatgpt.com              |
| Claude     | `Human:` / `Claude:` / `Assistant:`  | claude.ai                |
| Gemini     | `You:` / `Gemini:`                   | gemini.google.com        |
| Perplexity | generic / blank-line fallback        | perplexity.ai            |

## Develop (web app)

```bash
npm install
npm run dev
```

- App: http://localhost:5173  
- Bookmarklet page: http://localhost:5173/bookmarklet  

```bash
npm test                 # unit tests
npm run build            # bookmarklet + Vite production build
npm run build:bookmarklet
```

## Chrome extension

```bash
cd extension
npm install
npm run build
```

Load unpacked from `extension/dist` in `chrome://extensions`. See `extension/README.md`.

## Deploy (Vercel)

- **Root directory:** repo root (not `extension/`)
- **Build command:** `npm run build`
- **Output directory:** `dist`
- `vercel.json` rewrites all routes to `index.html` so `/bookmarklet` works with client-side routing.

```bash
npx vercel
```
