import type { Message } from "../platforms/types";

const CONTEXT_HEADER = "--- Previous context ---";
const EXTRACTIVE_MESSAGE_LIMIT = 30;
const ASSISTANT_TRUNCATE_CHARS = 200;
const DEFAULT_MAX_CHARS = 3000;

export function getTokenEstimate(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Truncate assistant text at the last `.` before maxChars, avoiding mid-sentence cuts. */
function truncateAssistantAtSentence(content: string, maxChars: number): string {
  if (content.length <= maxChars) return content;

  const withinLimit = content.slice(0, maxChars);
  const lastPeriod = withinLimit.lastIndexOf(".");

  if (lastPeriod > 0) {
    return `${content.slice(0, lastPeriod + 1)}…`;
  }

  return `${withinLimit}…`;
}

function formatMessageLine(msg: Message): string {
  const label = msg.role === "user" ? "User" : "Assistant";
  const content =
    msg.role === "user"
      ? msg.content
      : truncateAssistantAtSentence(msg.content, ASSISTANT_TRUNCATE_CHARS);
  return `${label}: ${content}`;
}

function trimToMaxChars(block: string, maxChars: number): string {
  if (block.length <= maxChars) return block;

  const headerEnd = block.indexOf("\n\n");
  const header =
    headerEnd >= 0 ? block.slice(0, headerEnd) : CONTEXT_HEADER;
  const body =
    headerEnd >= 0 ? block.slice(headerEnd + 2) : block.replace(CONTEXT_HEADER, "").trim();

  const lines = body.split("\n").filter(Boolean);
  while (lines.length > 0) {
    const candidate = `${header}\n\n${lines.join("\n")}`;
    if (candidate.length <= maxChars) return candidate;
    lines.shift();
  }

  const fallback = `${header}\n\n`;
  return fallback.length > maxChars
    ? fallback.slice(0, maxChars - 1) + "…"
    : fallback;
}

export function extractiveCompress(
  messages: Message[],
  maxChars = DEFAULT_MAX_CHARS
): string {
  const recent = messages.slice(-EXTRACTIVE_MESSAGE_LIMIT);
  const lines = recent.map(formatMessageLine);
  const block = `${CONTEXT_HEADER}\n\n${lines.join("\n")}`;
  return trimToMaxChars(block, maxChars);
}
