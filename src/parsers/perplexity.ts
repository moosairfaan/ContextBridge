import type { ParsedConversation } from "./types";
import {
  assertHostnameMatches,
  conversationFromTaggedElements,
  fallbackMainContentConversation,
  queryAllUnique,
} from "./domUtils";

const PERPLEXITY_HOSTS = ["perplexity.ai"];

const PRIMARY_SELECTORS = [
  '[data-testid="user-message"]',
  '[data-testid="assistant-message"]',
  '[data-testid*="user"]',
  '[data-testid*="assistant"]',
  '[data-testid*="answer"]',
  ".user-message",
  '[class*="UserMessage"]',
  '[class*="Answer"]',
  ".prose",
];

const FALLBACK_SELECTORS = ['[class*="Message"]', "article"];

function readRole(element: Element): "user" | "assistant" | null {
  const testId = (element.getAttribute("data-testid") ?? "").toLowerCase();
  const className =
    typeof element.className === "string"
      ? element.className.toLowerCase()
      : "";

  if (testId.includes("user") || className.includes("user")) {
    return "user";
  }
  if (
    testId.includes("assistant") ||
    testId.includes("answer") ||
    className.includes("answer") ||
    element.classList.contains("prose")
  ) {
    return "assistant";
  }
  return null;
}

function findMessageElements(): Element[] {
  const primary = queryAllUnique(PRIMARY_SELECTORS);
  if (primary.length > 0) return primary;
  return queryAllUnique(FALLBACK_SELECTORS);
}

/**
 * Parse the open Perplexity conversation from the live page DOM.
 * Intended for bookmarklet / injected-script context on perplexity.ai.
 */
export function parseFromDOM(): ParsedConversation {
  assertHostnameMatches("perplexity", PERPLEXITY_HOSTS);

  try {
    const elements = findMessageElements();
    const parsed = conversationFromTaggedElements(
      "perplexity",
      elements,
      readRole
    );
    if (parsed && parsed.turns.length > 0) return parsed;
  } catch (error) {
    console.warn("[ContextBridge] Perplexity selector parse failed:", error);
  }

  return fallbackMainContentConversation("perplexity");
}
