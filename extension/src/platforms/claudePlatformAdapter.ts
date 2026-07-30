import type { AiChatPlatformAdapter } from "./aiChatPlatformAdapter";
import {
  keepOutermostElementsOnly,
  readVisibleTextFromChatMessageElement,
  sortElementsByDocumentPosition,
} from "./chatPageDomHelpers";

const USER_MESSAGE_CSS_SELECTOR = '[data-testid="user-message"]';
const ASSISTANT_MESSAGE_CSS_SELECTOR = 'div[class*="font-claude-response"]';
const CHAT_INPUT_CSS_SELECTOR = '[data-testid="chat-input"]';

const STREAMING_ASSISTANT_PLACEHOLDER_PHRASES = [
  "Pondering",
  "stand by",
  "Thinking",
  "Searching",
  "Working",
  "Loading",
] as const;

const STREAMING_PLACEHOLDER_MAX_CHARACTERS = 100;
const MINIMUM_ASSISTANT_MESSAGE_CHARACTERS = 20;
const SUMMARY_INJECTION_GUARD_MILLISECONDS = 2000;

let storedSummaryText = "";
let composerMountObserver: MutationObserver | null = null;
let isSummaryInjectionInProgress = false;
let summaryInjectionGuardTimer: ReturnType<typeof setTimeout> | null = null;

function markSummaryInjectionInProgress(): void {
  isSummaryInjectionInProgress = true;
}

function markSummaryInjectionComplete(): void {
  isSummaryInjectionInProgress = false;
}

function clearSummaryInjectionGuardTimer(): void {
  if (summaryInjectionGuardTimer) {
    clearTimeout(summaryInjectionGuardTimer);
    summaryInjectionGuardTimer = null;
  }
}

function scheduleSummaryInjectionGuardReset(): void {
  clearSummaryInjectionGuardTimer();
  summaryInjectionGuardTimer = setTimeout(() => {
    markSummaryInjectionComplete();
    summaryInjectionGuardTimer = null;
  }, SUMMARY_INJECTION_GUARD_MILLISECONDS);
}

function beginSummaryInjectionGuardPeriod(): void {
  markSummaryInjectionInProgress();
  scheduleSummaryInjectionGuardReset();
}

function stopComposerMountObserver(): void {
  composerMountObserver?.disconnect();
  composerMountObserver = null;
}

function isClaudeGreetingMessageElement(messageElement: Element): boolean {
  const visibleText = messageElement.textContent ?? "";
  return (
    visibleText.includes("Hi, I'm Claude") ||
    visibleText.includes("How can I help you today")
  );
}

function findClaudeChatInputElement(): HTMLElement | null {
  const chatInputElement = document.querySelector(CHAT_INPUT_CSS_SELECTOR);
  return chatInputElement instanceof HTMLElement ? chatInputElement : null;
}

function dispatchInputEventOnChatInput(chatInputElement: HTMLElement): void {
  chatInputElement.dispatchEvent(new Event("input", { bubbles: true }));
}

function dispatchChangeEventOnChatInput(chatInputElement: HTMLElement): void {
  chatInputElement.dispatchEvent(new Event("change", { bubbles: true }));
}

function dispatchKeydownEventOnChatInput(chatInputElement: HTMLElement): void {
  chatInputElement.dispatchEvent(
    new KeyboardEvent("keydown", { bubbles: true, key: "a" })
  );
}

function notifyClaudePageThatChatInputChanged(
  chatInputElement: HTMLElement
): void {
  dispatchInputEventOnChatInput(chatInputElement);
  dispatchChangeEventOnChatInput(chatInputElement);
  dispatchKeydownEventOnChatInput(chatInputElement);
}

function writeTextIntoClaudeChatInput(
  chatInputElement: HTMLElement,
  summaryText: string
): void {
  chatInputElement.textContent = summaryText;
}

function pasteSummaryIntoClaudeChatInput(summaryText: string): boolean {
  const chatInputElement = findClaudeChatInputElement();
  if (!chatInputElement) return false;
  writeTextIntoClaudeChatInput(chatInputElement, summaryText);
  notifyClaudePageThatChatInputChanged(chatInputElement);
  return true;
}

