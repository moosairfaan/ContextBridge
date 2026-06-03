import type { Message } from "./types";

export type { Message, MessageRole, PlatformId } from "./types";

export interface PlatformAdapter {
  readonly id: import("./types").PlatformId;
  getInputElement(): HTMLElement | null;
  setInputValue(text: string): void;
  getLatestMessages(limit: number): Message[];
  onNewMessage(callback: (msg: Message) => void): () => void;
  injectContext(context: string): void;
  /** Write stored context into the composer when it is mounted. */
  applyPendingContext(): boolean;
}
