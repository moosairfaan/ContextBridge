import {
  isTabContentScriptRequestMessage,
  type TabContentScriptRequestMessage,
  type TabContentScriptResponseMessage,
} from "../messaging/extensionMessageTypes";
import { messageFromUnknownError } from "../shared/unknownErrorMessage";
import type { AiChatPlatformAdapter } from "../platforms/aiChatPlatformAdapter";
import { isContextInjectionEnabledOnPage } from "./contextInjectionEnabledPreference";
import { pasteSummaryIntoComposerOnce } from "./pasteSummaryIntoComposer";

function buildConversationTextResponseMessage(
  platformAdapter: AiChatPlatformAdapter
): TabContentScriptResponseMessage {
  return {
    ok: true,
    text: platformAdapter.readAllConversationTextFromPage(),
  };
}

function respondWithFullConversationTextFromPage(
  platformAdapter: AiChatPlatformAdapter,
  sendResponse: (responseMessage: TabContentScriptResponseMessage) => void
): void {
  try {
    sendResponse(buildConversationTextResponseMessage(platformAdapter));
  } catch (error) {
    sendResponse({ ok: false, error: messageFromUnknownError(error) });
  }
}

function respondToInjectSummaryRequest(
  platformAdapter: AiChatPlatformAdapter,
  summaryText: string,
  sendResponse: (responseMessage: TabContentScriptResponseMessage) => void
): void {
  try {
    if (isContextInjectionEnabledOnPage && summaryText) {
      pasteSummaryIntoComposerOnce(platformAdapter, summaryText);
    }
    sendResponse({ ok: true });
  } catch (error) {
    console.error("[ContextBridge] INJECT_CONTEXT listener failed:", error);
    sendResponse({ ok: false, error: messageFromUnknownError(error) });
  }
}

export function listenForServiceWorkerMessagesToTab(
  platformAdapter: AiChatPlatformAdapter
): void {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!isTabContentScriptRequestMessage(message)) {
      return false;
    }

    const requestMessage = message as TabContentScriptRequestMessage;

    if (requestMessage.type === "GET_CONVERSATION_TEXT") {
      respondWithFullConversationTextFromPage(platformAdapter, sendResponse);
      return true;
    }

    if (requestMessage.type === "INJECT_CONTEXT") {
      respondToInjectSummaryRequest(
        platformAdapter,
        requestMessage.context,
        sendResponse
      );
      return true;
    }

    return false;
  });
}
