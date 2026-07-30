import { parseGenericConversation } from "./generic";
import type { ParsedConversation, Platform } from "./types";

export type { ConversationTurn, ParsedConversation, Platform } from "./types";
export { parseGenericConversation } from "./generic";
export { detectPlatform, parseCurrentPage } from "./parseCurrentPage";

/** Manual paste UI: auto-detect or force a platform label. */
export type PastePlatformChoice = "auto" | Exclude<Platform, "unknown">;

/**
 * Detect platform hints from pasted conversation text (label heuristics).
 */
export function detectPlatformFromPastedText(rawText: string): Platform {
  const hasChatGpt = /(^|\n)\s*chatgpt\s*:/i.test(rawText);
  const hasClaude = /(^|\n)\s*(claude|human)\s*:/i.test(rawText);
  const hasGemini = /(^|\n)\s*gemini\s*:/i.test(rawText);
  const hasPerplexity = /(^|\n)\s*perplexity\s*:/i.test(rawText);

  const hits = [
    hasChatGpt && ("chatgpt" as const),
    hasClaude && ("claude" as const),
    hasGemini && ("gemini" as const),
    hasPerplexity && ("perplexity" as const),
  ].filter(Boolean) as Exclude<Platform, "unknown">[];

  if (hits.length === 1) return hits[0];
  return "unknown";
}

/**
 * Parse pasted conversation text for the manual UI.
 * Uses generic label / blank-line heuristics; applies platform from choice or auto-detect.
 */
export function parsePastedConversation(
  rawText: string,
  platformChoice: PastePlatformChoice = "auto"
): ParsedConversation {
  const parsed = parseGenericConversation(rawText);

  if (platformChoice !== "auto") {
    return { ...parsed, platform: platformChoice };
  }

  if (parsed.platform !== "unknown") {
    return parsed;
  }

  const detected = detectPlatformFromPastedText(rawText);
  if (detected !== "unknown") {
    return { ...parsed, platform: detected };
  }

  return parsed;
}
