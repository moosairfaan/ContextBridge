const AI_PLATFORM_DISPLAY_NAMES: Record<string, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  perplexity: "Perplexity",
  manual: "Manual",
};

export function formatAiPlatformDisplayName(platformName: string): string {
  return AI_PLATFORM_DISPLAY_NAMES[platformName] ?? platformName;
}
