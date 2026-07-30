export const EXTENSION_SETTINGS_STORAGE_KEYS = {
  injectEnabled: "cb_inject_enabled",
  autoInject: "cb_auto_inject",
  apiUrl: "cb_api_url",
  apiKey: "cb_api_key",
  apiModel: "cb_api_model",
} as const;

export interface ExtensionSettings {
  injectEnabled: boolean;
  autoInject: boolean;
  apiUrl: string;
  apiKey: string;
  apiModel: string;
}

const DEFAULT_EXTENSION_SETTINGS: ExtensionSettings = {
  injectEnabled: true,
  autoInject: true,
  apiUrl: "https://api.openai.com/v1/chat/completions",
  apiKey: "",
  apiModel: "gpt-4o-mini",
};

function readBooleanFromStorage(value: unknown): boolean {
  return value !== false;
}

function readStringFromStorage(
  value: unknown,
  fallbackValue: string,
  trimWhitespace = false
): string {
  if (typeof value !== "string") return fallbackValue;
  const stringValue = trimWhitespace ? value.trim() : value;
  return stringValue || fallbackValue;
}

function extensionSettingsFromStorageValues(
  storageValues: Record<string, unknown>
): ExtensionSettings {
  return {
    injectEnabled: readBooleanFromStorage(
      storageValues[EXTENSION_SETTINGS_STORAGE_KEYS.injectEnabled]
    ),
    autoInject: readBooleanFromStorage(
      storageValues[EXTENSION_SETTINGS_STORAGE_KEYS.autoInject]
    ),
    apiUrl: readStringFromStorage(
      storageValues[EXTENSION_SETTINGS_STORAGE_KEYS.apiUrl],
      DEFAULT_EXTENSION_SETTINGS.apiUrl,
      true
    ),
    apiKey: readStringFromStorage(
      storageValues[EXTENSION_SETTINGS_STORAGE_KEYS.apiKey],
      DEFAULT_EXTENSION_SETTINGS.apiKey
    ),
    apiModel: readStringFromStorage(
      storageValues[EXTENSION_SETTINGS_STORAGE_KEYS.apiModel],
      DEFAULT_EXTENSION_SETTINGS.apiModel,
      true
    ),
  };
}

function buildExtensionSettingsStoragePatch(
  partialSettings: Partial<ExtensionSettings>
): Record<string, unknown> {
  const storagePatch: Record<string, unknown> = {};

  if (partialSettings.injectEnabled !== undefined) {
    storagePatch[EXTENSION_SETTINGS_STORAGE_KEYS.injectEnabled] =
      partialSettings.injectEnabled;
  }
  if (partialSettings.autoInject !== undefined) {
    storagePatch[EXTENSION_SETTINGS_STORAGE_KEYS.autoInject] =
      partialSettings.autoInject;
  }
  if (partialSettings.apiUrl !== undefined) {
    storagePatch[EXTENSION_SETTINGS_STORAGE_KEYS.apiUrl] = partialSettings.apiUrl;
  }
  if (partialSettings.apiKey !== undefined) {
    storagePatch[EXTENSION_SETTINGS_STORAGE_KEYS.apiKey] = partialSettings.apiKey;
  }
  if (partialSettings.apiModel !== undefined) {
    storagePatch[EXTENSION_SETTINGS_STORAGE_KEYS.apiModel] =
      partialSettings.apiModel;
  }

  return storagePatch;
}

export async function readExtensionSettings(): Promise<ExtensionSettings> {
  try {
    const storageValues = await chrome.storage.local.get(
      Object.values(EXTENSION_SETTINGS_STORAGE_KEYS)
    );
    return extensionSettingsFromStorageValues(storageValues);
  } catch (error) {
    console.error("[ContextBridge] readExtensionSettings failed:", error);
    return DEFAULT_EXTENSION_SETTINGS;
  }
}

export async function writeExtensionSettings(
  partialSettings: Partial<ExtensionSettings>
): Promise<void> {
  try {
    const storagePatch = buildExtensionSettingsStoragePatch(partialSettings);
    await chrome.storage.local.set(storagePatch);
  } catch (error) {
    console.error("[ContextBridge] writeExtensionSettings failed:", error);
    throw error;
  }
}
