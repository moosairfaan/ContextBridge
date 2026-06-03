import type { PlatformAdapter } from "./platformAdapter";
import type { Message } from "./types";
import { extractMessageText } from "./domUtils";

const USER_MESSAGE_SELECTOR = '[data-testid="user-message"]';
const ASSISTANT_MESSAGE_SELECTOR = 'div[class*="font-claude-response"]';
const CHAT_INPUT_SELECTOR = '[data-testid="chat-input"]';

const ASSISTANT_PLACEHOLDER_PATTERNS = [
  "Pondering",
  "stand by",
  "Thinking",
  "Searching",
  "Working",
  "Loading",
] as const;

const ASSISTANT_PLACEHOLDER_MAX_CHARS = 100;
const ASSISTANT_SETTLE_MS = 3000;
const MIN_ASSISTANT_CHARS = 20;
const INJECT_GUARD_MS = 2000;

let pendingContext = "";
let composerObserver: MutationObserver | null = null;
let isInjecting = false;
let injectGuardTimer: ReturnType<typeof setTimeout> | null = null;

function beginInjecting(): void {
  isInjecting = true;
  if (injectGuardTimer) clearTimeout(injectGuardTimer);
  injectGuardTimer = setTimeout(() => {
    isInjecting = false;
    injectGuardTimer = null;
  }, INJECT_GUARD_MS);
}

function stopComposerObserver(): void {
  composerObserver?.disconnect();
  composerObserver = null;
}

function isGreetingAssistantElement(el: Element): boolean {
  const text = el.textContent ?? "";
  return (
    text.includes("Hi, I'm Claude") ||
    text.includes("How can I help you today")
  );
}

function getChatInput(): HTMLElement | null {
  const el = document.querySelector(CHAT_INPUT_SELECTOR);
  return el instanceof HTMLElement ? el : null;
}

function dispatchChatInputEvents(input: HTMLElement): void {
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  input.dispatchEvent(
    new KeyboardEvent("keydown", { bubbles: true, key: "a" })
  );
}

function writeChatInput(text: string): boolean {
  const input = getChatInput();
  if (!input) return false;
  input.textContent = text;
  dispatchChatInputEvents(input);
  return true;
}

function isUserMessage(el: Element): boolean {
  return el.matches(USER_MESSAGE_SELECTOR);
}

function isAssistantMessage(el: Element): boolean {
  return el.matches(ASSISTANT_MESSAGE_SELECTOR);
}

function isPlaceholderAssistantText(content: string): boolean {
  if (content.length >= ASSISTANT_PLACEHOLDER_MAX_CHARS) return false;
  const lower = content.toLowerCase();
  return ASSISTANT_PLACEHOLDER_PATTERNS.some((pattern) =>
    lower.includes(pattern.toLowerCase())
  );
}

function shouldCaptureAssistant(content: string): boolean {
  if (isPlaceholderAssistantText(content)) return false;
  if (content.length < MIN_ASSISTANT_CHARS) return false;
  return true;
}

function filterClaudeMessages(messages: Message[]): Message[] {
  return messages.filter((m) => {
    if (m.role === "user") return m.content.length >= 2;
    return shouldCaptureAssistant(m.content);
  });
}

/** Sort so earlier nodes in the document come first. */
function sortByDocumentPosition(elements: Element[]): Element[] {
  return [...elements].sort((a, b) => {
    const position = a.compareDocumentPosition(b);
    if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
      return -1;
    }
    if (position & Node.DOCUMENT_POSITION_PRECEDING) {
      return 1;
    }
    return 0;
  });
}

/** Drop nested matches (keep outermost message containers only). */
function dedupeOutermostNodes(nodes: Element[]): Element[] {
  return nodes.filter(
    (node) => !nodes.some((other) => other !== node && other.contains(node))
  );
}

function tryEmitUserMessage(
  el: Element,
  seenElements: WeakSet<Element>,
  callback: (msg: Message) => void
): void {
  if (!isUserMessage(el) || seenElements.has(el)) {
    return;
  }

  seenElements.add(el);

  const content = extractMessageText(el);
  if (content.length < 2) return;

  callback({ role: "user", content, timestamp: Date.now() });
}

function scheduleAssistantCapture(
  el: Element,
  assistantTimers: WeakMap<Element, ReturnType<typeof setTimeout>>,
  activeTimers: Set<ReturnType<typeof setTimeout>>,
  seenElements: WeakSet<Element>,
  callback: (msg: Message) => void
): void {
  if (
    !isAssistantMessage(el) ||
    isGreetingAssistantElement(el) ||
    seenElements.has(el)
  ) {
    return;
  }

  seenElements.add(el);

  const existing = assistantTimers.get(el);
  if (existing) {
    clearTimeout(existing);
    activeTimers.delete(existing);
  }

  const timer = setTimeout(() => {
    activeTimers.delete(timer);
    assistantTimers.delete(el);

    const content = extractMessageText(el);
    if (isPlaceholderAssistantText(content) || !shouldCaptureAssistant(content)) {
      return;
    }

    callback({ role: "assistant", content, timestamp: Date.now() });
  }, ASSISTANT_SETTLE_MS);

  assistantTimers.set(el, timer);
  activeTimers.add(timer);
}

