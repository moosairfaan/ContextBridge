import { useEffect, useId, useState } from "react";
import { useCopyAndOpen } from "../hooks/useCopyAndOpen";
import { copyTextToClipboard } from "../lib/clipboard";
import { formatHandoffSummary } from "../lib/formatSummary";
import {
  parsePastedConversation,
  type PastePlatformChoice,
} from "../parsers";

const PASTE_PLACEHOLDER = `You: What's the best way to structure a React app?

ChatGPT: Start with a clear folder layout — components, hooks, and lib helpers. Keep data fetching near the edge of the UI.

You: Can you show a small example?

ChatGPT: Sure — here's a minimal App with a paste box and a format button.`;

const PLATFORM_OPTIONS: { value: PastePlatformChoice; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "chatgpt", label: "ChatGPT" },
  { value: "claude", label: "Claude" },
  { value: "gemini", label: "Gemini" },
  { value: "perplexity", label: "Perplexity" },
];

const actionButtonClassName =
  "rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-800 shadow-sm transition hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 disabled:cursor-not-allowed disabled:opacity-50";

export default function HomePage() {
  const pasteFieldId = useId();
  const platformFieldId = useId();
  const outputFieldId = useId();

  const [pastedText, setPastedText] = useState("");
  const [platformChoice, setPlatformChoice] =
    useState<PastePlatformChoice>("auto");
  const [handoffSummary, setHandoffSummary] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [copyConfirmationVisible, setCopyConfirmationVisible] = useState(false);

  const {
    copyAndOpen,
    toastMessage,
    errorMessage: openErrorMessage,
    isBusy: isOpeningChat,
    clearError: clearOpenError,
  } = useCopyAndOpen();

  useEffect(() => {
    if (!copyConfirmationVisible) return;
    const timeoutId = window.setTimeout(() => {
      setCopyConfirmationVisible(false);
    }, 1600);
    return () => window.clearTimeout(timeoutId);
  }, [copyConfirmationVisible]);

  const formatForClaude = () => {
    setErrorMessage("");
    clearOpenError();
    setCopyConfirmationVisible(false);

    const trimmed = pastedText.trim();
    if (!trimmed) {
      setHandoffSummary("");
      setErrorMessage("Paste a conversation first.");
      return;
    }

    try {
      const conversation = parsePastedConversation(trimmed, platformChoice);
      setHandoffSummary(formatHandoffSummary(conversation));
    } catch (error) {
      setHandoffSummary("");
      setErrorMessage(
        error instanceof Error ? error.message : "Could not format conversation."
      );
    }
  };

  const copyHandoffSummary = async () => {
    if (!handoffSummary.trim()) return;
    try {
      await copyTextToClipboard(handoffSummary);
      setCopyConfirmationVisible(true);
      setErrorMessage("");
      clearOpenError();
    } catch {
      setErrorMessage("Copy failed — select the output and copy manually.");
    }
  };

  const openInClaude = async () => {
    setErrorMessage("");
    const result = await copyAndOpen(handoffSummary, "claude");
    if (result.ok) {
      setCopyConfirmationVisible(true);
    }
  };

  const displayedError = errorMessage || openErrorMessage;

  return (
    <div className="relative mx-auto w-full max-w-xl px-4 py-8 sm:py-12">
      <header className="mb-8 space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Format a chat handoff
        </h1>
        <p className="text-sm leading-relaxed text-stone-600">
          Paste a labeled conversation, format a compact summary, then copy it
          into Claude (or any other chat).
        </p>
      </header>

      <div className="space-y-5">
        <div className="space-y-2">
          <label
            htmlFor={pasteFieldId}
            className="block text-sm font-medium text-stone-800"
          >
            Conversation
          </label>
          <textarea
            id={pasteFieldId}
            value={pastedText}
            onChange={(event) => setPastedText(event.target.value)}
            placeholder={PASTE_PLACEHOLDER}
            spellCheck={false}
            rows={12}
            className="w-full resize-y rounded-lg border border-stone-300 bg-white px-3 py-2.5 font-mono text-sm leading-relaxed text-stone-900 shadow-sm outline-none placeholder:text-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-200"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor={platformFieldId}
            className="block text-sm font-medium text-stone-800"
          >
            Platform
          </label>
          <select
            id={platformFieldId}
            value={platformChoice}
            onChange={(event) =>
              setPlatformChoice(event.target.value as PastePlatformChoice)
            }
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 shadow-sm outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-200"
          >
            {PLATFORM_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-stone-500">
            Auto detects labels like{" "}
            <span className="font-mono">ChatGPT:</span> or{" "}
            <span className="font-mono">Gemini:</span>, then falls back to
            generic parsing.
          </p>
        </div>

        <button
          type="button"
          onClick={formatForClaude}
          className="w-full rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-stone-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 active:bg-stone-950"
        >
          Format for Claude
        </button>

        {displayedError ? (
          <p className="text-sm text-red-700" role="alert">
            {displayedError}
          </p>
        ) : null}

        {handoffSummary ? (
          <div className="space-y-2 border-t border-stone-200 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label
                htmlFor={outputFieldId}
                className="block text-sm font-medium text-stone-800"
              >
                Handoff summary
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void copyHandoffSummary()}
                  className={actionButtonClassName}
                >
                  {copyConfirmationVisible ? "Copied!" : "Copy"}
                </button>
                <button
                  type="button"
                  onClick={() => void openInClaude()}
                  disabled={isOpeningChat || !handoffSummary.trim()}
                  className={actionButtonClassName}
                >
                  {isOpeningChat ? "Opening…" : "Open in Claude"}
                </button>
              </div>
            </div>
            <textarea
              id={outputFieldId}
              value={handoffSummary}
              readOnly
              rows={14}
              className="w-full resize-y rounded-lg border border-stone-300 bg-stone-100 px-3 py-2.5 font-mono text-sm leading-relaxed text-stone-800 outline-none"
            />
          </div>
        ) : null}
      </div>

      {toastMessage ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 left-1/2 z-50 w-[min(92vw,26rem)] -translate-x-1/2 rounded-lg bg-stone-900 px-4 py-3 text-center text-sm font-medium text-white shadow-lg"
        >
          {toastMessage}
        </div>
      ) : null}
    </div>
  );
}
