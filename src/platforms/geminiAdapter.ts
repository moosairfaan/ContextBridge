import type { PlatformAdapter } from "./platformAdapter";
import type { Message } from "./types";
import {
  createMessageObserver,
  getConversationRoot,
  insertIntoContentEditable,
  parseMessagesFromElements,
  queryAll,
} from "./domUtils";

const INPUT_SELECTORS = [
  ".ql-editor[contenteditable='true']",
  "rich-textarea .ql-editor",
  'rich-textarea [contenteditable="true"]',
  'div[contenteditable="true"][aria-label*="prompt" i]',
  'div[contenteditable="true"][aria-label*="Enter" i]',
  ".text-input-field [contenteditable='true']",
  'div[contenteditable="true"]',
];

const USER_MESSAGE_SELECTORS = [
  ".user-query",
  '[data-test-id="user-query"]',
  ".gemini-user-message",
  "ms-chat-turn .user-query",
  'message-content[data-turn-role="user"]',
];

const ASSISTANT_MESSAGE_SELECTORS = [
  ".model-response",
  '[data-test-id="model-response"]',
  ".gemini-response",
  "ms-chat-turn .model-response",
  'message-content[data-turn-role="model"]',
  "ms-chat-turn .response-container",
];

const CONVERSATION_ROOT_SELECTORS = [
  "ms-chat-view",
  "chat-window",
  "infinite-scroller",
  "main",
  '[role="main"]',
];

let pendingContext = "";

function getRole(el: Element): Message["role"] | null {
  const testId = el.getAttribute("data-test-id") ?? "";
  const turnRole = el.getAttribute("data-turn-role");
  if (
    el.classList.contains("user-query") ||
    el.classList.contains("gemini-user-message") ||
    testId === "user-query" ||
    turnRole === "user"
  ) {
    return "user";
  }
  if (
    el.classList.contains("model-response") ||
    el.classList.contains("gemini-response") ||
    testId === "model-response" ||
    turnRole === "model" ||
    el.classList.contains("response-container")
  ) {
    return "assistant";
  }
  const host = el.closest("ms-chat-turn");
  if (host?.querySelector(".user-query, [data-test-id='user-query']") === el) {
    return "user";
  }
  if (
    host?.querySelector(
      ".model-response, [data-test-id='model-response'], .response-container"
    ) === el
  ) {
    return "assistant";
  }
  return null;
}

function collectMessageElements(): Element[] {
  const direct = queryAll([
    ...USER_MESSAGE_SELECTORS,
    ...ASSISTANT_MESSAGE_SELECTORS,
  ]);
  if (direct.length > 0) return direct;

  const turns = queryAll(["ms-chat-turn", ".chat-turn-container"]);
  const fromTurns: Element[] = [];
  for (const turn of turns) {
    const user = turn.querySelector(
      ".user-query, [data-test-id='user-query'], .query-text"
    );
    const assistant = turn.querySelector(
      ".model-response, [data-test-id='model-response'], .response-container, .markdown"
    );
    if (user) fromTurns.push(user);
    if (assistant) fromTurns.push(assistant);
  }
  return fromTurns;
}

export const geminiAdapter: PlatformAdapter = {
  id: "gemini",

  getInputElement() {
    const candidates = INPUT_SELECTORS.flatMap((sel) =>
      Array.from(document.querySelectorAll(sel))
    ).filter((el): el is HTMLElement => el instanceof HTMLElement);

    for (const el of candidates) {
      const inFooter = el.closest(
        "input-area, .input-area, footer, .bottom-container"
      );
      if (inFooter || el.closest("form")) return el;
    }

    return candidates[0] ?? null;
  },

  setInputValue(text: string) {
    const input = this.getInputElement();
    if (!input) return;

    const value =
      pendingContext.length > 0
        ? `${pendingContext}\n\n${text}`.trim()
        : text;
    pendingContext = "";

    insertIntoContentEditable(input, value, "end");
  },

  getLatestMessages(limit: number): Message[] {
    const messages = parseMessagesFromElements(
      collectMessageElements(),
      getRole
    );
    return messages.slice(-limit);
  },

  onNewMessage(callback: (msg: Message) => void) {
    const root = getConversationRoot(CONVERSATION_ROOT_SELECTORS);
    return createMessageObserver(
      root,
      [...USER_MESSAGE_SELECTORS, ...ASSISTANT_MESSAGE_SELECTORS, "ms-chat-turn"],
      getRole,
      callback
    );
  },

  injectContext(context: string) {
    pendingContext = context.trim();
  },

  applyPendingContext() {
    if (!pendingContext) return false;
    const input = this.getInputElement();
    if (!input) return false;
    insertIntoContentEditable(input, pendingContext, "start");
    pendingContext = "";
    return true;
  },
};
