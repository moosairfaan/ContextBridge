import { sendMessageToServiceWorker } from "../messaging/sendMessageToServiceWorker";
import type { AiChatPlatformAdapter } from "../platforms/aiChatPlatformAdapter";
import { isContextInjectionEnabledOnPage } from "./contextInjectionEnabledPreference";
import { pasteSummaryIntoComposerOnce } from "./pasteSummaryIntoComposer";

export async function pasteActiveSessionSummaryIntoComposer(
  platformAdapter: AiChatPlatformAdapter
): Promise<void> {
  if (!isContextInjectionEnabledOnPage) return;

  try {
    const responseMessage = await sendMessageToServiceWorker({
      type: "GET_ACTIVE_CONTEXT",
    });
    if (
      responseMessage.ok &&
      "context" in responseMessage &&
      responseMessage.context?.trim()
    ) {
      pasteSummaryIntoComposerOnce(platformAdapter, responseMessage.context);
      console.debug("[ContextBridge] Applied active context on page load");
    }
  } catch (error) {
    console.error("[ContextBridge] Failed to pull active context:", error);
  }
}

export async function ensureActiveConversationSessionExistsOnPage(
  platformName: string
): Promise<void> {
  try {
    const responseMessage = await sendMessageToServiceWorker({
      type: "ENSURE_SESSION",
      platform: platformName,
    });
    if (responseMessage.ok && "sessionId" in responseMessage) {
      console.debug(
        "[ContextBridge] Session ready:",
        responseMessage.sessionId
      );
    } else if (!responseMessage.ok) {
      console.error(
        "[ContextBridge] ENSURE_SESSION failed:",
        responseMessage.error
      );
    }
  } catch (error) {
    console.error("[ContextBridge] Could not ensure session:", error);
  }
}
