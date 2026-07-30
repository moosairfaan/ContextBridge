/** Keep public/hosts.json and scripts/patch-manifest.mjs in sync with this list. */
export const SUPPORTED_AI_CHAT_WEBSITE_HOSTS = [
  "chat.openai.com",
  "www.chat.openai.com",
  "chatgpt.com",
  "www.chatgpt.com",
  "claude.ai",
  "www.claude.ai",
  "gemini.google.com",
  "www.gemini.google.com",
  "perplexity.ai",
  "www.perplexity.ai",
] as const;

export function normalizeWebsiteHostname(hostname: string): string {
  return hostname.replace(/^www\./, "");
}

export function isSupportedAiChatWebsiteHostname(hostname: string): boolean {
  const normalizedHostname = normalizeWebsiteHostname(hostname);
  return SUPPORTED_AI_CHAT_WEBSITE_HOSTS.some(
    (supportedHost) => normalizeWebsiteHostname(supportedHost) === normalizedHostname
  );
}

export function isSupportedAiChatWebsiteUrl(pageUrl?: string): boolean {
  if (!pageUrl) return false;
  try {
    const hostname = normalizeWebsiteHostname(new URL(pageUrl).hostname);
    return isSupportedAiChatWebsiteHostname(hostname);
  } catch {
    return false;
  }
}
