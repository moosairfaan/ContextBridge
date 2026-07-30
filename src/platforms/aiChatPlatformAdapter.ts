import type { AiChatPlatformName } from "./aiChatPlatformName";

export interface AiChatPlatformAdapter {
  readonly platformName: AiChatPlatformName;
  readAllConversationTextFromPage(): string;
  findChatInputElement(): HTMLElement | null;
  storeSummaryForInjection(summaryText: string): void;
  pasteStoredSummaryIntoChatInput(): boolean;
}
