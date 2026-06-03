import type { PlatformAdapter } from "./platformAdapter";
import type { Message } from "./types";
import {
  createMessageObserver,
  getConversationRoot,
  insertIntoContentEditable,
  parseMessagesFromElements,
  queryAll,
  queryFirst,
} from "./domUtils";

const INPUT_SELECTORS = [
  'textarea[placeholder*="Ask" i]',
  'textarea[placeholder*="follow" i]',
  "textarea",
  'div[contenteditable="true"]',
  '[role="textbox"]',
];

const USER_MESSAGE_SELECTORS = [
  '[data-testid="user-message"]',
  ".user-message",
  '[class*="UserMessage"]',
  '[class*="query-bar"]',
];

const ASSISTANT_MESSAGE_SELECTORS = [
  '[data-testid="assistant-message"]',
  ".prose",
  '[class*="Answer"]',
  '[class*="markdown"]',
];

const CONVERSATION_ROOT_SELECTORS = ["main", '[role="main"]', "#__next"];

let pendingContext = "";

function getRole(el: Element): Message["role"] | null {
  const testId = el.getAttribute("data-testid") ?? "";
  if (testId.includes("user") || el.className.toLowerCase().includes("user")) {
    return "user";
  }
  if (
    testId.includes("assistant") ||
    el.classList.contains("prose") ||
    el.className.toLowerCase().includes("answer")
  ) {
    return "assistant";
  }
  return null;
}

function collectMessageElements(): Element[] {
  const messages = queryAll([
    ...USER_MESSAGE_SELECTORS,
    ...ASSISTANT_MESSAGE_SELECTORS,
  ]);
  if (messages.length > 0) return messages;
  return queryAll(["[class*='Message']", "article"]);
}

export const perplexityAdapter: PlatformAdapter = {
  id: "perplexity",

  getInputElement() {
    return queryFirst(INPUT_SELECTORS);
  },

  setInputValue(text: string) {
    const input = this.getInputElement();
    if (!input) return;

    const value =
      pendingContext.length > 0
        ? `${pendingContext}\n\n${text}`.trim()
        : text;
    pendingContext = "";

    if (input instanceof HTMLTextAreaElement) {
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }

    insertIntoContentEditable(input, value, "end");
  },

  getLatestMessages(limit: number): Message[] {
    return parseMessagesFromElements(collectMessageElements(), getRole).slice(
      -limit
    );
  },

  onNewMessage(callback: (msg: Message) => void) {
    const root = getConversationRoot(CONVERSATION_ROOT_SELECTORS);
    return createMessageObserver(
      root,
      [...USER_MESSAGE_SELECTORS, ...ASSISTANT_MESSAGE_SELECTORS],
      getRole,
      callback,
      500
    );
  },

  injectContext(context: string) {
    pendingContext = context.trim();
  },

  applyPendingContext() {
    if (!pendingContext) return false;
    const input = this.getInputElement();
    if (!input) return false;
    if (input instanceof HTMLTextAreaElement) {
      input.value = pendingContext;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      pendingContext = "";
      return true;
    }
    insertIntoContentEditable(input, pendingContext, "start");
    pendingContext = "";
    return true;
  },
};
