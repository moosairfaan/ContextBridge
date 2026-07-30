import { useEffect, useId, useState } from "react";
import { Link } from "react-router-dom";
import {
  BOOKMARKLET_BYTE_SIZE,
  BOOKMARKLET_HREF,
  BOOKMARKLET_IIFE,
} from "../bookmarklet/generatedHref";
import { copyTextToClipboard } from "../lib/clipboard";

export default function BookmarkletPage() {
  const codeFieldId = useId();
  const [codeCopied, setCodeCopied] = useState(false);
  const [copyError, setCopyError] = useState("");

  useEffect(() => {
    if (!codeCopied) return;
    const timeoutId = window.setTimeout(() => setCodeCopied(false), 1600);
    return () => window.clearTimeout(timeoutId);
  }, [codeCopied]);

  const copyBookmarkletCode = async () => {
    setCopyError("");
    try {
      await copyTextToClipboard(BOOKMARKLET_HREF);
      setCodeCopied(true);
    } catch {
      setCopyError("Copy failed — select the code below and copy manually.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8 sm:py-12">
      <header className="mb-8 space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Bookmarklet
        </h1>
        <p className="text-sm leading-relaxed text-stone-600">
          One click on ChatGPT, Claude, Gemini, or Perplexity copies a handoff
          summary to your clipboard. Prefer pasting? Use the{" "}
          <Link
            to="/"
            className="font-medium text-stone-900 underline underline-offset-2 hover:text-stone-700"
          >
            Paste
          </Link>{" "}
          tab.
        </p>
      </header>

      <div className="space-y-6">
        <section className="space-y-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-stone-800">
            Drag this to your bookmarks bar:
          </p>
          <a
            href={BOOKMARKLET_HREF}
            className="inline-flex max-w-full items-center gap-2 rounded-lg border border-stone-300 bg-stone-50 px-4 py-3 text-sm font-semibold text-stone-900 shadow-sm transition hover:border-stone-400 hover:bg-stone-100 active:bg-stone-200"
            onClick={(event) => {
              // Avoid navigating to javascript: when clicked in-app; drag/install only.
              event.preventDefault();
            }}
            title="Drag me to your bookmarks bar"
          >
            <span aria-hidden>📋</span>
            <span>ContextBridge</span>
          </a>
          <p className="text-xs leading-relaxed text-stone-500">
            Open a supported chat page, then click the bookmark. You’ll get a
            toast — success copies the summary; failure points you back to
            paste.
          </p>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-stone-800">
              Fallback: copy the code
            </h2>
            <button
              type="button"
              onClick={() => void copyBookmarkletCode()}
              className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-800 shadow-sm transition hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
            >
              {codeCopied ? "Copied!" : "Copy code"}
            </button>
          </div>
          <p className="text-xs text-stone-500">
            Create a new bookmark, paste this into the URL field. Bundle size:{" "}
            {(BOOKMARKLET_BYTE_SIZE / 1024).toFixed(1)} KB (self-contained, no
            network).
          </p>
          <textarea
            id={codeFieldId}
            readOnly
            value={BOOKMARKLET_HREF}
            rows={6}
            spellCheck={false}
            className="w-full resize-y rounded-lg border border-stone-300 bg-stone-100 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-stone-700 outline-none"
            onFocus={(event) => event.currentTarget.select()}
          />
          {copyError ? (
            <p className="text-sm text-red-700" role="alert">
              {copyError}
            </p>
          ) : null}
        </section>

        <details className="rounded-lg border border-stone-200 bg-white p-4 text-sm text-stone-600">
          <summary className="cursor-pointer font-medium text-stone-800">
            Raw IIFE (debug)
          </summary>
          <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] text-stone-500">
            {BOOKMARKLET_IIFE}
          </pre>
        </details>
      </div>
    </div>
  );
}
