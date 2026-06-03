import { useCallback, useEffect, useRef, useState } from "react";
import { getTokenEstimate } from "../../compression/extractive";
import {
  getActiveSession,
  saveContext,
} from "../../storage/contextStore";
import type { ContextSession } from "../../storage/types";
import shared from "../components/shared.module.css";
import { useStorageSync } from "../hooks/useStorageSync";
import styles from "./ActiveContextView.module.css";

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

interface Props {
  onSessionCleared: () => void;
}

export default function ActiveContextView({ onSessionCleared }: Props) {
  const [session, setSession] = useState<ContextSession | null>(null);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const active = await getActiveSession();
    setSession(active);
    setDraft(active?.compressedContext ?? "");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useStorageSync(() => {
    void load();
  });

  const persistContext = useCallback(
    async (text: string) => {
      if (!session) return;
      const updated: ContextSession = {
        ...session,
        compressedContext: text,
        tokenEstimate: getTokenEstimate(text),
        updatedAt: Date.now(),
      };
      await saveContext(session.id, updated);
      setSession(updated);
    },
    [session]
  );

  const handleChange = (value: string) => {
    setDraft(value);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void persistContext(value)
        .then(() => {
          setStatus("Saved");
          setError(false);
        })
        .catch(() => {
          setStatus("Save failed");
          setError(true);
        });
    }, 400);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setStatus("Copied to clipboard");
      setError(false);
    } catch {
      setStatus("Copy failed");
      setError(true);
    }
  };

  const handleClear = async () => {
    if (!session) return;
    const updated: ContextSession = {
      ...session,
      rawMessages: [],
      compressedContext: "",
      tokenEstimate: 0,
      updatedAt: Date.now(),
    };
    await saveContext(session.id, updated);
    setSession(updated);
    setDraft("");
    setStatus("Session cleared");
    setError(false);
    onSessionCleared();
  };

  if (!session) {
    return (
      <p className={shared.empty}>
        No active session. Create one from the Sessions tab.
      </p>
    );
  }

  const tokens =
    session.tokenEstimate || getTokenEstimate(draft);

  return (
    <div>
      <div className={styles.meta}>
        <span className={shared.badge}>{formatPlatform(session.platform)}</span>
        <span className={styles.tokens}>
          ~<strong>{tokens.toLocaleString()}</strong> tokens
        </span>
      </div>

      <label className={shared.label} htmlFor="context-editor">
        Compressed context
      </label>
      <textarea
        id="context-editor"
        className={styles.textarea}
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
        spellCheck={false}
      />

      <div className={styles.actions}>
        <button type="button" className={shared.btnSuccess} onClick={() => void handleCopy()}>
          Copy context
        </button>
        <button type="button" className={shared.btnDanger} onClick={() => void handleClear()}>
          Clear session
        </button>
      </div>

      <p
        className={`${styles.status} ${error ? styles.statusError : ""}`}
        aria-live="polite"
      >
        {status}
      </p>
    </div>
  );
}
