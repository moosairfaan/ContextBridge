import type { ParsedConversation } from "./types";
import {
  assertHostnameMatches,
  conversationFromTaggedElements,
  fallbackMainContentConversation,
  queryAllUnique,
} from "./domUtils";

const GEMINI_HOSTS = ["gemini.google.com"];

const MESSAGE_SELECTORS = [
  '[data-test-id="user-query"]',
  '[data-test-id="model-response"]',
  'message-content[data-turn-role="user"]',
  'message-content[data-turn-role="model"]',
  ".user-query",
  ".gemini-user-message",
  ".model-response",
  ".gemini-response",
  "ms-chat-turn .response-container",
];

function readRole(element: Element): "user" | "assistant" | null {
  const testId = element.getAttribute("data-test-id") ?? "";
  const turnRole = element.getAttribute("data-turn-role");

  if (
    testId === "user-query" ||
    turnRole === "user" ||
    element.classList.contains("user-query") ||
    element.classList.contains("gemini-user-message")
  ) {
    return "user";
  }

  if (
    testId === "model-response" ||
    turnRole === "model" ||
    element.classList.contains("model-response") ||
    element.classList.contains("gemini-response") ||
    element.classList.contains("response-container")
  ) {
    return "assistant";
  }

  const turn = element.closest("ms-chat-turn");
  if (turn) {
    if (
      turn.querySelector(
        ".user-query, [data-test-id='user-query'], message-content[data-turn-role='user']"
      ) === element
    ) {
      return "user";
    }
    if (
      turn.querySelector(
        ".model-response, [data-test-id='model-response'], .response-container, message-content[data-turn-role='model']"
      ) === element
    ) {
      return "assistant";
    }
  }

  return null;
}

function findMessageElements(): Element[] {
  const direct = queryAllUnique(MESSAGE_SELECTORS);
  if (direct.length > 0) return direct;

  const fromTurns: Element[] = [];
  for (const turn of queryAllUnique(["ms-chat-turn", ".chat-turn-container"])) {
    const user = turn.querySelector(
      ".user-query, [data-test-id='user-query'], message-content[data-turn-role='user'], .query-text"
    );
    const assistant = turn.querySelector(
      ".model-response, [data-test-id='model-response'], .response-container, message-content[data-turn-role='model'], .markdown"
    );
    if (user) fromTurns.push(user);
    if (assistant) fromTurns.push(assistant);
  }
  return fromTurns;
}

/**
 * Parse the open Gemini conversation from the live page DOM.
 * Intended for bookmarklet / injected-script context on gemini.google.com.
 */
export function parseFromDOM(): ParsedConversation {
  assertHostnameMatches("gemini", GEMINI_HOSTS);

  try {
    const elements = findMessageElements();
    const parsed = conversationFromTaggedElements("gemini", elements, readRole);
    if (parsed && parsed.turns.length > 0) return parsed;
  } catch (error) {
    console.warn("[ContextBridge] Gemini selector parse failed:", error);
  }

  return fallbackMainContentConversation("gemini");
}
