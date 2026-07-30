import type {
  TabContentScriptRequestMessage,
  TabContentScriptResponseMessage,
} from "../messaging/extensionMessageTypes";
import { sendMessageToBrowserTab } from "./safeChromeTabAccess";

function extractConversationTextFromTabResponse(
  responseMessage: TabContentScriptResponseMessage | undefined
): string | null {
  if (responseMessage && "text" in responseMessage && responseMessage.text.trim()) {
    return responseMessage.text.trim();
  }
  return null;
}

export async function sendMessageToTabContentScript(
  tabId: number,
  requestMessage: TabContentScriptRequestMessage
): Promise<void> {
  try {
    await sendMessageToBrowserTab(tabId, requestMessage);
  } catch (error) {
    console.error("[ContextBridge] tabs.sendMessage failed:", error);
  }
}

export async function requestFullConversationTextFromTab(
  tabId: number
): Promise<string | null> {
  try {
    const responseMessage = (await sendMessageToBrowserTab(tabId, {
      type: "GET_CONVERSATION_TEXT",
    } satisfies TabContentScriptRequestMessage)) as
      | TabContentScriptResponseMessage
      | undefined;
    return extractConversationTextFromTabResponse(responseMessage);
  } catch (error) {
    console.error("[ContextBridge] GET_CONVERSATION_TEXT failed:", error);
    return null;
  }
}
