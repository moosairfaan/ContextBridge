import { useCallback, useEffect, useState } from "react";
import { sendMessageToServiceWorker } from "../../messaging/sendMessageToServiceWorker";
import {
  deleteConversationSession,
  readActiveConversationSession,
  listAllConversationSessions,
} from "../../storage/conversationSessionStore";
import type { ConversationSession } from "../../storage/conversationSessionTypes";
import { formatAiPlatformDisplayName } from "../../shared/formatAiPlatformDisplayName";
import shared from "../components/shared.module.css";
import { useConversationSessionStorageSync } from "../hooks/useConversationSessionStorageSync";
import styles from "./ConversationSessionsListView.module.css";

function formatSessionUpdatedAt(timestampMilliseconds: number): string {
  return new Date(timestampMilliseconds).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSummaryCharacterCount(summaryText: string): string {
  return `${summaryText.length.toLocaleString()} chars`;
}

interface ConversationSessionsListViewProperties {
  onSessionActivated: () => void;
}

export default function ConversationSessionsListView({
  onSessionActivated,
}: ConversationSessionsListViewProperties) {
  const [conversationSessions, setConversationSessions] = useState<
    ConversationSession[]
  >([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const loadConversationSessionsFromStorage = useCallback(async () => {
    const [allSessions, activeSession] = await Promise.all([
      listAllConversationSessions(),
      readActiveConversationSession(),
    ]);
    setConversationSessions(allSessions);
    setActiveSessionId(activeSession?.id ?? null);
  }, []);

  useEffect(() => {
    void loadConversationSessionsFromStorage();
  }, [loadConversationSessionsFromStorage]);

  useConversationSessionStorageSync(() => {
    void loadConversationSessionsFromStorage();
  });

  const activateConversationSession = async (sessionId: string) => {
    try {
      const responseMessage = await sendMessageToServiceWorker({
        type: "SWITCH_SESSION",
        sessionId,
      });
      if (!responseMessage.ok) {
        console.error(
          "[ContextBridge] SWITCH_SESSION failed:",
          responseMessage.error
        );
        return;
      }
      setActiveSessionId(sessionId);
      onSessionActivated();
    } catch (error) {
      console.error("[ContextBridge] SWITCH_SESSION failed:", error);
    }
  };

  const removeConversationSession = async (sessionId: string) => {
    await deleteConversationSession(sessionId);
    await loadConversationSessionsFromStorage();
  };

  const onDeleteSessionClick = async (
    clickEvent: React.MouseEvent,
    sessionId: string
  ) => {
    clickEvent.stopPropagation();
    await removeConversationSession(sessionId);
  };

  const createManualConversationSession = async (): Promise<boolean> => {
    const responseMessage = await sendMessageToServiceWorker({
      type: "CREATE_SESSION",
      platform: "manual",
    });
    if (!responseMessage.ok) {
      console.error(
        "[ContextBridge] CREATE_SESSION failed:",
        responseMessage.error
      );
      return false;
    }
    return true;
  };

  const onNewSessionClick = async () => {
    try {
      const sessionWasCreated = await createManualConversationSession();
      if (!sessionWasCreated) return;
      await loadConversationSessionsFromStorage();
      onSessionActivated();
    } catch (error) {
      console.error("[ContextBridge] CREATE_SESSION failed:", error);
    }
  };

  return (
    <div>
      <div className={styles.newRow}>
        <button
          type="button"
          className={shared.btnPrimary}
          onClick={() => void onNewSessionClick()}
        >
          New session
        </button>
      </div>

      {conversationSessions.length === 0 ? (
        <p className={shared.empty}>No saved sessions yet.</p>
      ) : (
        <div className={styles.list}>
          {conversationSessions.map((conversationSession) => (
            <div
              key={conversationSession.id}
              role="button"
              tabIndex={0}
              className={`${styles.card} ${
                conversationSession.id === activeSessionId
                  ? styles.cardActive
                  : ""
              }`}
              onClick={() => void activateConversationSession(conversationSession.id)}
              onKeyDown={(keyboardEvent) => {
                if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
                  keyboardEvent.preventDefault();
                  void activateConversationSession(conversationSession.id);
                }
              }}
            >
              <div className={styles.cardTop}>
                <h3 className={styles.cardTitle}>{conversationSession.title}</h3>
                <button
                  type="button"
                  className={styles.deleteBtn}
                  title="Delete session"
                  aria-label="Delete session"
                  onClick={(clickEvent) =>
                    void onDeleteSessionClick(clickEvent, conversationSession.id)
                  }
                >
                  ×
                </button>
              </div>
              <div className={styles.cardMeta}>
                <span className={shared.badge}>
                  {formatAiPlatformDisplayName(conversationSession.platform)}
                </span>
                <span>
                  {formatSessionUpdatedAt(conversationSession.updatedAt)}
                </span>
                {conversationSession.summary ? (
                  <span>
                    {formatSummaryCharacterCount(conversationSession.summary)}
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
