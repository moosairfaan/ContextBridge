import type {
  ServiceWorkerRequestMessage,
  ServiceWorkerResponseMessage,
} from "./extensionMessageTypes";
import { messageFromUnknownError } from "../shared/unknownErrorMessage";

function rejectPromiseWhenChromeReportsSendMessageError(
  reject: (reason: Error) => void,
  requestMessage: ServiceWorkerRequestMessage
): boolean {
  const chromeRuntimeError = chrome.runtime.lastError;
  if (!chromeRuntimeError) return false;

  console.error(
    "[ContextBridge] runtime.sendMessage lastError:",
    chromeRuntimeError.message,
    requestMessage
  );
  reject(new Error(chromeRuntimeError.message));
  return true;
}

function rejectPromiseWhenServiceWorkerResponseIsEmpty(
  responseMessage: unknown,
  reject: (reason: Error) => void,
  requestMessage: ServiceWorkerRequestMessage
): boolean {
  if (responseMessage && typeof responseMessage === "object") return false;

  const emptyResponseError = new Error("Empty response from background worker");
  console.error("[ContextBridge]", emptyResponseError.message, requestMessage);
  reject(emptyResponseError);
  return true;
}

export function sendMessageToServiceWorker(
  requestMessage: ServiceWorkerRequestMessage
): Promise<ServiceWorkerResponseMessage> {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(requestMessage, (responseMessage) => {
        if (rejectPromiseWhenChromeReportsSendMessageError(reject, requestMessage)) {
          return;
        }
        if (
          rejectPromiseWhenServiceWorkerResponseIsEmpty(
            responseMessage,
            reject,
            requestMessage
          )
        ) {
          return;
        }
        resolve(responseMessage as ServiceWorkerResponseMessage);
      });
    } catch (error) {
      console.error(
        "[ContextBridge] runtime.sendMessage threw:",
        error,
        requestMessage
      );
      reject(
        error instanceof Error ? error : new Error(messageFromUnknownError(error))
      );
    }
  });
}

export async function checkServiceWorkerIsReachable(): Promise<boolean> {
  try {
    const responseMessage = await sendMessageToServiceWorker({
      type: "GET_ACTIVE_CONTEXT",
    });
    return responseMessage.ok === true;
  } catch (error) {
    console.error("[ContextBridge] Service worker ping failed:", error);
    return false;
  }
}
