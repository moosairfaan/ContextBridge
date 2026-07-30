import type { ConversationTurn, ParsedConversation, Platform } from "./types";

export function normalizeHostname(hostname: string): string {
  return hostname.replace(/^www\./, "").toLowerCase();
}

export function assertHostnameMatches(
  platform: Exclude<Platform, "unknown">,
  allowedHostSuffixes: string[]
): void {
  const hostname = normalizeHostname(window.location.hostname);
  const matches = allowedHostSuffixes.some(
    (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`)
  );
  if (!matches) {
    throw new Error(
      `ContextBridge ${platform} parser expected one of [${allowedHostSuffixes.join(", ")}], got "${hostname}"`
    );
  }
}

export function sortElementsByDocumentOrder(elements: Element[]): Element[] {
  return [...elements].sort((left, right) => {
    const position = left.compareDocumentPosition(right);
    if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });
}

export function keepOutermostElements(elements: Element[]): Element[] {
  return elements.filter(
    (element) =>
      !elements.some(
        (other) => other !== element && other.contains(element)
      )
  );
}

export function queryAllUnique(selectors: string[]): Element[] {
  const seen = new Set<Element>();
  const matches: Element[] = [];
  for (const selector of selectors) {
    try {
      document.querySelectorAll(selector).forEach((element) => {
        if (!seen.has(element)) {
          seen.add(element);
          matches.push(element);
        }
      });
    } catch {
      // Invalid or unsupported selector — skip.
    }
  }
  return keepOutermostElements(sortElementsByDocumentOrder(matches));
}

const MESSAGE_BODY_SELECTORS = [
  ".standard-markdown",
  ".progressive-markdown",
  ".markdown",
  ".prose",
  '[class*="markdown"]',
];

export function readVisibleText(element: Element): string {
  for (const selector of MESSAGE_BODY_SELECTORS) {
    try {
      const body = element.querySelector(selector);
      const text = body?.textContent?.trim();
      if (text) return text;
    } catch {
      // continue
    }
  }
  return element.textContent?.trim() ?? "";
}

export function indexTurns(
  turns: Omit<ConversationTurn, "index">[]
): ConversationTurn[] {
  return turns.map((turn, index) => ({ ...turn, index }));
}

export function readPageTitle(): string | undefined {
  const title = document.title?.trim();
  return title || undefined;
}

/**
 * Last-resort extraction when message selectors find nothing useful.
 */
export function fallbackMainContentConversation(
  platform: Exclude<Platform, "unknown">
): ParsedConversation {
  const main =
    document.querySelector("main") ??
    document.querySelector('[role="main"]') ??
    document.querySelector("article") ??
    document.body;

  const content = main?.textContent?.replace(/\s+\n/g, "\n").trim() ?? "";

  return {
    platform,
    title: readPageTitle(),
    turns: content
      ? indexTurns([{ role: "user", content }])
      : [],
  };
}

export function conversationFromTaggedElements(
  platform: Exclude<Platform, "unknown">,
  elements: Element[],
  readRole: (element: Element) => ConversationTurn["role"] | null
): ParsedConversation | null {
  const turns: Omit<ConversationTurn, "index">[] = [];

  for (const element of keepOutermostElements(
    sortElementsByDocumentOrder(elements)
  )) {
    const role = readRole(element);
    const content = readVisibleText(element);
    if (!role || !content) continue;
    turns.push({ role, content });
  }

  if (turns.length === 0) return null;

  return {
    platform,
    title: readPageTitle(),
    turns: indexTurns(turns),
  };
}
