import {
  ConversationSession,
  ConversationSessionsById,
  CONVERSATION_SESSION_STORAGE_KEYS,
  LOCAL_STORAGE_QUOTA_BYTES,
  LOCAL_STORAGE_WARNING_THRESHOLD_BYTES,
} from "./conversationSessionTypes";

type LegacyStoredConversationSession = ConversationSession & {
  compressedContext?: string;
};

function migrateLegacyConversationSession(
  sessionId: string,
  storedSession: LegacyStoredConversationSession
): ConversationSession {
  return {
    ...storedSession,
    id: sessionId,
    summary:
      storedSession.summary ?? storedSession.compressedContext ?? "",
  };
}

function isConversationSessionsRecord(
  value: unknown
): value is Record<string, LegacyStoredConversationSession> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

async function readRawConversationSessionsFromStorage(): Promise<
  Record<string, LegacyStoredConversationSession>
> {
  const storageResult = await chrome.storage.local.get(
    CONVERSATION_SESSION_STORAGE_KEYS.sessions
  );
  const storedSessions = storageResult[CONVERSATION_SESSION_STORAGE_KEYS.sessions];
  return isConversationSessionsRecord(storedSessions) ? storedSessions : {};
}

async function loadConversationSessionsById(): Promise<ConversationSessionsById> {
  try {
    const storedSessions = await readRawConversationSessionsFromStorage();
    const migratedSessions: ConversationSessionsById = {};
    for (const [sessionId, storedSession] of Object.entries(storedSessions)) {
      migratedSessions[sessionId] = migrateLegacyConversationSession(
        sessionId,
        storedSession
      );
    }
    return migratedSessions;
  } catch (error) {
    console.error("[ContextBridge] loadConversationSessionsById failed:", error);
    throw error;
  }
}

async function writeConversationSessionsById(
  sessionsById: ConversationSessionsById
): Promise<void> {
  await chrome.storage.local.set({
    [CONVERSATION_SESSION_STORAGE_KEYS.sessions]: sessionsById,
  });
}

function logLocalStorageUsageWarning(usedBytes: number): void {
  const usedMegabytes = (usedBytes / (1024 * 1024)).toFixed(2);
  const quotaMegabytes = (LOCAL_STORAGE_QUOTA_BYTES / (1024 * 1024)).toFixed(0);
  console.warn(
    `[ContextBridge] Storage usage is ${usedMegabytes}MB (warn threshold: ${LOCAL_STORAGE_WARNING_THRESHOLD_BYTES / (1024 * 1024)}MB, quota: ${quotaMegabytes}MB)`
  );
}

function logLocalStorageQuotaExceeded(): void {
  console.error(
    `[ContextBridge] Storage at or above ${LOCAL_STORAGE_QUOTA_BYTES / (1024 * 1024)}MB quota — writes may fail`
  );
}

async function warnIfLocalStorageIsNearlyFull(): Promise<void> {
  try {
    const usedBytes = await chrome.storage.local.getBytesInUse(null);
    if (usedBytes >= LOCAL_STORAGE_WARNING_THRESHOLD_BYTES) {
      logLocalStorageUsageWarning(usedBytes);
    }
    if (usedBytes >= LOCAL_STORAGE_QUOTA_BYTES) {
      logLocalStorageQuotaExceeded();
    }
  } catch (error) {
    console.error("[ContextBridge] warnIfLocalStorageIsNearlyFull failed:", error);
  }
}

async function persistConversationSessionsById(
  sessionsById: ConversationSessionsById
): Promise<void> {
  try {
    await writeConversationSessionsById(sessionsById);
    await warnIfLocalStorageIsNearlyFull();
  } catch (error) {
    console.error("[ContextBridge] persistConversationSessionsById failed:", error);
    throw error;
  }
}

export async function saveConversationSession(
  sessionId: string,
  conversationSession: ConversationSession
): Promise<void> {
  try {
    const sessionsById = await loadConversationSessionsById();
    sessionsById[sessionId] = { ...conversationSession, id: sessionId };
    await persistConversationSessionsById(sessionsById);
  } catch (error) {
    console.error("[ContextBridge] saveConversationSession failed:", error);
    throw error;
  }
}

async function readConversationSessionById(
  sessionId: string
): Promise<ConversationSession | null> {
  try {
    const sessionsById = await loadConversationSessionsById();
    return sessionsById[sessionId] ?? null;
  } catch (error) {
    console.error("[ContextBridge] readConversationSessionById failed:", error);
    throw error;
  }
}

export async function listAllConversationSessions(): Promise<ConversationSession[]> {
  try {
    const sessionsById = await loadConversationSessionsById();
    return Object.values(sessionsById).sort(
      (leftSession, rightSession) =>
        rightSession.updatedAt - leftSession.updatedAt
    );
  } catch (error) {
    console.error("[ContextBridge] listAllConversationSessions failed:", error);
    throw error;
  }
}

async function clearActiveConversationSessionIfMatches(
  sessionId: string
): Promise<void> {
  const activeSessionStorage = await chrome.storage.local.get(
    CONVERSATION_SESSION_STORAGE_KEYS.active
  );
  if (activeSessionStorage[CONVERSATION_SESSION_STORAGE_KEYS.active] === sessionId) {
    await chrome.storage.local.remove(CONVERSATION_SESSION_STORAGE_KEYS.active);
  }
}

export async function deleteConversationSession(
  sessionId: string
): Promise<void> {
  try {
    const sessionsById = await loadConversationSessionsById();
    delete sessionsById[sessionId];
    await persistConversationSessionsById(sessionsById);
    await clearActiveConversationSessionIfMatches(sessionId);
  } catch (error) {
    console.error("[ContextBridge] deleteConversationSession failed:", error);
    throw error;
  }
}

async function readActiveConversationSessionId(): Promise<string | null> {
  const activeSessionStorage = await chrome.storage.local.get(
    CONVERSATION_SESSION_STORAGE_KEYS.active
  );
  const activeSessionId = activeSessionStorage[CONVERSATION_SESSION_STORAGE_KEYS.active];
  if (typeof activeSessionId !== "string" || !activeSessionId) {
    return null;
  }
  return activeSessionId;
}

export async function readActiveConversationSession(): Promise<ConversationSession | null> {
  try {
    const activeSessionId = await readActiveConversationSessionId();
    if (!activeSessionId) return null;
    return readConversationSessionById(activeSessionId);
  } catch (error) {
    console.error("[ContextBridge] readActiveConversationSession failed:", error);
    throw error;
  }
}

export async function setActiveConversationSession(
  sessionId: string
): Promise<void> {
  try {
    const conversationSession = await readConversationSessionById(sessionId);
    if (!conversationSession) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    await chrome.storage.local.set({
      [CONVERSATION_SESSION_STORAGE_KEYS.active]: sessionId,
    });
  } catch (error) {
    console.error("[ContextBridge] setActiveConversationSession failed:", error);
    throw error;
  }
}
