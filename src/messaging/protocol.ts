import type { Message } from "../platforms/types";

export type BackgroundRequest =
  | { type: "NEW_MESSAGES"; messages: Message[] }
  | { type: "SWITCH_SESSION"; sessionId: string }
  | { type: "GET_ACTIVE_CONTEXT" }
  | { type: "CREATE_SESSION"; platform: string }
  | { type: "ENSURE_SESSION"; platform: string };

export type BackgroundResponse =
  | { ok: true }
  | { ok: true; sessionId: string }
  | { ok: true; context: string | null }
  | { ok: false; error: string };

export type ContentScriptMessage = {
  type: "INJECT_CONTEXT";
  context: string;
};

export function isBackgroundRequest(
  value: unknown
): value is BackgroundRequest {
  if (!value || typeof value !== "object") return false;
  const msg = value as { type?: string };
  return (
    msg.type === "NEW_MESSAGES" ||
    msg.type === "SWITCH_SESSION" ||
    msg.type === "GET_ACTIVE_CONTEXT" ||
    msg.type === "CREATE_SESSION" ||
    msg.type === "ENSURE_SESSION"
  );
}

export function isContentScriptMessage(
  value: unknown
): value is ContentScriptMessage {
  return (
    !!value &&
    typeof value === "object" &&
    (value as ContentScriptMessage).type === "INJECT_CONTEXT" &&
    typeof (value as ContentScriptMessage).context === "string"
  );
}
