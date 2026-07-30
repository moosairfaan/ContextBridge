import { summarizeConversationWithChatApi } from "../summarize/summarizeConversationWithChatApi";
import { isSupportedAiChatWebsiteUrl } from "../shared/supportedAiChatWebsiteHosts";
import {
  readActiveConversationSession,
  saveConversationSession,
} from "../storage/conversationSessionStore";
import { readExtensionSettings } from "../storage/extensionSettings";
import { conversationSessionWithUpdatedSummary } from "./createConversationSession";
import { requestFullConversationTextFromTab } from "./sendMessageToTabContentScript";
import { readBrowserTabById } from "./safeChromeTabAccess";

function isChatCompletionsApiKeyConfigured(
  extensionSettings: Awaited<ReturnType<typeof readExtensionSettings>>
): boolean {
  return extensionSettings.apiKey.trim().length > 0;
}

async function readBrowserTabIfSupportedAiChatWebsite(
  tabId: number
): Promise<chrome.tabs.Tab | null> {
  const browserTab = await readBrowserTabById(tabId);
  if (!browserTab || !isSupportedAiChatWebsiteUrl(browserTab.url)) return null;
  return browserTab;
}

async function saveSummaryToActiveConversationSession(
  summaryText: string
): Promise<void> {
  const activeConversationSession = await readActiveConversationSession();
  if (!activeConversationSession) return;

  await saveConversationSession(
    activeConversationSession.id,
    conversationSessionWithUpdatedSummary(
      activeConversationSession,
      summaryText
    )
  );
}

export async function captureTabConversationAndSummarize(
  tabId: number
): Promise<void> {
  try {
    const browserTab = await readBrowserTabIfSupportedAiChatWebsite(tabId);
    if (!browserTab) return;

    const conversationText = await requestFullConversationTextFromTab(tabId);
    if (!conversationText) return;

    const extensionSettings = await readExtensionSettings();
    if (!isChatCompletionsApiKeyConfigured(extensionSettings)) {
      console.warn("[ContextBridge] No API key configured — skipping summary");
      return;
    }

    const summaryText = await summarizeConversationWithChatApi(
      conversationText,
      extensionSettings
    );
    await saveSummaryToActiveConversationSession(summaryText);
  } catch (error) {
    console.error("[ContextBridge] captureTabConversationAndSummarize failed:", error);
  }
}
