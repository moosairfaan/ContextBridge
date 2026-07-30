import type { ConversationTurn, ParsedConversation } from "./types";

type SpeakerRole = ConversationTurn["role"];

const LABEL_ROLE_BY_NAME: Record<string, SpeakerRole> = {
  you: "user",
  human: "user",
  chatgpt: "assistant",
  claude: "assistant",
  assistant: "assistant",
  gemini: "assistant",
};

/** Case-insensitive label at the start of a line, e.g. "You:" or "ChatGPT: rest". */
const LINE_LABEL_PATTERN =
  /^(you|human|chatgpt|claude|assistant|gemini)\s*:\s*(.*)$/i;

function asUnknownBlob(rawText: string): ParsedConversation {
  return {
    platform: "unknown",
    turns: [
      {
        role: "user",
        content: rawText,
        index: 0,
      },
    ],
  };
}

function indexTurns(
  turns: Omit<ConversationTurn, "index">[]
): ConversationTurn[] {
  return turns.map((turn, index) => ({ ...turn, index }));
}

function parseLabeledTurns(rawText: string): ConversationTurn[] | null {
  const lines = rawText.replace(/\r\n/g, "\n").split("\n");
  const draftTurns: { role: SpeakerRole; lines: string[] }[] = [];

  for (const line of lines) {
    const labelMatch = LINE_LABEL_PATTERN.exec(line.trimStart());
    if (labelMatch) {
      const labelName = labelMatch[1].toLowerCase();
      const role = LABEL_ROLE_BY_NAME[labelName];
      if (!role) continue;

      const restOfLine = labelMatch[2] ?? "";
      draftTurns.push({
        role,
        lines: restOfLine.length > 0 ? [restOfLine] : [],
      });
      continue;
    }

    if (draftTurns.length === 0) {
      // Content before the first label — not confident enough to invent a turn.
      continue;
    }

    draftTurns[draftTurns.length - 1].lines.push(line);
  }

  const turns = draftTurns
    .map((draft) => ({
      role: draft.role,
      content: draft.lines.join("\n").trim(),
    }))
    .filter((turn) => turn.content.length > 0);

  // Need at least two labeled turns to trust this as a conversation.
  if (turns.length < 2) return null;

  const hasUser = turns.some((turn) => turn.role === "user");
  const hasAssistant = turns.some((turn) => turn.role === "assistant");
  if (!hasUser || !hasAssistant) return null;

  return indexTurns(turns);
}

function parseBlankLineSeparatedTurns(
  rawText: string
): ConversationTurn[] | null {
  const blocks = rawText
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);

  if (blocks.length < 2) return null;

  return indexTurns(
    blocks.map((content, blockIndex) => ({
      role: blockIndex % 2 === 0 ? "user" : "assistant",
      content,
    }))
  );
}

function inferPlatformFromLabels(rawText: string): ParsedConversation["platform"] {
  const hasChatGpt = /(^|\n)\s*chatgpt\s*:/i.test(rawText);
  const hasClaude = /(^|\n)\s*(claude|human)\s*:/i.test(rawText);
  const hasGemini = /(^|\n)\s*gemini\s*:/i.test(rawText);

  const platformHits = [hasChatGpt, hasClaude, hasGemini].filter(Boolean).length;
  if (platformHits !== 1) return "unknown";
  if (hasChatGpt) return "chatgpt";
  if (hasClaude) return "claude";
  if (hasGemini) return "gemini";
  return "unknown";
}

/**
 * Parse raw pasted conversation text into turns using label heuristics.
 * Never throws — degrades to a single unknown blob when confidence is low.
 */
export function parseGenericConversation(rawText: string): ParsedConversation {
  try {
    if (typeof rawText !== "string") {
      return asUnknownBlob(String(rawText ?? ""));
    }

    const trimmed = rawText.trim();
    if (!trimmed) {
      return { platform: "unknown", turns: [] };
    }

    const labeledTurns = parseLabeledTurns(trimmed);
    if (labeledTurns) {
      return {
        platform: inferPlatformFromLabels(trimmed),
        turns: labeledTurns,
      };
    }

    const blankLineTurns = parseBlankLineSeparatedTurns(trimmed);
    if (blankLineTurns) {
      return {
        platform: "unknown",
        turns: blankLineTurns,
      };
    }

    return asUnknownBlob(trimmed);
  } catch {
    return asUnknownBlob(typeof rawText === "string" ? rawText : "");
  }
}
