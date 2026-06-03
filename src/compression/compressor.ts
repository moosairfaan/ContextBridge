import type { Message } from "../platforms/types";
import { extractiveCompress, getTokenEstimate } from "./extractive";

export { extractiveCompress, getTokenEstimate };

const CONTEXT_HEADER = "--- Previous context ---";
const DEFAULT_MAX_CHARS = 3000;

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

export async function compress(
  messages: Message[],
  strategy: "extractive" | "abstractive" = "extractive",
  maxChars = DEFAULT_MAX_CHARS
): Promise<string> {
  if (strategy === "abstractive") {
    const { abstractiveCompress } = await import("./abstractive");
    const summary = await abstractiveCompress(messages);
    return trimToMaxChars(summary, maxChars);
  }
  return extractiveCompress(messages, maxChars);
}
