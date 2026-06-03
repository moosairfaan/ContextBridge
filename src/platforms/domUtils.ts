import type { Message } from "./types";

const CONTENT_SELECTORS = [
  ".standard-markdown",
  ".progressive-markdown",
  ".markdown",
  ".prose",
  '[class*="markdown"]',
];

export function queryFirst(selectors: string[]): HTMLElement | null {
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el instanceof HTMLElement) return el;
  }
  return null;
}

export function queryAll(selectors: string[]): Element[] {
  const seen = new Set<Element>();
  const results: Element[] = [];
  for (const selector of selectors) {
    document.querySelectorAll(selector).forEach((el) => {
      if (!seen.has(el)) {
        seen.add(el);
        results.push(el);
      }
    });
  }
  return results;
}

export function extractMessageText(element: Element): string {
  for (const selector of CONTENT_SELECTORS) {
    const content = element.querySelector(selector);
    if (content?.textContent?.trim()) {
      return content.textContent.trim();
    }
  }
  return element.textContent?.trim() ?? "";
}

function dispatchPaste(element: HTMLElement, text: string): boolean {
  try {
    const data = new DataTransfer();
    data.setData("text/plain", text);
    const pasted = element.dispatchEvent(
      new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: data,
      })
    );
    if (!pasted) return false;
    element.dispatchEvent(
      new InputEvent("input", { bubbles: true, inputType: "insertFromPaste" })
    );
    return true;
  } catch {
    return false;
  }
}

function dispatchInput(element: HTMLElement, inputType: string): void {
  element.dispatchEvent(
    new InputEvent("input", { bubbles: true, inputType, cancelable: true })
  );
}

function textAppearsInElement(element: HTMLElement, text: string): boolean {
  const sample = text.trim().slice(0, 48);
  if (!sample) return true;
  return (element.textContent ?? "").includes(sample);
}

function insertViaProseMirrorParagraphs(
  element: HTMLElement,
  text: string,
  position: "start" | "end"
): void {
  const lines = text.split("\n");
  const fragment = document.createDocumentFragment();
  for (const line of lines) {
    const paragraph = document.createElement("p");
    paragraph.textContent = line.length > 0 ? line : "\u200b";
    fragment.append(paragraph);
  }

  if (position === "start" && element.childElementCount > 0) {
    element.insertBefore(fragment, element.firstChild);
  } else if (element.childElementCount === 0) {
    element.append(fragment);
  } else {
    element.append(fragment);
  }

  dispatchInput(element, "insertFromPaste");
}

export function insertIntoContentEditable(
  element: HTMLElement,
  text: string,
  position: "start" | "end" = "end"
): void {
  element.focus();

  const selection = window.getSelection();
  if (!selection) return;

  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(position === "start");
  selection.removeAllRanges();
  selection.addRange(range);

  const inserted = document.execCommand("insertText", false, text);
  dispatchInput(element, "insertText");

  if (textAppearsInElement(element, text)) {
    return;
  }

  if (!inserted && dispatchPaste(element, text) && textAppearsInElement(element, text)) {
    return;
  }

  insertViaProseMirrorParagraphs(element, text, position);

  if (!textAppearsInElement(element, text)) {
    if (position === "start") {
      element.textContent = `${text}\n\n${element.textContent ?? ""}`.trim();
    } else {
      element.textContent = `${element.textContent ?? ""}\n\n${text}`.trim();
    }
    dispatchInput(element, "insertFromPaste");
  }
}

export function getConversationRoot(fallbackSelectors: string[]): Element {
  return queryFirst(fallbackSelectors) ?? document.body;
}

export function domIndex(element: Element): number {
  const path: number[] = [];
  let current: Element | null = element;
  while (current?.parentElement) {
    path.unshift(Array.from(current.parentElement.children).indexOf(current));
    current = current.parentElement;
  }
  return path.reduce((acc, i) => acc * 1000 + i, 0);
}

export function sortByDomOrder(elements: Element[]): Element[] {
  return [...elements].sort((a, b) => domIndex(a) - domIndex(b));
}

export function parseMessagesFromElements(
  elements: Element[],
  getRole: (el: Element) => Message["role"] | null
): Message[] {
  const messages: Message[] = [];
  for (const el of sortByDomOrder(elements)) {
    const role = getRole(el);
    const content = extractMessageText(el);
    if (!role || !content) continue;
    messages.push({
      role,
      content,
      timestamp: Date.now(),
    });
  }
  return messages;
}

function messageKey(msg: Message): string {
  return `${msg.role}:${msg.content}`;
}

export function createMessageObserver(
  root: Element,
  messageSelectors: string[],
  getRole: (el: Element) => Message["role"] | null,
  callback: (msg: Message) => void,
  debounceMs = 500
): () => void {
  const seenElements = new WeakSet<Element>();
  const emittedKeys = new Set<string>();
  let observerDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingMutations: MutationRecord[] = [];

  const emitIfMessage = (node: Node): void => {
    if (!(node instanceof Element)) return;

    const candidates: Element[] = [];
    for (const selector of messageSelectors) {
      try {
        if (node.matches(selector)) candidates.push(node);
        node.querySelectorAll(selector).forEach((el) => candidates.push(el));
      } catch {
        // Invalid selector — skip
      }
    }

    for (const el of candidates) {
      if (seenElements.has(el)) continue;
      const role = getRole(el);
      const content = extractMessageText(el);
      if (!role || content.length < 2) continue;

      seenElements.add(el);
      const msg: Message = { role, content, timestamp: Date.now() };
      const key = messageKey(msg);
      if (emittedKeys.has(key)) continue;

      emittedKeys.add(key);
      callback(msg);
    }
  };

  const processPendingMutations = (): void => {
    observerDebounceTimer = null;
    const batch = pendingMutations;
    pendingMutations = [];

    for (const mutation of batch) {
      mutation.addedNodes.forEach(emitIfMessage);
    }
  };

  const scheduleMutationProcessing = (): void => {
    if (observerDebounceTimer) clearTimeout(observerDebounceTimer);
    observerDebounceTimer = setTimeout(processPendingMutations, debounceMs);
  };

  const observer = new MutationObserver((mutations) => {
    pendingMutations.push(...mutations);
    scheduleMutationProcessing();
  });

  observer.observe(root, { childList: true, subtree: true });
  return () => {
    if (observerDebounceTimer) clearTimeout(observerDebounceTimer);
    observer.disconnect();
  };
}
