import { useEffect, useState } from "react";
import { checkServiceWorkerIsReachable } from "../messaging/sendMessageToServiceWorker";
import styles from "./App.module.css";
import ActiveSummaryEditorView from "./views/ActiveSummaryEditorView";
import ConversationSessionsListView from "./views/ConversationSessionsListView";
import ExtensionSettingsView from "./views/ExtensionSettingsView";

type PopupTabName = "summary" | "sessions" | "settings";

const POPUP_NAVIGATION_TABS: {
  tabName: PopupTabName;
  label: string;
  icon: string;
}[] = [
  { tabName: "summary", label: "Context", icon: "◈" },
  { tabName: "sessions", label: "Sessions", icon: "☰" },
  { tabName: "settings", label: "Settings", icon: "⚙" },
];

const POPUP_TAB_HEADING_TEXT: Record<PopupTabName, string> = {
  summary: "Summary",
  sessions: "Sessions",
  settings: "Settings",
};

export default function App() {
  const [activePopupTab, setActivePopupTab] =
    useState<PopupTabName>("summary");
  const [activeSummaryViewRefreshKey, setActiveSummaryViewRefreshKey] =
    useState(0);
  const [isServiceWorkerReachable, setIsServiceWorkerReachable] = useState<
    boolean | null
  >(null);

  useEffect(() => {
    void checkServiceWorkerIsReachable().then(setIsServiceWorkerReachable);
  }, []);

  const refreshActiveSummaryEditorView = () =>
    setActiveSummaryViewRefreshKey((previousKey) => previousKey + 1);

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          {POPUP_TAB_HEADING_TEXT[activePopupTab]}
        </h1>
        <p className={styles.subtitle}>
          ContextBridge
          {isServiceWorkerReachable === false && (
            <span style={{ color: "#ef4444" }}> · background offline</span>
          )}
        </p>
      </header>

      <main className={styles.main}>
        <div className={styles.content}>
          {activePopupTab === "summary" && (
            <ActiveSummaryEditorView
              key={activeSummaryViewRefreshKey}
              onSessionCleared={refreshActiveSummaryEditorView}
            />
          )}
          {activePopupTab === "sessions" && (
            <ConversationSessionsListView
              onSessionActivated={() => {
                refreshActiveSummaryEditorView();
                setActivePopupTab("summary");
              }}
            />
          )}
          {activePopupTab === "settings" && <ExtensionSettingsView />}
        </div>
      </main>

      <nav className={styles.tabBar} aria-label="Main navigation">
        {POPUP_NAVIGATION_TABS.map((navigationTab) => (
          <button
            key={navigationTab.tabName}
            type="button"
            className={`${styles.tab} ${
              activePopupTab === navigationTab.tabName ? styles.tabActive : ""
            }`}
            onClick={() => setActivePopupTab(navigationTab.tabName)}
            aria-current={
              activePopupTab === navigationTab.tabName ? "page" : undefined
            }
          >
            <span className={styles.tabIcon} aria-hidden>
              {navigationTab.icon}
            </span>
            {navigationTab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
