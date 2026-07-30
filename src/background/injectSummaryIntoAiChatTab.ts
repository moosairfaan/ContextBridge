import { readActiveConversationSession } from "../storage/conversationSessionStore";
import { readExtensionSettings } from "../storage/extensionSettings";
import type { TabContentScriptRequestMessage } from "../messaging/extensionMessageTypes";
import { sendMessageToTabContentScript } from "./sendMessageToTabContentScript";

const SUMMARY_INJECTION_RETRY_DELAYS_MILLISECONDS = [0, 2000];

function isAutomaticSummaryInjectionEnabled(
  extensionSettings: Awaited<ReturnType<typeof readExtensionSettings>>
): boolean {
  return extensionSettings.autoInject && extensionSettings.injectEnabled;
}

function buildInjectSummaryRequestMessage(
  summaryText: string
): TabContentScriptRequestMessage {
  return {
    type: "INJECT_CONTEXT",
    context: summaryText,
  };
}

function scheduleSummaryInjectionMessages(
  tabId: number,
  requestMessage: TabContentScriptRequestMessage
): void {
  for (const delayMilliseconds of SUMMARY_INJECTION_RETRY_DELAYS_MILLISECONDS) {
    setTimeout(() => {
      void sendMessageToTabContentScript(tabId, requestMessage);
    }, delayMilliseconds);
  }
}

export async function injectSummaryIntoAiChatTab(tabId: number): Promise<void> {
  try {
    const extensionSettings = await readExtensionSettings();
    if (!isAutomaticSummaryInjectionEnabled(extensionSettings)) return;

    const activeConversationSession = await readActiveConversationSession();
    if (!activeConversationSession?.summary) return;

    scheduleSummaryInjectionMessages(
      tabId,
      buildInjectSummaryRequestMessage(activeConversationSession.summary)
    );
  } catch (error) {
    console.error("[ContextBridge] injectSummaryIntoAiChatTab failed:", error);
  }
}