function findAssistantElementFromMutation(
  mutation: MutationRecord
): Element | null {
  const target = mutation.target;
  if (!(target instanceof Element)) return null;

  const el = isAssistantMessage(target)
    ? target
    : target.closest(ASSISTANT_MESSAGE_SELECTOR);

  if (!el || isGreetingAssistantElement(el)) return null;
  return el;
}

function scanNodeForNewMessages(
  node: Node,
  assistantTimers: WeakMap<Element, ReturnType<typeof setTimeout>>,
  activeTimers: Set<ReturnType<typeof setTimeout>>,
  seenElements: WeakSet<Element>,
  callback: (msg: Message) => void
): void {
  if (isInjecting) return;
  if (!(node instanceof Element)) return;

  const candidates: Element[] = [];
  if (isUserMessage(node)) {
    candidates.push(node);
  } else if (isAssistantMessage(node) && !isGreetingAssistantElement(node)) {
    candidates.push(node);
  }
  node.querySelectorAll(USER_MESSAGE_SELECTOR).forEach((el) => {
    candidates.push(el);
  });
  node.querySelectorAll(ASSISTANT_MESSAGE_SELECTOR).forEach((el) => {
    if (!isGreetingAssistantElement(el)) candidates.push(el);
  });

  for (const el of dedupeOutermostNodes(sortByDocumentPosition(candidates))) {
    if (isUserMessage(el)) {
      tryEmitUserMessage(el, seenElements, callback);
    } else if (isAssistantMessage(el)) {
      scheduleAssistantCapture(
        el,
        assistantTimers,
        activeTimers,
        seenElements,
        callback
      );
    }
  }
}

export const claudeAdapter: PlatformAdapter = {
  id: "claude",

  getInputElement() {
    return getChatInput();
  },

  setInputValue(text: string) {
    const value =
      pendingContext.length > 0
        ? `${pendingContext}\n\n${text}`.trim()
        : text;
    pendingContext = "";
    writeChatInput(value);
  },

  getLatestMessages(limit: number): Message[] {
    const users = dedupeOutermostNodes(
      sortByDocumentPosition([
        ...document.querySelectorAll(USER_MESSAGE_SELECTOR),
      ])
    );
    const assistants = dedupeOutermostNodes(
      sortByDocumentPosition(
        [...document.querySelectorAll(ASSISTANT_MESSAGE_SELECTOR)].filter(
          (el) => !isGreetingAssistantElement(el)
        )
      )
    );

    const messages: Message[] = [];
    const pairCount = Math.min(users.length, assistants.length);

    for (let i = 0; i < pairCount; i++) {
      const userContent = extractMessageText(users[i]);
      if (userContent.length >= 2) {
        messages.push({
          role: "user",
          content: userContent,
          timestamp: Date.now(),
        });
      }

      const assistantContent = extractMessageText(assistants[i]);
      if (assistantContent) {
        messages.push({
          role: "assistant",
          content: assistantContent,
          timestamp: Date.now(),
        });
      }
    }

    for (let i = pairCount; i < users.length; i++) {
      const userContent = extractMessageText(users[i]);
      if (userContent.length >= 2) {
        messages.push({
          role: "user",
          content: userContent,
          timestamp: Date.now(),
        });
      }
    }

    return filterClaudeMessages(messages).slice(-limit);
  },

  onNewMessage(callback: (msg: Message) => void) {
    const seenElements = new WeakSet<Element>();
    const assistantTimers = new WeakMap<
      Element,
      ReturnType<typeof setTimeout>
    >();
    const activeTimers = new Set<ReturnType<typeof setTimeout>>();
    const observer = new MutationObserver((mutations) => {
      if (isInjecting) return;

      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          scanNodeForNewMessages(
            node,
            assistantTimers,
            activeTimers,
            seenElements,
            callback
          );
        });

        const assistantEl = findAssistantElementFromMutation(mutation);
        if (assistantEl) {
          scheduleAssistantCapture(
            assistantEl,
            assistantTimers,
            activeTimers,
            seenElements,
            callback
          );
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      for (const timer of activeTimers) clearTimeout(timer);
      activeTimers.clear();
      observer.disconnect();
    };
  },

  injectContext(context: string) {
    beginInjecting();

    const text = context.trim();
    pendingContext = text;
    if (writeChatInput(text)) {
      pendingContext = "";
    }
  },

  applyPendingContext() {
    if (!pendingContext) return false;

    beginInjecting();

    if (writeChatInput(pendingContext)) {
      pendingContext = "";
      stopComposerObserver();
      return true;
    }

    if (!composerObserver) {
      composerObserver = new MutationObserver(() => {
        if (isInjecting || !pendingContext) {
          if (!pendingContext) stopComposerObserver();
          return;
        }
        beginInjecting();
        if (writeChatInput(pendingContext)) {
          pendingContext = "";
          stopComposerObserver();
        }
      });
      composerObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    return false;
  },
};
