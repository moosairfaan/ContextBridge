import type { ParsedConversation } from "./types";
import {
  assertHostnameMatches,
  conversationFromTaggedElements,
  fallbackMainContentConversation,
  queryAllUnique,
} from "./domUtils";

const CHATGPT_HOSTS = ["chatgpt.com", "chat.openai.com"];

const MESSAGE_SELECTORS = [
  '[data-message-author-role="user"]',
  '[data-message-author-role="assistant"]',
  '[data-role="user"]',
  '[data-role="assistant"]',
  '[data-message-author="user"]',
  '[data-message-author="assistant"]',
  '[data-testid*="conversation-turn"]',
  ".user-turn",
  ".agent-turn",
];

function readRole(element: Element): "user" | "assistant" | null {
  const author =
    element.getAttribute("data-message-author-role") ??
    element.getAttribute("data-role") ??
    element.getAttribute("data-message-author");

  if (author === "user" || author === "assistant") return author;
  if (element.classList.contains("user-turn")) return "user";
  if (element.classList.contains("agent-turn")) return "assistant";
  return null;
}

/**
 * Parse the open ChatGPT conversation from the live page DOM.
 * Intended for bookmarklet / injected-script context on chatgpt.com.
 */
export function parseFromDOM(): ParsedConversation {
  assertHostnameMatches("chatgpt", CHATGPT_HOSTS);

  try {
    const elements = queryAllUnique(MESSAGE_SELECTORS);
    const parsed = conversationFromTaggedElements("chatgpt", elements, readRole);
    if (parsed && parsed.turns.length > 0) return parsed;
  } catch (error) {
    console.warn("[ContextBridge] ChatGPT selector parse failed:", error);
  }

  return fallbackMainContentConversation("chatgpt");
}
