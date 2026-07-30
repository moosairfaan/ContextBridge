import { normalizeWebsiteHostname } from "../shared/supportedAiChatWebsiteHosts";
import { chatGptPlatformAdapter } from "./chatGptPlatformAdapter";
import { claudePlatformAdapter } from "./claudePlatformAdapter";
import { geminiPlatformAdapter } from "./geminiPlatformAdapter";
import { perplexityPlatformAdapter } from "./perplexityPlatformAdapter";
import type { AiChatPlatformAdapter } from "./aiChatPlatformAdapter";
import type { AiChatPlatformName } from "./aiChatPlatformName";

const WEBSITE_HOST_TO_PLATFORM_NAME: Record<string, AiChatPlatformName> = {
  "chat.openai.com": "chatgpt",
  "chatgpt.com": "chatgpt",
  "claude.ai": "claude",
  "gemini.google.com": "gemini",
  "perplexity.ai": "perplexity",
};

const PLATFORM_ADAPTERS_BY_NAME: Record<AiChatPlatformName, AiChatPlatformAdapter> =
  {
    chatgpt: chatGptPlatformAdapter,
    claude: claudePlatformAdapter,
    gemini: geminiPlatformAdapter,
    perplexity: perplexityPlatformAdapter,
  };

function readPlatformNameForCurrentWebsite(): AiChatPlatformName | undefined {
  const websiteHostname = normalizeWebsiteHostname(window.location.hostname);
  return WEBSITE_HOST_TO_PLATFORM_NAME[websiteHostname];
}

export function getAiChatPlatformAdapterForCurrentPage(): AiChatPlatformAdapter | null {
  const platformName = readPlatformNameForCurrentWebsite();
  return platformName ? PLATFORM_ADAPTERS_BY_NAME[platformName] : null;
}
