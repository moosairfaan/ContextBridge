# ContextBridge

You're mid-conversation on ChatGPT and want to switch to Claude — or your credits just ran out. ContextBridge grabs your chat, turns it into a clean handoff summary, and lets you paste it into Claude so you can pick up where you left off. No retyping, no lost context.

## How to use it

### Bookmarklet (fastest)

1. Open `bookmarklet.txt` and copy the `javascript:` URL.
2. Create a new bookmark in your browser and paste that URL as the address. Name it something like "ContextBridge."
3. Go to a ChatGPT conversation and click the bookmark.
4. You'll see a toast confirming it copied. Open Claude, paste, and continue.

### Website (manual paste)

1. Open `index.html` in your browser.
2. Paste your ChatGPT conversation into the input box (text with `You:` and `ChatGPT:` labels works best).
3. Click **Format for Claude**.
4. Copy the output and paste it into Claude.

## How it works

- Reads your conversation — either from the ChatGPT page directly, or from text you paste in
- Splits it into turns (your messages vs. ChatGPT's replies)
- Pulls out the main topic, key points, and your last question
- Formats the last few exchanges into a short summary Claude can read and continue from

## Why I built it

I kept hitting the same wall: deep in a useful ChatGPT thread, need to switch models, and don't want to re-explain everything from scratch. This is the copy-paste bridge I wished existed.
