import type { AiChatPlatformAdapter } from "./aiChatPlatformAdapter";
import {
  buildConversationTextFromMessageElements,
  findAllMatchingElements,
  findFirstMatchingElement,
  pasteTextIntoChatInputElement,
} from "./chatPageDomHelpers";

const CHAT_INPUT_CSS_SELECTORS = [
  'textarea[placeholder*="Ask" i]',
  'textarea[placeholder*="follow" i]',
  "textarea",
  'div[contenteditable="true"]',
  '[role="textbox"]',
];

const CHAT_MESSAGE_CSS_SELECTORS = [
  '[data-testid="user-message"]',
  ".user-message",
  '[class*="UserMessage"]',
  '[class*="query-bar"]',
  '[data-testid="assistant-message"]',
  ".prose",
  '[class*="Answer"]',
  '[class*="markdown"]',
];

const FALLBACK_CHAT_MESSAGE_CSS_SELECTORS = ["[class*='Message']", "article"];

let storedSummaryText = "";

function readSpeakerRoleFromMessageElement(
  messageElement: Element
): "user" | "assistant" | null {
  const testIdAttribute = messageElement.getAttribute("data-testid") ?? "";
  if (
    testIdAttribute.includes("user") ||
    messageElement.className.toLowerCase().includes("user")
  ) {
    return "user";
  }
  if (
    testIdAttribute.includes("assistant") ||
    messageElement.classList.contains("prose") ||
    messageElement.className.toLowerCase().includes("answer")
  ) {
    return "assistant";
  }
  return null;
}

function findPerplexityMessageElements(): Element[] {
  const primaryMessageElements = findAllMatchingElements(
    CHAT_MESSAGE_CSS_SELECTORS
  );
  if (primaryMessageElements.length > 0) return primaryMessageElements;
  return findAllMatchingElements(FALLBACK_CHAT_MESSAGE_CSS_SELECTORS);
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
  pasteTextIntoChatInputElement(chatInputElement, storedSummaryText, "start");
  clearStoredSummaryText();
}

export const perplexityPlatformAdapter: AiChatPlatformAdapter = {
  platformName: "perplexity",

  readAllConversationTextFromPage() {
    return buildConversationTextFromMessageElements(
      findPerplexityMessageElements(),
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
