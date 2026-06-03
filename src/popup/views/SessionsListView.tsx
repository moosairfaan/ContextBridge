import { useCallback, useEffect, useState } from "react";
import { sendBackgroundMessage } from "../../messaging/sendBackgroundMessage";
import {
  deleteSession,
  getActiveSession,
  getAllSessions,
} from "../../storage/contextStore";
import type { ContextSession } from "../../storage/types";
import shared from "../components/shared.module.css";
import { useStorageSync } from "../hooks/useStorageSync";
import styles from "./SessionsListView.module.css";

function formatPlatform(platform: string): string {
  const labels: Record<string, string> = {
    chatgpt: "ChatGPT",
    claude: "Claude",
    gemini: "Gemini",
    perplexity: "Perplexity",
    manual: "Manual",
  };
  return labels[platform] ?? platform;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  onSessionActivated: () => void;
}

export default function SessionsListView({ onSessionActivated }: Props) {
  const [sessions, setSessions] = useState<ContextSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [all, active] = await Promise.all([
      getAllSessions(),
      getActiveSession(),
    ]);
    setSessions(all);
    setActiveId(active?.id ?? null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useStorageSync(() => {
    void load();
  });

  const activate = async (id: string) => {
    try {
      const response = await sendBackgroundMessage({
        type: "SWITCH_SESSION",
        sessionId: id,
      });
      if (!response.ok) {
        console.error("[ContextBridge] SWITCH_SESSION failed:", response.error);
        return;
      }
      setActiveId(id);
      onSessionActivated();
    } catch (err) {
      console.error("[ContextBridge] SWITCH_SESSION failed:", err);
    }
  };

  const handleDelete = async (
    e: React.MouseEvent,
    id: string
  ) => {
    e.stopPropagation();
    await deleteSession(id);
    await load();
  };

  const handleNew = async () => {
    try {
      const response = await sendBackgroundMessage({
        type: "CREATE_SESSION",
        platform: "manual",
      });
      if (!response.ok) {
        console.error("[ContextBridge] CREATE_SESSION failed:", response.error);
        return;
      }
      await load();
      onSessionActivated();
    } catch (err) {
      console.error("[ContextBridge] CREATE_SESSION failed:", err);
    }
  };

  return (
    <div>
      <div className={styles.newRow}>
        <button type="button" className={shared.btnPrimary} onClick={() => void handleNew()}>
          New session
        </button>
      </div>

      {sessions.length === 0 ? (
        <p className={shared.empty}>No saved sessions yet.</p>
      ) : (
        <div className={styles.list}>
          {sessions.map((s) => (
            <div
              key={s.id}
              role="button"
              tabIndex={0}
              className={`${styles.card} ${s.id === activeId ? styles.cardActive : ""}`}
              onClick={() => void activate(s.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  void activate(s.id);
                }
              }}
            >
              <div className={styles.cardTop}>
                <h3 className={styles.cardTitle}>{s.title}</h3>
                <button
                  type="button"
                  className={styles.deleteBtn}
                  title="Delete session"
                  aria-label="Delete session"
                  onClick={(e) => void handleDelete(e, s.id)}
                >
                  ×
                </button>
              </div>
              <div className={styles.cardMeta}>
                <span className={shared.badge}>{formatPlatform(s.platform)}</span>
                <span>{formatDate(s.updatedAt)}</span>
                <span>~{s.tokenEstimate.toLocaleString()} tok</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
