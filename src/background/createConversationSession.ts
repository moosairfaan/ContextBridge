import type { ConversationSession } from "../storage/conversationSessionTypes";
import { truncateConversationSessionTitle } from "../storage/conversationSessionTitle";

export function buildDefaultConversationSessionTitle(
  platformName: string,
  createdAtMilliseconds: number
): string {
  return `${platformName} · ${new Date(createdAtMilliseconds).toLocaleString()}`;
}

export function createEmptyConversationSession(
  platformName: string
): ConversationSession {
  const createdAtMilliseconds = Date.now();
  const sessionId = crypto.randomUUID();
  return {
    id: sessionId,
    title: buildDefaultConversationSessionTitle(
      platformName,
      createdAtMilliseconds
    ),
    platform: platformName,
    createdAt: createdAtMilliseconds,
    updatedAt: createdAtMilliseconds,
    summary: "",
  };
}

export function chooseConversationSessionTitleAfterSummary(
  conversationSession: ConversationSession,
  summaryText: string
): string {
  const hasDefaultTitle =
    conversationSession.title.includes("·") && !conversationSession.summary;
  if (!hasDefaultTitle) return conversationSession.title;

  return truncateConversationSessionTitle(summaryText) || conversationSession.title;
}

export function conversationSessionWithUpdatedSummary(
  conversationSession: ConversationSession,
  summaryText: string
): ConversationSession {
  return {
    ...conversationSession,
    title: chooseConversationSessionTitleAfterSummary(
      conversationSession,
      summaryText
    ),
    summary: summaryText,
    updatedAt: Date.now(),
  };
}
