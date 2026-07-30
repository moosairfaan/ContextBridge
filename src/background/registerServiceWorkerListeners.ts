import { isServiceWorkerRequestMessage } from "../messaging/extensionMessageTypes";
import { failedServiceWorkerResponse } from "../shared/unknownErrorMessage";
import { isSupportedAiChatWebsiteUrl } from "../shared/supportedAiChatWebsiteHosts";
import { captureTabConversationAndSummarize } from "./captureTabConversationAndSummarize";
import {
  injectSummaryIntoSupportedAiChatTab,
  respondToServiceWorkerRequest,
} from "./respondToServiceWorkerMessages";
import { injectSummaryIntoAiChatTab } from "./injectSummaryIntoAiChatTab";

export function registerServiceWorkerListeners(): void {
  let previousActiveTabId: number | null = null;

  chrome.runtime.onInstalled.addListener(() => {
    console.log("[ContextBridge] Service worker installed");
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!isServiceWorkerRequestMessage(message)) {
      sendResponse({ ok: false, error: "Unknown message type" });
      return false;
    }

    respondToServiceWorkerRequest(message)
      .then((responseMessage) => {
        sendResponse(responseMessage);
      })
      .catch((error: unknown) => {
        console.error("[ContextBridge] onMessage listener error:", error);
        sendResponse(failedServiceWorkerResponse(error));
      });

    return true;
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    if (previousActiveTabId === tabId) {
      previousActiveTabId = null;
    }
  });

  chrome.tabs.onActivated.addListener(({ tabId }) => {
    if (previousActiveTabId !== null && previousActiveTabId !== tabId) {
      void captureTabConversationAndSummarize(previousActiveTabId).then(() => {
        void injectSummaryIntoSupportedAiChatTab(tabId);
      });
    } else {
      void injectSummaryIntoSupportedAiChatTab(tabId);
    }
    previousActiveTabId = tabId;
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, browserTab) => {
    if (changeInfo.status !== "complete") return;
    if (!isSupportedAiChatWebsiteUrl(browserTab.url)) return;
    void injectSummaryIntoAiChatTab(tabId);
  });
}
