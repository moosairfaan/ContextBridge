import { normalizeHostname } from "../shared/hosts";
import { chatgptAdapter } from "./chatgptAdapter";
import { claudeAdapter } from "./claudeAdapter";
import { geminiAdapter } from "./geminiAdapter";
import { perplexityAdapter } from "./perplexityAdapter";
import type { PlatformAdapter } from "./platformAdapter";
import type { PlatformId } from "./types";

const HOST_TO_PLATFORM: Record<string, PlatformId> = {
  "chat.openai.com": "chatgpt",
  "chatgpt.com": "chatgpt",
  "claude.ai": "claude",
  "gemini.google.com": "gemini",
  "perplexity.ai": "perplexity",
};

const ADAPTERS: Record<PlatformId, PlatformAdapter> = {
  chatgpt: chatgptAdapter,
  claude: claudeAdapter,
  gemini: geminiAdapter,
  perplexity: perplexityAdapter,
};

export function getPlatformAdapter(): PlatformAdapter | null {
  const host = normalizeHostname(window.location.hostname);
  const platform = HOST_TO_PLATFORM[host];
  return platform ? ADAPTERS[platform] : null;
}
