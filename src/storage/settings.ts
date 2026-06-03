export const SETTINGS_KEYS = {
  compressionStrategy: "cb_compression_strategy",
  injectEnabled: "cb_inject_enabled",
  autoInject: "cb_auto_inject",
  maxContextChars: "cb_max_context_chars",
} as const;

export type CompressionStrategy = "extractive" | "abstractive";

export interface AppSettings {
  compressionStrategy: CompressionStrategy;
  injectEnabled: boolean;
  autoInject: boolean;
  maxContextChars: number;
}

const DEFAULTS: AppSettings = {
  compressionStrategy: "extractive",
  injectEnabled: true,
  autoInject: true,
  maxContextChars: 3000,
};

export async function getSettings(): Promise<AppSettings> {
  try {
    const result = await chrome.storage.local.get(Object.values(SETTINGS_KEYS));
    const strategy = result[SETTINGS_KEYS.compressionStrategy];
    const maxChars = result[SETTINGS_KEYS.maxContextChars];

    return {
      compressionStrategy:
        strategy === "abstractive" ? "abstractive" : DEFAULTS.compressionStrategy,
      injectEnabled: result[SETTINGS_KEYS.injectEnabled] !== false,
      autoInject: result[SETTINGS_KEYS.autoInject] !== false,
      maxContextChars:
        typeof maxChars === "number" && maxChars > 0
          ? maxChars
          : DEFAULTS.maxContextChars,
    };
  } catch (err) {
    console.error("[ContextBridge] getSettings failed:", err);
    return DEFAULTS;
  }
}

export async function saveSettings(
  partial: Partial<AppSettings>
): Promise<void> {
  try {
    const patch: Record<string, unknown> = {};
    if (partial.compressionStrategy !== undefined) {
      patch[SETTINGS_KEYS.compressionStrategy] = partial.compressionStrategy;
    }
    if (partial.injectEnabled !== undefined) {
      patch[SETTINGS_KEYS.injectEnabled] = partial.injectEnabled;
    }
    if (partial.autoInject !== undefined) {
      patch[SETTINGS_KEYS.autoInject] = partial.autoInject;
    }
    if (partial.maxContextChars !== undefined) {
      patch[SETTINGS_KEYS.maxContextChars] = partial.maxContextChars;
    }
    await chrome.storage.local.set(patch);
  } catch (err) {
    console.error("[ContextBridge] saveSettings failed:", err);
    throw err;
  }
}
