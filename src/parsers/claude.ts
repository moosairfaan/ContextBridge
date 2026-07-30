import type { ParsedConversation } from "./types";
import {
  assertHostnameMatches,
  conversationFromTaggedElements,
  fallbackMainContentConversation,
  queryAllUnique,
  readVisibleText,
} from "./domUtils";

const CLAUDE_HOSTS = ["claude.ai"];

const USER_SELECTORS = ['[data-testid="user-message"]'];
const ASSISTANT_SELECTORS = [
  'div[class*="font-claude-response"]',
  '[data-testid="assistant-message"]',
  '[data-is-streaming]',
];

const STREAMING_PLACEHOLDER_PHRASES = [
  "pondering",
  "stand by",
  "thinking",
  "searching",
  "working",
  "loading",
] as const;

function isGreeting(text: string): boolean {
  return (
    text.includes("Hi, I'm Claude") ||
    text.includes("How can I help you today")
  );
}

function isStreamingPlaceholder(text: string): boolean {
  if (text.length >= 100) return false;
  const lower = text.toLowerCase();
  return STREAMING_PLACEHOLDER_PHRASES.some((phrase) =>
    lower.includes(phrase)
  );
}

function readRole(element: Element): "user" | "assistant" | null {
  if (element.matches('[data-testid="user-message"]')) return "user";
  if (
    element.matches('[data-testid="assistant-message"]') ||
    element.matches('div[class*="font-claude-response"]') ||
    element.hasAttribute("data-is-streaming")
  ) {
    return "assistant";
  }
  return null;
}

/**
 * Parse the open Claude conversation from the live page DOM.
 * Intended for bookmarklet / injected-script context on claude.ai.
 */
export function parseFromDOM(): ParsedConversation {
  assertHostnameMatches("claude", CLAUDE_HOSTS);

  try {
    const elements = queryAllUnique([
      ...USER_SELECTORS,
      ...ASSISTANT_SELECTORS,
    ]).filter((element) => {
      const text = readVisibleText(element);
      if (!text) return false;
      if (isGreeting(text)) return false;
      if (isStreamingPlaceholder(text)) return false;
      return true;
    });

    const parsed = conversationFromTaggedElements("claude", elements, readRole);
    if (parsed && parsed.turns.length > 0) return parsed;
  } catch (error) {
    console.warn("[ContextBridge] Claude selector parse failed:", error);
  }

  return fallbackMainContentConversation("claude");
}
