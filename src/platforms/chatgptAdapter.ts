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
  'div#prompt-textarea[contenteditable="true"]',
  'div#prompt-textarea.ProseMirror[contenteditable="true"]',
  '[contenteditable="true"][data-testid="prompt-textarea"]',
  'div.ProseMirror[contenteditable="true"]',
  'div[contenteditable="true"][role="textbox"]',
];

const USER_MESSAGE_SELECTORS = [
  '[data-message-author-role="user"]',
  '[data-role="user"]',
  '[data-message-author="user"]',
  ".user-turn",
];

const ASSISTANT_MESSAGE_SELECTORS = [
  '[data-message-author-role="assistant"]',
  '[data-role="assistant"]',
  '[data-message-author="assistant"]',
  ".agent-turn",
];

const CONVERSATION_ROOT_SELECTORS = [
  "main",
  "#thread",
  '[data-testid="conversation-turns"]',
  "article",
];

let pendingContext = "";

function getRole(el: Element): Message["role"] | null {
  const author =
    el.getAttribute("data-message-author-role") ??
    el.getAttribute("data-role") ??
    el.getAttribute("data-message-author");
  if (author === "user" || author === "assistant") return author;
  if (el.classList.contains("user-turn")) return "user";
  if (el.classList.contains("agent-turn")) return "assistant";
  return null;
}

function collectMessageElements(): Element[] {
  return queryAll([...USER_MESSAGE_SELECTORS, ...ASSISTANT_MESSAGE_SELECTORS]);
}

export const chatgptAdapter: PlatformAdapter = {
  id: "chatgpt",

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
      [...USER_MESSAGE_SELECTORS, ...ASSISTANT_MESSAGE_SELECTORS],
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