function isUserMessageElement(messageElement: Element): boolean {
  return messageElement.matches(USER_MESSAGE_CSS_SELECTOR);
}

function isAssistantMessageElement(messageElement: Element): boolean {
  return messageElement.matches(ASSISTANT_MESSAGE_CSS_SELECTOR);
}

function isStreamingAssistantPlaceholderText(messageText: string): boolean {
  if (messageText.length >= STREAMING_PLACEHOLDER_MAX_CHARACTERS) return false;
  const lowercaseText = messageText.toLowerCase();
  return STREAMING_ASSISTANT_PLACEHOLDER_PHRASES.some((placeholderPhrase) =>
    lowercaseText.includes(placeholderPhrase.toLowerCase())
  );
}

function isCompleteAssistantMessageText(messageText: string): boolean {
  if (isStreamingAssistantPlaceholderText(messageText)) return false;
  return messageText.length >= MINIMUM_ASSISTANT_MESSAGE_CHARACTERS;
}

function findClaudeMessageElementsInDocumentOrder(): Element[] {
  return sortElementsByDocumentPosition(
    keepOutermostElementsOnly([
      ...document.querySelectorAll(USER_MESSAGE_CSS_SELECTOR),
      ...document.querySelectorAll(ASSISTANT_MESSAGE_CSS_SELECTOR),
    ]).filter((messageElement) => !isClaudeGreetingMessageElement(messageElement))
  );
}

function formatUserConversationLine(messageText: string): string | null {
  if (messageText.length < 2) return null;
  return `User: ${messageText}`;
}

function formatAssistantConversationLine(messageText: string): string | null {
  if (!isCompleteAssistantMessageText(messageText)) return null;
  return `Assistant: ${messageText}`;
}

function formatConversationLineFromMessageElement(
  messageElement: Element
): string | null {
  const messageText = readVisibleTextFromChatMessageElement(messageElement);
  if (!messageText) return null;

  if (isUserMessageElement(messageElement)) {
    return formatUserConversationLine(messageText);
  }
  if (isAssistantMessageElement(messageElement)) {
    return formatAssistantConversationLine(messageText);
  }
  return null;
}

function buildClaudeConversationTextFromPage(): string {
  const conversationLines: string[] = [];
  for (const messageElement of findClaudeMessageElementsInDocumentOrder()) {
    const conversationLine = formatConversationLineFromMessageElement(messageElement);
    if (conversationLine) conversationLines.push(conversationLine);
  }
  return conversationLines.join("\n\n");
}

function clearStoredSummaryText(): void {
  storedSummaryText = "";
}

function rememberSummaryTextForInjection(summaryText: string): void {
  storedSummaryText = summaryText.trim();
}

function tryPasteStoredSummaryIntoClaudeInput(): boolean {
  if (!pasteSummaryIntoClaudeChatInput(storedSummaryText)) return false;
  clearStoredSummaryText();
  stopComposerMountObserver();
  return true;
}

function whenComposerMountObserved(): void {
  if (isSummaryInjectionInProgress || !storedSummaryText) {
    if (!storedSummaryText) stopComposerMountObserver();
    return;
  }
  beginSummaryInjectionGuardPeriod();
  tryPasteStoredSummaryIntoClaudeInput();
}

function watchForClaudeComposerToMount(): void {
  if (composerMountObserver) return;

  composerMountObserver = new MutationObserver(whenComposerMountObserved);
  composerMountObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

export const claudePlatformAdapter: AiChatPlatformAdapter = {
  platformName: "claude",

  readAllConversationTextFromPage() {
    return buildClaudeConversationTextFromPage();
  },

  findChatInputElement() {
    return findClaudeChatInputElement();
  },

  storeSummaryForInjection(summaryText: string) {
    beginSummaryInjectionGuardPeriod();
    rememberSummaryTextForInjection(summaryText);
    if (pasteSummaryIntoClaudeChatInput(summaryText.trim())) {
      clearStoredSummaryText();
    }
  },

  pasteStoredSummaryIntoChatInput() {
    if (!storedSummaryText) return false;

    beginSummaryInjectionGuardPeriod();
    if (tryPasteStoredSummaryIntoClaudeInput()) return true;

    watchForClaudeComposerToMount();
    return false;
  },
};
