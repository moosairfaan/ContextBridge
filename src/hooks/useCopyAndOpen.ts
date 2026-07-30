import { useCallback, useEffect, useRef, useState } from "react";
import { copyTextToClipboard } from "../lib/clipboard";
import {
  OPEN_CHAT_TARGETS,
  pasteReminderMessage,
  type OpenChatTarget,
  type OpenChatTargetId,
} from "../lib/openChatTargets";

export interface UseCopyAndOpenOptions {
  /** How long the paste-reminder toast stays visible. Default 3200ms. */
  toastDurationMs?: number;
}

export interface CopyAndOpenResult {
  ok: boolean;
  error?: string;
}

/**
 * Copy text to the clipboard, open a chat site in a new tab, and show a
 * short on-page reminder to paste. Reusable for Claude / ChatGPT / Gemini.
 */
export function useCopyAndOpen(options: UseCopyAndOpenOptions = {}) {
  const toastDurationMs = options.toastDurationMs ?? 3200;
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const toastTimeoutRef = useRef<number | null>(null);

  const clearToast = useCallback(() => {
    if (toastTimeoutRef.current !== null) {
      window.clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
    setToastMessage(null);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current !== null) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const showToast = useCallback(
    (message: string) => {
      clearToast();
      setToastMessage(message);
      toastTimeoutRef.current = window.setTimeout(() => {
        setToastMessage(null);
        toastTimeoutRef.current = null;
      }, toastDurationMs);
    },
    [clearToast, toastDurationMs]
  );

  const resolveTarget = useCallback(
    (target: OpenChatTarget | OpenChatTargetId): OpenChatTarget => {
      if (typeof target === "string") {
        return OPEN_CHAT_TARGETS[target];
      }
      return target;
    },
    []
  );

  const copyAndOpen = useCallback(
    async (
      text: string,
      target: OpenChatTarget | OpenChatTargetId
    ): Promise<CopyAndOpenResult> => {
      const trimmed = text.trim();
      if (!trimmed) {
        const error = "Nothing to copy yet.";
        setErrorMessage(error);
        return { ok: false, error };
      }

      const chatTarget = resolveTarget(target);
      setIsBusy(true);
      setErrorMessage(null);

      try {
        await copyTextToClipboard(trimmed);

        const openedWindow = window.open(
          chatTarget.newChatUrl,
          "_blank",
          "noopener,noreferrer"
        );
        if (!openedWindow) {
          const error =
            "Copied, but the new tab was blocked — allow pop-ups and try again, or paste manually.";
          setErrorMessage(error);
          showToast(pasteReminderMessage(chatTarget.label));
          return { ok: false, error };
        }

        showToast(pasteReminderMessage(chatTarget.label));
        return { ok: true };
      } catch {
        const error = "Copy failed — select the output and copy manually.";
        setErrorMessage(error);
        return { ok: false, error };
      } finally {
        setIsBusy(false);
      }
    },
    [resolveTarget, showToast]
  );

  return {
    copyAndOpen,
    toastMessage,
    errorMessage,
    isBusy,
    clearToast,
    clearError: () => setErrorMessage(null),
  };
}
