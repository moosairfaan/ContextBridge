import { extractiveCompress, getTokenEstimate } from "../compression/extractive";
import type { Message } from "../platforms/types";
import { isSupportedHost, normalizeHostname } from "../shared/hosts";
import {
  getActiveSession,
  saveContext,
  setActiveSession,
} from "../storage/contextStore";
import { titleFromFirstUserMessage } from "../storage/sessionUtils";
import { getSettings } from "../storage/settings";
import type { ContextSession, RawMessage } from "../storage/types";
import type {
  BackgroundRequest,
  BackgroundResponse,
  ContentScriptMessage,
} from "./messages";
import { isBackgroundRequest } from "./messages";

function isSupportedUrl(url?: string): boolean {
  if (!url) return false;
  try {
    const host = normalizeHostname(new URL(url).hostname);
    return isSupportedHost(host);
  } catch {
    return false;
  }
}

function isNoReceiverError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return (
    message.includes("Could not establish connection") ||
    message.includes("Receiving end does not exist")
  );
}

function toPlatformMessages(raw: RawMessage[]): Message[] {
  return raw.map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
    timestamp: m.timestamp,
  }));
}

function toRawMessages(messages: Message[]): RawMessage[] {
  return messages.map((m) => ({
    role: m.role,
    content: m.content,
    timestamp: m.timestamp,
  }));
}

async function sendTabMessage(
  tabId: number,
  message: ContentScriptMessage
): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch (err) {
    if (isNoReceiverError(err)) {
      console.debug(
        `[ContextBridge] Content script not ready on tab ${tabId}`
      );
      return;
    }
    console.error("[ContextBridge] tabs.sendMessage failed:", err);
  }
}

/** One immediate inject; one retry if the content script was not ready yet. */
const INJECT_RETRY_DELAYS_MS = [0, 2000];

async function injectContextToTab(tabId: number): Promise<void> {
  try {
    const settings = await getSettings();
    if (!settings.autoInject || !settings.injectEnabled) return;

    const session = await getActiveSession();
    if (!session?.compressedContext) return;

    const message: ContentScriptMessage = {
      type: "INJECT_CONTEXT",
      context: session.compressedContext,
    };

    for (const delayMs of INJECT_RETRY_DELAYS_MS) {
      setTimeout(() => {
        void sendTabMessage(tabId, message);
      }, delayMs);
    }
  } catch (err) {
    console.error("[ContextBridge] injectContextToTab failed:", err);
  }
}

async function handleInjectOnTab(tabId: number): Promise<void> {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!isSupportedUrl(tab.url)) return;
    await injectContextToTab(tabId);
  } catch (err) {
    console.error("[ContextBridge] Failed to inject on tab:", err);
  }
}

function createSession(platform: string): ContextSession {
  const now = Date.now();
  const id = crypto.randomUUID();
  return {
    id,
    title: `${platform} · ${new Date(now).toLocaleString()}`,
    platform,
    createdAt: now,
    updatedAt: now,
    rawMessages: [],
    compressedContext: "",
    tokenEstimate: 0,
  };
}

async function handleNewMessages(messages: Message[]): Promise<BackgroundResponse> {
  try {
    const session = await getActiveSession();
    if (!session) {
      return { ok: false, error: "No active session" };
    }

    const rawMessages = [...session.rawMessages, ...toRawMessages(messages)];
    const hadUserMessage = session.rawMessages.some((m) => m.role === "user");
    let title = session.title;
    if (!hadUserMessage) {
      const autoTitle = titleFromFirstUserMessage(rawMessages);
      if (autoTitle) title = autoTitle;
    }

    const settings = await getSettings();
    const compressed = extractiveCompress(
      toPlatformMessages(rawMessages),
      settings.maxContextChars
    );

    const updated: ContextSession = {
      ...session,
      title,
      rawMessages,
      compressedContext: compressed,
      tokenEstimate: getTokenEstimate(compressed),
      updatedAt: Date.now(),
    };

    await saveContext(session.id, updated);
    return { ok: true };
  } catch (err) {
    console.error("[ContextBridge] handleNewMessages failed:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function handleSwitchSession(sessionId: string): Promise<BackgroundResponse> {
  try {
    await setActiveSession(sessionId);
    return { ok: true };
  } catch (err) {
    console.error("[ContextBridge] handleSwitchSession failed:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function handleGetActiveContext(): Promise<BackgroundResponse> {
  try {
    const session = await getActiveSession();
    return { ok: true, context: session?.compressedContext ?? null };
  } catch (err) {
    console.error("[ContextBridge] handleGetActiveContext failed:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function handleCreateSession(platform: string): Promise<BackgroundResponse> {
  try {
    const session = createSession(platform);
    await saveContext(session.id, session);
    await setActiveSession(session.id);
    return { ok: true, sessionId: session.id };
  } catch (err) {
    console.error("[ContextBridge] handleCreateSession failed:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function handleEnsureSession(platform: string): Promise<BackgroundResponse> {
  try {
    const active = await getActiveSession();
    // Keep the same session across platforms so context captured on one site
    // can be injected on another (e.g. ChatGPT → Claude).
    if (active) {
      return { ok: true, sessionId: active.id };
    }
    return handleCreateSession(platform);
  } catch (err) {
    console.error("[ContextBridge] handleEnsureSession failed:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function handleBackgroundMessage(
  request: BackgroundRequest
): Promise<BackgroundResponse> {
  switch (request.type) {
    case "NEW_MESSAGES":
      return handleNewMessages(request.messages);
    case "SWITCH_SESSION":
      return handleSwitchSession(request.sessionId);
    case "GET_ACTIVE_CONTEXT":
      return handleGetActiveContext();
    case "CREATE_SESSION":
      return handleCreateSession(request.platform);
    case "ENSURE_SESSION":
      return handleEnsureSession(request.platform);
    default: {
      const _exhaustive: never = request;
      return _exhaustive;
    }
  }
}

export function registerServiceWorker(): void {
  chrome.runtime.onInstalled.addListener(() => {
    console.log("[ContextBridge] Service worker installed");
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!isBackgroundRequest(message)) {
      sendResponse({ ok: false, error: "Unknown message type" });
      return false;
    }

    handleBackgroundMessage(message)
      .then((response) => {
        sendResponse(response);
      })
      .catch((err: unknown) => {
        console.error("[ContextBridge] onMessage handler error:", err);
        sendResponse({
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      });

    return true;
  });

  chrome.tabs.onActivated.addListener(({ tabId }) => {
    void handleInjectOnTab(tabId);
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status !== "complete") return;
    if (!isSupportedUrl(tab.url)) return;
    void injectContextToTab(tabId);
  });
}
