export type OpenChatTargetId = "claude" | "chatgpt" | "gemini" | "perplexity";

export interface OpenChatTarget {
  id: OpenChatTargetId;
  label: string;
  /** New-chat URL — sites generally cannot prefill the composer via query params. */
  newChatUrl: string;
}

export const OPEN_CHAT_TARGETS: Record<OpenChatTargetId, OpenChatTarget> = {
  claude: {
    id: "claude",
    label: "Claude",
    newChatUrl: "https://claude.ai/new",
  },
  chatgpt: {
    id: "chatgpt",
    label: "ChatGPT",
    newChatUrl: "https://chatgpt.com/",
  },
  gemini: {
    id: "gemini",
    label: "Gemini",
    newChatUrl: "https://gemini.google.com/app",
  },
  perplexity: {
    id: "perplexity",
    label: "Perplexity",
    newChatUrl: "https://www.perplexity.ai/",
  },
};

export function pasteShortcutLabel(
  platform: string = navigator.platform ?? ""
): string {
  const isApple = /mac|iphone|ipad|ipod/i.test(platform);
  return isApple ? "Cmd+V" : "Ctrl+V";
}

export function pasteReminderMessage(targetLabel: string): string {
  return `Copied — paste into ${targetLabel} with ${pasteShortcutLabel()} once the tab loads`;
}
