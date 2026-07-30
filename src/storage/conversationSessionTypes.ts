export interface ConversationSession {
  id: string;
  title: string;
  platform: string;
  createdAt: number;
  updatedAt: number;
  summary: string;
}

export type ConversationSessionsById = Record<string, ConversationSession>;

export const CONVERSATION_SESSION_STORAGE_KEYS = {
  sessions: "cb_sessions",
  active: "cb_active",
} as const;

export const LOCAL_STORAGE_QUOTA_BYTES = 10 * 1024 * 1024;

export const LOCAL_STORAGE_WARNING_THRESHOLD_BYTES = 8 * 1024 * 1024;
