export interface RawMessage {
  role: string;
  content: string;
  timestamp: number;
}

export interface ContextSession {
  id: string;
  title: string;
  platform: string;
  createdAt: number;
  updatedAt: number;
  rawMessages: RawMessage[];
  compressedContext: string;
  tokenEstimate: number;
}

export type SessionsMap = Record<string, ContextSession>;

export const STORAGE_KEYS = {
  sessions: "cb_sessions",
  active: "cb_active",
} as const;

/** chrome.storage.local quota per extension (bytes) */
export const STORAGE_QUOTA_BYTES = 10 * 1024 * 1024;

/** Warn when usage reaches this threshold (bytes) */
export const STORAGE_WARN_BYTES = 8 * 1024 * 1024;
