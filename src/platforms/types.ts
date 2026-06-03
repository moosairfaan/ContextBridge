export type MessageRole = "user" | "assistant";

export interface Message {
  role: MessageRole;
  content: string;
  timestamp: number;
}

export type PlatformId = "chatgpt" | "claude" | "gemini" | "perplexity";
