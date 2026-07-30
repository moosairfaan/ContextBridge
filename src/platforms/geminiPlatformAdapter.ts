import type { AiChatPlatformAdapter } from "./aiChatPlatformAdapter";
import {
  buildConversationTextFromMessageElements,
  findAllMatchingElements,
  pasteTextIntoContentEditableInput,
} from "./chatPageDomHelpers";

const CHAT_INPUT_CSS_SELECTORS = [
  ".ql-editor[contenteditable='true']",
  "rich-textarea .ql-editor",
  'rich-textarea [contenteditable="true"]',
  'div[contenteditable="true"][aria-label*="prompt" i]',
  'div[contenteditable="true"][aria-label*="Enter" i]',
  ".text-input-field [contenteditable='true']",
  'div[contenteditable="true"]',
];

const CHAT_MESSAGE_CSS_SELECTORS = [
  ".user-query",
  '[data-test-id="user-query"]',
  ".gemini-user-message",
  "ms-chat-turn .user-query",
  'message-content[data-turn-role="user"]',
  ".model-response",
  '[data-test-id="model-response"]',
  ".gemini-response",
  "ms-chat-turn .model-response",
  'message-content[data-turn-role="model"]',
  "ms-chat-turn .response-container",
];

let storedSummaryText = "";

function readSpeakerRoleFromMessageElement(
  messageElement: Element
): "user" | "assistant" | null {
  const testIdAttribute = messageElement.getAttribute("data-test-id") ?? "";
  const turnRoleAttribute = messageElement.getAttribute("data-turn-role");
  if (
    messageElement.classList.contains("user-query") ||
    messageElement.classList.contains("gemini-user-message") ||
    testIdAttribute === "user-query" ||
    turnRoleAttribute === "user"
  ) {
    return "user";
  }
  if (
    messageElement.classList.contains("model-response") ||
    messageElement.classList.contains("gemini-response") ||
    testIdAttribute === "model-response" ||
    turnRoleAttribute === "model" ||
    messageElement.classList.contains("response-container")
  ) {
    return "assistant";
  }
  const chatTurnElement = messageElement.closest("ms-chat-turn");
  if (
    chatTurnElement?.querySelector(".user-query, [data-test-id='user-query']") ===
    messageElement
  ) {
    return "user";
  }
  if (
    chatTurnElement?.querySelector(
      ".model-response, [data-test-id='model-response'], .response-container"
    ) === messageElement
  ) {
    return "assistant";
  }
  return null;
}

function readMessagesFromChatTurnElement(chatTurnElement: Element): Element[] {
  const messageElements: Element[] = [];
  const userMessageElement = chatTurnElement.querySelector(
    ".user-query, [data-test-id='user-query'], .query-text"
  );
  const assistantMessageElement = chatTurnElement.querySelector(
    ".model-response, [data-test-id='model-response'], .response-container, .markdown"
  );
  if (userMessageElement) messageElements.push(userMessageElement);
  if (assistantMessageElement) messageElements.push(assistantMessageElement);
  return messageElements;
}

function findGeminiMessageElements(): Element[] {
  const directMessageElements = findAllMatchingElements(CHAT_MESSAGE_CSS_SELECTORS);
  if (directMessageElements.length > 0) return directMessageElements;

  const messageElementsFromTurns: Element[] = [];
  for (const chatTurnElement of findAllMatchingElements([
    "ms-chat-turn",
    ".chat-turn-container",
  ])) {
    messageElementsFromTurns.push(...readMessagesFromChatTurnElement(chatTurnElement));
  }
  return messageElementsFromTurns;
}

function findCandidateChatInputElements(): HTMLElement[] {
  return CHAT_INPUT_CSS_SELECTORS.flatMap((cssSelector) =>
    Array.from(document.querySelectorAll(cssSelector))
  ).filter((element): element is HTMLElement => element instanceof HTMLElement);
}

function isLikelyComposerInputElement(inputElement: HTMLElement): boolean {
  const footerContainer = inputElement.closest(
    "input-area, .input-area, footer, .bottom-container"
  );
  return !!(footerContainer || inputElement.closest("form"));
}

function chooseBestComposerInputElement(
  candidateInputElements: HTMLElement[]
): HTMLElement | null {
  for (const inputElement of candidateInputElements) {
    if (isLikelyComposerInputElement(inputElement)) return inputElement;
  }
  return candidateInputElements[0] ?? null;
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
  pasteTextIntoContentEditableInput(chatInputElement, storedSummaryText, "start");
  clearStoredSummaryText();
}

export const geminiPlatformAdapter: AiChatPlatformAdapter = {
  platformName: "gemini",

  readAllConversationTextFromPage() {
    return buildConversationTextFromMessageElements(
      findGeminiMessageElements(),
      readSpeakerRoleFromMessageElement
    );
  },

  findChatInputElement() {
    return chooseBestComposerInputElement(findCandidateChatInputElements());
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
