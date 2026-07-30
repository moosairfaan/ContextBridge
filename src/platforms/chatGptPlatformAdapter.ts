import type { AiChatPlatformAdapter } from "./aiChatPlatformAdapter";
import {
  buildConversationTextFromMessageElements,
  findAllMatchingElements,
  findFirstMatchingElement,
  pasteTextIntoContentEditableInput,
} from "./chatPageDomHelpers";

const CHAT_INPUT_CSS_SELECTORS = [
  'div#prompt-textarea[contenteditable="true"]',
  'div#prompt-textarea.ProseMirror[contenteditable="true"]',
  '[contenteditable="true"][data-testid="prompt-textarea"]',
  'div.ProseMirror[contenteditable="true"]',
  'div[contenteditable="true"][role="textbox"]',
];

const CHAT_MESSAGE_CSS_SELECTORS = [
  '[data-message-author-role="user"]',
  '[data-role="user"]',
  '[data-message-author="user"]',
  ".user-turn",
  '[data-message-author-role="assistant"]',
  '[data-role="assistant"]',
  '[data-message-author="assistant"]',
  ".agent-turn",
];

let storedSummaryText = "";

function readSpeakerRoleFromMessageElement(
  messageElement: Element
): "user" | "assistant" | null {
  const authorAttribute =
    messageElement.getAttribute("data-message-author-role") ??
    messageElement.getAttribute("data-role") ??
    messageElement.getAttribute("data-message-author");
  if (authorAttribute === "user" || authorAttribute === "assistant") {
    return authorAttribute;
  }
  if (messageElement.classList.contains("user-turn")) return "user";
  if (messageElement.classList.contains("agent-turn")) return "assistant";
  return null;
}

function clearStoredSummaryText(): void {
  storedSummaryText = "";
}

function rememberSummaryTextForInjection(summaryText: string): void {
  storedSummaryText = summaryText.trim();
}

function pasteStoredSummaryIntoInputElement(
  chatInputElement: HTMLElement
): void {
  pasteTextIntoContentEditableInput(
    chatInputElement,
    storedSummaryText,
    "start"
  );
  clearStoredSummaryText();
}

export const chatGptPlatformAdapter: AiChatPlatformAdapter = {
  platformName: "chatgpt",

  readAllConversationTextFromPage() {
    return buildConversationTextFromMessageElements(
      findAllMatchingElements(CHAT_MESSAGE_CSS_SELECTORS),
      readSpeakerRoleFromMessageElement
    );
  },

  findChatInputElement() {
    return findFirstMatchingElement(CHAT_INPUT_CSS_SELECTORS);
  },

  storeSummaryForInjection(summaryText: string) {
    rememberSummaryTextForInjection(summaryText);
  },

  pasteStoredSummaryIntoChatInput() {
    if (!storedSummaryText) return false;
    const chatInputElement = this.findChatInputElement();
    if (!chatInputElement) return false;
    pasteStoredSummaryIntoInputElement(chatInputElement);
    return true;
  },
};
