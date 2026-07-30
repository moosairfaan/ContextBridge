export type ServiceWorkerRequestMessage =
  | { type: "SWITCH_SESSION"; sessionId: string }
  | { type: "GET_ACTIVE_CONTEXT" }
  | { type: "CREATE_SESSION"; platform: string }
  | { type: "ENSURE_SESSION"; platform: string };

export type ServiceWorkerResponseMessage =
  | { ok: true }
  | { ok: true; sessionId: string }
  | { ok: true; context: string | null }
  | { ok: false; error: string };

export type TabContentScriptRequestMessage =
  | { type: "INJECT_CONTEXT"; context: string }
  | { type: "GET_CONVERSATION_TEXT" };

export type TabContentScriptResponseMessage =
  | { ok: true }
  | { ok: true; text: string }
  | { ok: false; error: string };

export function isServiceWorkerRequestMessage(
  value: unknown
): value is ServiceWorkerRequestMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as { type?: string };
  return (
    message.type === "SWITCH_SESSION" ||
    message.type === "GET_ACTIVE_CONTEXT" ||
    message.type === "CREATE_SESSION" ||
    message.type === "ENSURE_SESSION"
  );
}

export function isTabContentScriptRequestMessage(
  value: unknown
): value is TabContentScriptRequestMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as { type?: string };
  return (
    message.type === "INJECT_CONTEXT" || message.type === "GET_CONVERSATION_TEXT"
  );
}
