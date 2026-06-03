# ContextBridge

Chrome extension (Manifest V3) that captures conversation context across AI chat platforms and injects compressed context when you switch between them.

Supported sites: ChatGPT (`chat.openai.com`, `chatgpt.com`), Claude (`claude.ai`), Gemini (`gemini.google.com`), Perplexity (`perplexity.ai`).

## Setup

1. Clone the repository and open the project folder.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Build the extension (or start watch mode for popup/background changes):

   ```bash
   npm run build
   # or
   npm run dev
   ```

   After editing `src/content/`, rebuild the content script and patch the manifest:

   ```bash
   npm run build:content && npm run patch:manifest
   ```

4. Load the extension in Chrome:
   - Open `chrome://extensions`
   - Enable **Developer mode**
   - Click **Load unpacked**
   - Select the **`dist/`** folder (not the repo root)

5. Optional type-check:

   ```bash
   npm run typecheck
   ```

6. Production build:

   ```bash
   npm run build
   ```

## Using ContextBridge

- On any supported AI platform, a **floating brain button** appears in the bottom-right corner. Click it to toggle whether context injection is active.
- Click the extension icon to open the **popup sidebar** (380×560): view/edit active compressed context, manage sessions, and change settings (compression strategy, auto-inject, max context size).
- When you switch to a supported tab, the extension can automatically send compressed context to the page (if auto-inject and injection are enabled in Settings).

## Build output (`dist/`)

CRXJS compiles source paths from `public/manifest.json` into production assets:

| Entry | Source (`public/manifest.json`) | Built output (`dist/`) |
|-------|-------------------------------|-------------------------|
| Popup | `src/popup/index.html` | `src/popup/index.html` + `assets/index.html-*.js` |
| Background | `src/background/index.ts` | `service-worker-loader.js` + `assets/*.js` (ES module) |
| Content script | *(patched post-build)* | `content-script.js` (IIFE, non-module) |

`public/manifest.json` defines popup and background entry points. The content script is built separately as an IIFE (`vite.content.config.ts`) because Chrome content scripts must not run as ES modules. `scripts/patch-manifest.mjs` adds `content_scripts` to `dist/manifest.json` with matches for ChatGPT, Claude, Gemini, and Perplexity (`content-script.js`).

## Project structure

```
src/
  popup/          React sidebar UI
  background/     MV3 service worker
  content/        IIFE content script (platform adapters + floating toggle)
  storage/        chrome.storage.local sessions + settings
  compression/    Extractive + abstractive (Transformers.js) compression
  platforms/      Per-site DOM adapters
  messaging/      Shared message types (background ↔ content)
```

## Tech stack

- React 18, TypeScript, Vite 6
- [@crxjs/vite-plugin](https://crxjs.dev/vite-plugin) for extension bundling and watch builds
- [@xenova/transformers](https://github.com/xenova/transformers.js) for optional local abstractive summarization
