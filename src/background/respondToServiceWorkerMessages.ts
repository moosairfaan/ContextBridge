import type {
  ServiceWorkerRequestMessage,
  ServiceWorkerResponseMessage,
} from "../messaging/extensionMessageTypes";
import { failedServiceWorkerResponse } from "../shared/unknownErrorMessage";
import { isSupportedAiChatWebsiteUrl } from "../shared/supportedAiChatWebsiteHosts";
import {
  readActiveConversationSession,
  saveConversationSession,
  setActiveConversationSession,
} from "../storage/conversationSessionStore";
import {
  createEmptyConversationSession,
} from "./createConversationSession";
import { injectSummaryIntoAiChatTab } from "./injectSummaryIntoAiChatTab";
import { readBrowserTabById } from "./safeChromeTabAccess";

export async function switchActiveConversationSession(
  sessionId: string
): Promise<ServiceWorkerResponseMessage> {
  try {
    await setActiveConversationSession(sessionId);
    return { ok: true };
  } catch (error) {
    console.error("[ContextBridge] switchActiveConversationSession failed:", error);
    return failedServiceWorkerResponse(error);
  }
}

export async function readActiveSessionSummaryText(): Promise<ServiceWorkerResponseMessage> {
  try {
    const activeConversationSession = await readActiveConversationSession();
    return {
      ok: true,
      context: activeConversationSession?.summary ?? null,
    };
  } catch (error) {
    console.error("[ContextBridge] readActiveSessionSummaryText failed:", error);
    return failedServiceWorkerResponse(error);
  }
}

export async function createNewConversationSession(
  platformName: string
): Promise<ServiceWorkerResponseMessage> {
  try {
    const conversationSession = createEmptyConversationSession(platformName);
    await saveConversationSession(conversationSession.id, conversationSession);
    await setActiveConversationSession(conversationSession.id);
    return { ok: true, sessionId: conversationSession.id };
  } catch (error) {
    console.error("[ContextBridge] createNewConversationSession failed:", error);
    return failedServiceWorkerResponse(error);
  }
}

export async function ensureActiveConversationSessionExists(
  platformName: string
): Promise<ServiceWorkerResponseMessage> {
  try {
    const activeConversationSession = await readActiveConversationSession();
    if (activeConversationSession) {
      return { ok: true, sessionId: activeConversationSession.id };
    }
    return createNewConversationSession(platformName);
  } catch (error) {
    console.error(
      "[ContextBridge] ensureActiveConversationSessionExists failed:",
      error
    );
    return failedServiceWorkerResponse(error);
  }
}

export async function respondToServiceWorkerRequest(
  requestMessage: ServiceWorkerRequestMessage
): Promise<ServiceWorkerResponseMessage> {
  switch (requestMessage.type) {
    case "SWITCH_SESSION":
      return switchActiveConversationSession(requestMessage.sessionId);
    case "GET_ACTIVE_CONTEXT":
      return readActiveSessionSummaryText();
    case "CREATE_SESSION":
      return createNewConversationSession(requestMessage.platform);
    case "ENSURE_SESSION":
      return ensureActiveConversationSessionExists(requestMessage.platform);
    default: {
      const unexpectedRequestMessage: never = requestMessage;
      return unexpectedRequestMessage;
    }
  }
}

export async function injectSummaryIntoSupportedAiChatTab(
  tabId: number
): Promise<void> {
  try {
    const browserTab = await readBrowserTabById(tabId);
    if (!browserTab || !isSupportedAiChatWebsiteUrl(browserTab.url)) return;
    await injectSummaryIntoAiChatTab(tabId);
  } catch (error) {
    console.error("[ContextBridge] Failed to inject on tab:", error);
  }
}
