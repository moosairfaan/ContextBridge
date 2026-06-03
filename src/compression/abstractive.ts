import type { Message } from "../platforms/types";
import { summarizeText } from "./summarizeClient";

const CONTEXT_HEADER = "--- Previous context ---";
const EXTRACTIVE_MESSAGE_LIMIT = 30;
const ABSTRACTIVE_INPUT_MAX_CHARS = 4000;

function messagesToSummaryInput(messages: Message[]): string {
  const recent = messages.slice(-EXTRACTIVE_MESSAGE_LIMIT);
  const text = recent
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n\n");

  if (text.length <= ABSTRACTIVE_INPUT_MAX_CHARS) return text;
  return text.slice(-ABSTRACTIVE_INPUT_MAX_CHARS);
}

export async function abstractiveCompress(messages: Message[]): Promise<string> {
  const input = messagesToSummaryInput(messages);
  if (!input.trim()) {
    return `${CONTEXT_HEADER}\n\n(empty conversation)`;
  }

  const summary = await summarizeText(input);
  return `${CONTEXT_HEADER}\n\n${summary.trim()}`;
}
