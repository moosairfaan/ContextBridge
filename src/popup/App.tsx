import { useEffect, useState } from "react";
import { pingBackground } from "../messaging/sendBackgroundMessage";
import styles from "./App.module.css";
import ActiveContextView from "./views/ActiveContextView";
import SessionsListView from "./views/SessionsListView";
import SettingsView from "./views/SettingsView";

type TabId = "context" | "sessions" | "settings";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "context", label: "Context", icon: "◈" },
  { id: "sessions", label: "Sessions", icon: "☰" },
  { id: "settings", label: "Settings", icon: "⚙" },
];

const TAB_TITLES: Record<TabId, string> = {
  context: "Active context",
  sessions: "Sessions",
  settings: "Settings",
};

export default function App() {
  const [tab, setTab] = useState<TabId>("context");
  const [refreshKey, setRefreshKey] = useState(0);
  const [bgConnected, setBgConnected] = useState<boolean | null>(null);

  useEffect(() => {
    void pingBackground().then(setBgConnected);
  }, []);

  const bump = () => setRefreshKey((k) => k + 1);

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>{TAB_TITLES[tab]}</h1>
        <p className={styles.subtitle}>
          ContextBridge
          {bgConnected === false && (
            <span style={{ color: "#ef4444" }}> · background offline</span>
          )}
        </p>
      </header>

      <main className={styles.main}>
        <div className={styles.content}>
          {tab === "context" && (
            <ActiveContextView
              key={refreshKey}
              onSessionCleared={bump}
            />
          )}
          {tab === "sessions" && (
            <SessionsListView
              onSessionActivated={() => {
                bump();
                setTab("context");
              }}
            />
          )}
          {tab === "settings" && <SettingsView />}
        </div>
      </main>

      <nav className={styles.tabBar} aria-label="Main navigation">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`${styles.tab} ${tab === t.id ? styles.tabActive : ""}`}
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? "page" : undefined}
          >
            <span className={styles.tabIcon} aria-hidden>
              {t.icon}
            </span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
