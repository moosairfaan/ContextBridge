import {
  ContextSession,
  SessionsMap,
  STORAGE_KEYS,
  STORAGE_QUOTA_BYTES,
  STORAGE_WARN_BYTES,
} from "./types";

async function loadSessionsMap(): Promise<SessionsMap> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.sessions);
    const map = result[STORAGE_KEYS.sessions];
    if (map && typeof map === "object" && !Array.isArray(map)) {
      return map as SessionsMap;
    }
    return {};
  } catch (err) {
    console.error("[ContextBridge] loadSessionsMap failed:", err);
    throw err;
  }
}

async function persistSessionsMap(sessions: SessionsMap): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.sessions]: sessions });
    await guardStorageSize();
  } catch (err) {
    console.error("[ContextBridge] persistSessionsMap failed:", err);
    throw err;
  }
}

async function guardStorageSize(): Promise<void> {
  try {
    const bytes = await chrome.storage.local.getBytesInUse(null);
    if (bytes >= STORAGE_WARN_BYTES) {
      const mb = (bytes / (1024 * 1024)).toFixed(2);
      const quotaMb = (STORAGE_QUOTA_BYTES / (1024 * 1024)).toFixed(0);
      console.warn(
        `[ContextBridge] Storage usage is ${mb}MB (warn threshold: ${STORAGE_WARN_BYTES / (1024 * 1024)}MB, quota: ${quotaMb}MB)`
      );
    }
    if (bytes >= STORAGE_QUOTA_BYTES) {
      console.error(
        `[ContextBridge] Storage at or above ${STORAGE_QUOTA_BYTES / (1024 * 1024)}MB quota — writes may fail`
      );
    }
  } catch (err) {
    console.error("[ContextBridge] guardStorageSize failed:", err);
  }
}

export async function saveContext(
  sessionId: string,
  context: ContextSession
): Promise<void> {
  try {
    const sessions = await loadSessionsMap();
    sessions[sessionId] = { ...context, id: sessionId };
    await persistSessionsMap(sessions);
  } catch (err) {
    console.error("[ContextBridge] saveContext failed:", err);
    throw err;
  }
}

export async function getContext(
  sessionId: string
): Promise<ContextSession | null> {
  try {
    const sessions = await loadSessionsMap();
    return sessions[sessionId] ?? null;
  } catch (err) {
    console.error("[ContextBridge] getContext failed:", err);
    throw err;
  }
}

export async function getAllSessions(): Promise<ContextSession[]> {
  try {
    const sessions = await loadSessionsMap();
    return Object.values(sessions).sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (err) {
    console.error("[ContextBridge] getAllSessions failed:", err);
    throw err;
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  try {
    const sessions = await loadSessionsMap();
    delete sessions[sessionId];
    await persistSessionsMap(sessions);

    const activeResult = await chrome.storage.local.get(STORAGE_KEYS.active);
    if (activeResult[STORAGE_KEYS.active] === sessionId) {
      await chrome.storage.local.remove(STORAGE_KEYS.active);
    }
  } catch (err) {
    console.error("[ContextBridge] deleteSession failed:", err);
    throw err;
  }
}

export async function getActiveSession(): Promise<ContextSession | null> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.active);
    const activeId = result[STORAGE_KEYS.active];
    if (typeof activeId !== "string" || !activeId) {
      return null;
    }
    return getContext(activeId);
  } catch (err) {
    console.error("[ContextBridge] getActiveSession failed:", err);
    throw err;
  }
}

export async function setActiveSession(sessionId: string): Promise<void> {
  try {
    const session = await getContext(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    await chrome.storage.local.set({ [STORAGE_KEYS.active]: sessionId });
  } catch (err) {
    console.error("[ContextBridge] setActiveSession failed:", err);
    throw err;
  }
}
