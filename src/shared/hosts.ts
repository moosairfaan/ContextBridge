/** Host permissions and content-script matches (keep patch-manifest.mjs in sync). */
export const SUPPORTED_HOSTS = [
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

export const HOST_PERMISSIONS = SUPPORTED_HOSTS.map(
  (host) => `https://${host}/*`
);

export const CONTENT_SCRIPT_MATCHES = HOST_PERMISSIONS;

export function normalizeHostname(hostname: string): string {
  return hostname.replace(/^www\./, "");
}

export function isSupportedHost(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);
  return SUPPORTED_HOSTS.some(
    (host) => normalizeHostname(host) === normalized
  );
}
