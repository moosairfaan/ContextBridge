import type {
  ConversationTurn,
  ParsedConversation,
  Platform,
} from "../parsers/types";

const DEFAULT_MAX_WORDS = 500;

export interface FormatHandoffSummaryOptions {
  /** Only include the last N turns when building the handoff. */
  maxTurns?: number;
  /** Soft word budget for the full handoff block. Default: 500. */
  maxWords?: number;
  /**
   * Pluggable key-point extractor. Default: local heuristics (first sentence
   * of each assistant turn, deduplicated). Swap this for an LLM-backed
   * adapter later without changing `formatHandoffSummary`'s signature.
   */
  extractKeyPoints?: (turns: ConversationTurn[]) => string[];
}

const PLATFORM_LABELS: Record<Platform, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  perplexity: "Perplexity",
  unknown: "an AI chat",
};

function platformLabel(platform: Platform): string {
  return PLATFORM_LABELS[platform] ?? platform;
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function firstSentence(text: string): string {
  const normalized = normalizeWhitespace(text);
  if (!normalized) return "";

  const match = normalized.match(/^(.+?[.!?])(?:\s|$)/);
  const sentence = match?.[1] ?? normalized;
  // Cap runaway sentences so bullets stay scannable.
  return sentence.length > 180 ? `${sentence.slice(0, 177)}…` : sentence;
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Default heuristic key points — easy to replace via `options.extractKeyPoints`.
 */
export function extractKeyPointsHeuristic(turns: ConversationTurn[]): string[] {
  const seen = new Set<string>();
  const points: string[] = [];

  for (const turn of turns) {
    if (turn.role !== "assistant") continue;
    const point = firstSentence(turn.content);
    if (!point) continue;

    const dedupeKey = point.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    points.push(point);
  }

  return points;
}

function inferTopic(conversation: ParsedConversation, turns: ConversationTurn[]): string {
  const title = conversation.title?.trim();
  if (title && !/^chatgpt$|^claude$|^gemini$|^perplexity$/i.test(title)) {
    // Prefer a real chat title over the bare site tab title when possible.
    if (title.length > 3 && !title.toLowerCase().includes("new chat")) {
      return normalizeWhitespace(title).slice(0, 120);
    }
  }

  const firstUserTurn = turns.find((turn) => turn.role === "user");
  if (firstUserTurn?.content.trim()) {
    return firstSentence(firstUserTurn.content) || normalizeWhitespace(firstUserTurn.content).slice(0, 120);
  }

  return "Untitled conversation";
}

function selectTurns(
  turns: ConversationTurn[],
  maxTurns?: number
): ConversationTurn[] {
  if (maxTurns === undefined || maxTurns <= 0 || turns.length <= maxTurns) {
    return turns;
  }
  return turns.slice(-maxTurns);
}

function findLastExchange(turns: ConversationTurn[]): {
  userMessage: string;
  assistantReply: string;
} {
  let lastUser: ConversationTurn | undefined;
  let lastAssistantAfterUser: ConversationTurn | undefined;

  for (let index = turns.length - 1; index >= 0; index -= 1) {
    const turn = turns[index];
    if (turn.role === "user") {
      lastUser = turn;
      const following = turns.slice(index + 1).find((t) => t.role === "assistant");
      lastAssistantAfterUser = following;
      break;
    }
  }

  // If the conversation ends on an assistant turn with no trailing user,
  // still surface the most recent user + that assistant reply.
  if (!lastUser) {
    const lastAssistant = [...turns].reverse().find((t) => t.role === "assistant");
    return {
      userMessage: "(no user message found)",
      assistantReply: lastAssistant?.content.trim() || "...",
    };
  }

  return {
    userMessage: lastUser.content.trim() || "(empty user message)",
    assistantReply: lastAssistantAfterUser?.content.trim() || "...",
  };
}

function trimToWordBudget(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text.trim();
  return `${words.slice(0, maxWords).join(" ")}…`;
}

function buildHandoffBlock(parts: {
  platform: string;
  topic: string;
  keyPoints: string[];
  userMessage: string;
  assistantReply: string;
}): string {
  const bullets =
    parts.keyPoints.length > 0
      ? parts.keyPoints.map((point) => `- ${point}`).join("\n")
      : "- (no assistant points extracted yet)";

  return [
    "---",
    `Continuing a conversation from ${parts.platform}.`,
    `Topic: ${parts.topic}`,
    "",
    "Key points so far:",
    bullets,
    "",
    "Last exchange:",
    parts.userMessage,
    parts.assistantReply,
    "---",
  ].join("\n");
}

/**
 * Build a compact, readable handoff block for pasting into another AI chat.
 *
 * Key points use local heuristics by default. To swap in an LLM later, pass
 * `options.extractKeyPoints` (same sync signature) or wrap this function —
 * the public API stays `formatHandoffSummary(conversation, options?)`.
 */
export function formatHandoffSummary(
  conversation: ParsedConversation,
  options: FormatHandoffSummaryOptions = {}
): string {
  const maxWords = options.maxWords ?? DEFAULT_MAX_WORDS;
  const turns = selectTurns(conversation.turns ?? [], options.maxTurns);
  const extractKeyPoints =
    options.extractKeyPoints ?? extractKeyPointsHeuristic;

  if (turns.length === 0) {
    return [
      "---",
      `Continuing a conversation from ${platformLabel(conversation.platform)}.`,
      "Topic: Untitled conversation",
      "",
      "Key points so far:",
      "- (empty conversation)",
      "",
      "Last exchange:",
      "(no messages)",
      "...",
      "---",
    ].join("\n");
  }

  const keyPoints = extractKeyPoints(turns);
  const { userMessage, assistantReply } = findLastExchange(turns);

  let block = buildHandoffBlock({
    platform: platformLabel(conversation.platform),
    topic: inferTopic(conversation, turns),
    keyPoints,
    userMessage,
    assistantReply,
  });

  // Shrink key points first if over budget, then hard-trim the whole block.
  if (countWords(block) > maxWords && keyPoints.length > 1) {
    let trimmedPoints = [...keyPoints];
    while (trimmedPoints.length > 1 && countWords(block) > maxWords) {
      trimmedPoints = trimmedPoints.slice(0, -1);
      block = buildHandoffBlock({
        platform: platformLabel(conversation.platform),
        topic: inferTopic(conversation, turns),
        keyPoints: trimmedPoints,
        userMessage,
        assistantReply,
      });
    }
  }

  if (countWords(block) > maxWords) {
    block = trimToWordBudget(block, maxWords);
  }

  return block;
}
