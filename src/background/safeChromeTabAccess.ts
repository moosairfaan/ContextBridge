export function isTabNoLongerExistsError(error: unknown): boolean {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return errorMessage.includes("No tab with id");
}

export function isTransientTabMessagingError(error: unknown): boolean {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return (
    isTabNoLongerExistsError(error) ||
    errorMessage.includes("Could not establish connection") ||
    errorMessage.includes("Receiving end does not exist") ||
    errorMessage.includes("No frame with id") ||
    errorMessage.includes("The message port closed before a response was received")
  );
}

function swallowMissingTabError(error: unknown): boolean {
  return isTabNoLongerExistsError(error) || isTransientTabMessagingError(error);
}

export async function readBrowserTabById(
  tabId: number
): Promise<chrome.tabs.Tab | null> {
  try {
    return await chrome.tabs.get(tabId);
  } catch (error) {
    if (swallowMissingTabError(error)) {
      return null;
    }
    throw error;
  }
}

export async function readCompleteBrowserTabById(
  tabId: number
): Promise<chrome.tabs.Tab | null> {
  const browserTab = await readBrowserTabById(tabId);
  if (!browserTab || browserTab.status !== "complete" || browserTab.discarded) {
    return null;
  }
  return browserTab;
}

export async function sendMessageToBrowserTab(
  tabId: number,
  message: unknown
): Promise<unknown | undefined> {
  try {
    if (!(await readCompleteBrowserTabById(tabId))) {
      return undefined;
    }
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    if (swallowMissingTabError(error)) {
      return undefined;
    }
    throw error;
  }
}

export async function executeScriptInBrowserTab(
  injection: Parameters<typeof chrome.scripting.executeScript>[0]
): Promise<unknown | null> {
  try {
    const tabId = injection.target.tabId;
    if (typeof tabId === "number" && !(await readCompleteBrowserTabById(tabId))) {
      return null;
    }
    return await chrome.scripting.executeScript(injection);
  } catch (error) {
    if (swallowMissingTabError(error)) {
      return null;
    }
    throw error;
  }
}
