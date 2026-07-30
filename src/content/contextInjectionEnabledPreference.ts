import { EXTENSION_SETTINGS_STORAGE_KEYS } from "../storage/extensionSettings";

export let isContextInjectionEnabledOnPage = true;

export async function readContextInjectionEnabledFromStorage(): Promise<boolean> {
  try {
    const storageResult = await chrome.storage.local.get(
      EXTENSION_SETTINGS_STORAGE_KEYS.injectEnabled
    );
    const storedValue = storageResult[EXTENSION_SETTINGS_STORAGE_KEYS.injectEnabled];
    return storedValue !== false;
  } catch (error) {
    console.error("[ContextBridge] Failed to read inject preference:", error);
    return true;
  }
}

export async function writeContextInjectionEnabledToStorage(
  isEnabled: boolean
): Promise<void> {
  try {
    await chrome.storage.local.set({
      [EXTENSION_SETTINGS_STORAGE_KEYS.injectEnabled]: isEnabled,
    });
  } catch (error) {
    console.error("[ContextBridge] Failed to save inject preference:", error);
  }
}

export function setContextInjectionEnabledOnPage(isEnabled: boolean): void {
  isContextInjectionEnabledOnPage = isEnabled;
}

export async function reloadContextInjectionEnabledFromStorage(): Promise<void> {
  isContextInjectionEnabledOnPage =
    await readContextInjectionEnabledFromStorage();
}
