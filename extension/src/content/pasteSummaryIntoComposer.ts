import type { AiChatPlatformAdapter } from "../platforms/aiChatPlatformAdapter";

const SUMMARY_PASTE_RETRY_DELAYS_MILLISECONDS = [500, 2000];

let lastPastedSummaryText = "";

function scheduleSummaryPasteRetry(
  platformAdapter: AiChatPlatformAdapter,
  delayMilliseconds: number
): void {
  setTimeout(() => {
    platformAdapter.pasteStoredSummaryIntoChatInput();
  }, delayMilliseconds);
}

function scheduleSummaryPasteRetries(
  platformAdapter: AiChatPlatformAdapter
): void {
  for (const delayMilliseconds of SUMMARY_PASTE_RETRY_DELAYS_MILLISECONDS) {
    scheduleSummaryPasteRetry(platformAdapter, delayMilliseconds);
  }
}

function isSameSummaryAsLastPaste(summaryText: string): boolean {
  return lastPastedSummaryText === summaryText;
}

function rememberLastPastedSummaryText(summaryText: string): void {
  lastPastedSummaryText = summaryText;
}

export function pasteSummaryIntoComposerOnce(
  platformAdapter: AiChatPlatformAdapter,
  summaryText: string
): void {
  const trimmedSummaryText = summaryText.trim();
  if (!trimmedSummaryText || isSameSummaryAsLastPaste(trimmedSummaryText)) return;

  rememberLastPastedSummaryText(trimmedSummaryText);
  platformAdapter.storeSummaryForInjection(trimmedSummaryText);
  scheduleSummaryPasteRetries(platformAdapter);
}
