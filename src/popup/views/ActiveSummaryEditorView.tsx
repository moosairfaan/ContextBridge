import { useCallback, useEffect, useRef, useState } from "react";
import {
  readActiveConversationSession,
  saveConversationSession,
} from "../../storage/conversationSessionStore";
import type { ConversationSession } from "../../storage/conversationSessionTypes";
import { formatAiPlatformDisplayName } from "../../shared/formatAiPlatformDisplayName";
import shared from "../components/shared.module.css";
import { useConversationSessionStorageSync } from "../hooks/useConversationSessionStorageSync";
import styles from "./ActiveSummaryEditorView.module.css";

interface ActiveSummaryEditorViewProperties {
  onSessionCleared: () => void;
}

function conversationSessionWithSummaryText(
  conversationSession: ConversationSession,
  summaryText: string
): ConversationSession {
  return {
    ...conversationSession,
    summary: summaryText,
    updatedAt: Date.now(),
  };
}

function conversationSessionWithEmptySummary(
  conversationSession: ConversationSession
): ConversationSession {
  return conversationSessionWithSummaryText(conversationSession, "");
}

export default function ActiveSummaryEditorView({
  onSessionCleared,
}: ActiveSummaryEditorViewProperties) {
  const [activeConversationSession, setActiveConversationSession] =
    useState<ConversationSession | null>(null);
  const [summaryDraftText, setSummaryDraftText] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [hasError, setHasError] = useState(false);
  const saveSummaryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadActiveConversationSession = useCallback(async () => {
    const conversationSession = await readActiveConversationSession();
    setActiveConversationSession(conversationSession);
    setSummaryDraftText(conversationSession?.summary ?? "");
  }, []);

  useEffect(() => {
    void loadActiveConversationSession();
  }, [loadActiveConversationSession]);

  useConversationSessionStorageSync(() => {
    void loadActiveConversationSession();
  });

  const saveSummaryTextToStorage = useCallback(
    async (summaryText: string) => {
      if (!activeConversationSession) return;
      const updatedConversationSession = conversationSessionWithSummaryText(
        activeConversationSession,
        summaryText
      );
      await saveConversationSession(
        activeConversationSession.id,
        updatedConversationSession
      );
      setActiveConversationSession(updatedConversationSession);
    },
    [activeConversationSession]
  );

  const showSavedStatus = () => {
    setStatusMessage("Saved");
    setHasError(false);
  };

  const showSaveFailedStatus = () => {
    setStatusMessage("Save failed");
    setHasError(true);
  };

  const scheduleDebouncedSummarySave = (summaryText: string) => {
    if (saveSummaryTimer.current) clearTimeout(saveSummaryTimer.current);
    saveSummaryTimer.current = setTimeout(() => {
      void saveSummaryTextToStorage(summaryText)
        .then(showSavedStatus)
        .catch(showSaveFailedStatus);
    }, 400);
  };

  const onSummaryDraftChange = (summaryText: string) => {
    setSummaryDraftText(summaryText);
    scheduleDebouncedSummarySave(summaryText);
  };

  const copySummaryToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(summaryDraftText);
      setStatusMessage("Copied to clipboard");
      setHasError(false);
    } catch {
      setStatusMessage("Copy failed");
      setHasError(true);
    }
  };

  const clearActiveConversationSession = async () => {
    if (!activeConversationSession) return;
    const clearedConversationSession = conversationSessionWithEmptySummary(
      activeConversationSession
    );
    await saveConversationSession(
      activeConversationSession.id,
      clearedConversationSession
    );
    setActiveConversationSession(clearedConversationSession);
    setSummaryDraftText("");
    setStatusMessage("Session cleared");
    setHasError(false);
    onSessionCleared();
  };

  if (!activeConversationSession) {
    return (
      <p className={shared.empty}>
        No active session. Create one from the Sessions tab.
      </p>
    );
  }

  return (
    <div>
      <div className={styles.meta}>
        <span className={shared.badge}>
          {formatAiPlatformDisplayName(activeConversationSession.platform)}
        </span>
      </div>

      <label className={shared.label} htmlFor="context-editor">
        Summary
      </label>
      <textarea
        id="context-editor"
        className={styles.textarea}
        value={summaryDraftText}
        onChange={(event) => onSummaryDraftChange(event.target.value)}
        spellCheck={false}
      />

      <div className={styles.actions}>
        <button
          type="button"
          className={shared.btnSuccess}
          onClick={() => void copySummaryToClipboard()}
        >
          Copy summary
        </button>
        <button
          type="button"
          className={shared.btnDanger}
          onClick={() => void clearActiveConversationSession()}
        >
          Clear session
        </button>
      </div>

      <p
        className={`${styles.status} ${hasError ? styles.statusError : ""}`}
        aria-live="polite"
      >
        {statusMessage}
      </p>
    </div>
  );
}
