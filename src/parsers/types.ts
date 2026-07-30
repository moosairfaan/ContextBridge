export type Platform =
  | "chatgpt"
  | "claude"
  | "gemini"
  | "perplexity"
  | "unknown";

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
  index: number;
}

export interface ParsedConversation {
  platform: Platform;
  turns: ConversationTurn[];
  title?: string;
}
