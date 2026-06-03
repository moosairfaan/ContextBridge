import type { ContextSession, RawMessage } from "./types";

const TITLE_MAX_LENGTH = 50;

export function truncateSessionTitle(text: string, maxLength = TITLE_MAX_LENGTH): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength)}…`;
}

/** Title from the first user message in a session, or null if none. */
export function titleFromFirstUserMessage(
  messages: RawMessage[]
): string | null {
  const firstUser = messages.find((m) => m.role === "user" && m.content.trim());
  if (!firstUser) return null;
  return truncateSessionTitle(firstUser.content);
}

export function createEmptySession(platform = "manual"): ContextSession {
  const now = Date.now();
  const id = crypto.randomUUID();
  return {
    id,
    title: `New session · ${new Date(now).toLocaleString()}`,
    platform,
    createdAt: now,
    updatedAt: now,
    rawMessages: [],
    compressedContext: "",
    tokenEstimate: 0,
  };
}
