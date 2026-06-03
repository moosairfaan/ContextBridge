import type { BackgroundRequest, BackgroundResponse } from "./protocol";

/**
 * Sends a message to the MV3 service worker with proper lastError handling.
 * Works from content scripts and the extension popup.
 */
export function sendBackgroundMessage(
  request: BackgroundRequest
): Promise<BackgroundResponse> {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(request, (response) => {
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          console.error(
            "[ContextBridge] runtime.sendMessage lastError:",
            lastError.message,
            request
          );
          reject(new Error(lastError.message));
          return;
        }
        if (!response || typeof response !== "object") {
          const err = new Error("Empty response from background worker");
          console.error("[ContextBridge]", err.message, request);
          reject(err);
          return;
        }
        resolve(response as BackgroundResponse);
      });
    } catch (err) {
      console.error("[ContextBridge] runtime.sendMessage threw:", err, request);
      reject(err);
    }
  });
}

/** Wake the service worker and verify the message port is alive. */
export async function pingBackground(): Promise<boolean> {
  try {
    const response = await sendBackgroundMessage({ type: "GET_ACTIVE_CONTEXT" });
    return response.ok === true;
  } catch (err) {
    console.error("[ContextBridge] Background ping failed:", err);
    return false;
  }
}
