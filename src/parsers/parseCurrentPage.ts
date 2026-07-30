import { parseFromDOM as parseChatGptFromDOM } from "./chatgpt";
import { parseFromDOM as parseClaudeFromDOM } from "./claude";
import { parseFromDOM as parseGeminiFromDOM } from "./gemini";
import { parseFromDOM as parsePerplexityFromDOM } from "./perplexity";
import { normalizeHostname } from "./domUtils";
import type { ParsedConversation, Platform } from "./types";

const HOST_TO_PLATFORM: Record<string, Exclude<Platform, "unknown">> = {
  "chatgpt.com": "chatgpt",
  "chat.openai.com": "chatgpt",
  "claude.ai": "claude",
  "gemini.google.com": "gemini",
  "perplexity.ai": "perplexity",
};

/**
 * Detect which AI chat platform the current page belongs to.
 */
export function detectPlatform(): Platform {
  try {
    const hostname = normalizeHostname(window.location.hostname);
    return HOST_TO_PLATFORM[hostname] ?? "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Parse the conversation on the current page using the matching platform parser.
 * Designed for bookmarklet / injected-script context (no React).
 */
export function parseCurrentPage(): ParsedConversation {
  const platform = detectPlatform();

  switch (platform) {
    case "chatgpt":
      return parseChatGptFromDOM();
    case "claude":
      return parseClaudeFromDOM();
    case "gemini":
      return parseGeminiFromDOM();
    case "perplexity":
      return parsePerplexityFromDOM();
    default:
      throw new Error(
        `ContextBridge: unsupported host "${window.location.hostname}". Open ChatGPT, Claude, Gemini, or Perplexity, or paste text into the manual UI.`
      );
  }
}
