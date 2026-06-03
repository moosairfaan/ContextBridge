import { isContentScriptMessage } from "../messaging/protocol";
import { sendBackgroundMessage } from "../messaging/sendBackgroundMessage";
import { getPlatformAdapter } from "../platforms";
import type { PlatformAdapter } from "../platforms/platformAdapter";
import type { Message } from "../platforms/types";
import { SETTINGS_KEYS } from "../storage/settings";

let sessionId: string | null = null;
let injectEnabled = true;

const seenMessageContents = new Set<string>();
const pendingMessages: Message[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_DEBOUNCE_MS = 500;

async function loadInjectEnabled(): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get(SETTINGS_KEYS.injectEnabled);
    const value = result[SETTINGS_KEYS.injectEnabled];
    return value !== false;
  } catch (err) {
    console.error("[ContextBridge] Failed to read inject preference:", err);
    return true;
  }
}

async function saveInjectEnabled(enabled: boolean): Promise<void> {
  try {
    await chrome.storage.local.set({ [SETTINGS_KEYS.injectEnabled]: enabled });
  } catch (err) {
    console.error("[ContextBridge] Failed to save inject preference:", err);
  }
}

/** Retries only when chat-input was not mounted on the first injectContext call. */
const CONTEXT_APPLY_DELAYS_MS = [500, 2000];

let lastInjectedContext = "";

function scheduleContextApply(adapter: PlatformAdapter): void {
  for (const delayMs of CONTEXT_APPLY_DELAYS_MS) {
    setTimeout(() => {
      adapter.applyPendingContext();
    }, delayMs);
  }
}

function applyContextOnce(
  adapter: PlatformAdapter,
  context: string
): void {
  const trimmed = context.trim();
  if (!trimmed || lastInjectedContext === trimmed) return;
  lastInjectedContext = trimmed;
  adapter.injectContext(trimmed);
  scheduleContextApply(adapter);
}

async function pullAndApplyActiveContext(
  adapter: PlatformAdapter
): Promise<void> {
  if (!injectEnabled) return;

  try {
    const response = await sendBackgroundMessage({
      type: "GET_ACTIVE_CONTEXT",
    });
    if (response.ok && "context" in response && response.context?.trim()) {
      applyContextOnce(adapter, response.context);
      console.debug("[ContextBridge] Applied active context on page load");
    }
  } catch (err) {
    console.error("[ContextBridge] Failed to pull active context:", err);
  }
}

function registerInjectListener(adapter: PlatformAdapter): void {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!isContentScriptMessage(message)) {
      return false;
    }

    try {
      if (injectEnabled && message.context) {
        applyContextOnce(adapter, message.context);
      }
      sendResponse({ ok: true });
    } catch (err) {
      console.error("[ContextBridge] INJECT_CONTEXT handler failed:", err);
      sendResponse({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return true;
  });
}

function flushPendingMessages(): void {
  flushTimer = null;
  if (pendingMessages.length === 0) return;

  const batch = pendingMessages.splice(0, pendingMessages.length);
  void sendBackgroundMessage({ type: "NEW_MESSAGES", messages: batch })
    .then((response) => {
      if (!response.ok) {
        console.error("[ContextBridge] NEW_MESSAGES failed:", response.error);
      }
    })
    .catch((err) => {
      console.error("[ContextBridge] NEW_MESSAGES failed:", err);
    });
}

function handleNewMessage(msg: Message): void {
  if (seenMessageContents.has(msg.content)) {
    return;
  }
  seenMessageContents.add(msg.content);
  pendingMessages.push(msg);
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(flushPendingMessages, FLUSH_DEBOUNCE_MS);
}

const SVG_NS = "http://www.w3.org/2000/svg";

function appendBrainIcon(button: HTMLButtonElement): void {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("width", "20");
  svg.setAttribute("height", "20");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.75");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");

  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute(
    "d",
    "M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588 4 4 0 0 0 7.636 2.106 3.2 3.2 0 0 0 .164-.546 4 4 0 0 0 1.84-2.16 4 4 0 0 0 .86-2.12 3 3 0 0 0 .86-2.12 4 4 0 0 0-1.84-2.16 3.2 3.2 0 0 0-.164-.546 4 4 0 0 0-7.636 2.106 4 4 0 0 0-.556 6.588 4 4 0 0 0 2.526 5.77A3 3 0 0 0 12 5z"
  );
  svg.append(path);
  button.append(svg);
}

function createFloatingToggle(onToggle: (enabled: boolean) => void): void {
  const host = document.createElement("div");
  host.id = "contextbridge-toggle-host";
  const shadow = host.attachShadow({ mode: "closed" });

  const style = document.createElement("style");
  style.textContent = `
    :host { all: initial; }
    .cb-toggle {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      background: #1a1a1a;
      color: #ffffff;
      cursor: pointer;
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.35);
      transition: background 0.15s ease, opacity 0.15s ease, transform 0.15s ease;
      padding: 0;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .cb-toggle:hover { transform: scale(1.05); background: #2a2a2a; }
    .cb-toggle:focus-visible { outline: 2px solid #6b9fff; outline-offset: 2px; }
    .cb-toggle.cb-off { opacity: 0.55; background: #3a3a3a; }
    .cb-toggle svg { display: block; }
  `;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "cb-toggle";
  button.title = "ContextBridge: context injection on";
  appendBrainIcon(button);

  const updateButton = (enabled: boolean) => {
    button.classList.toggle("cb-off", !enabled);
    button.title = enabled
      ? "ContextBridge: context injection on (click to disable)"
      : "ContextBridge: context injection off (click to enable)";
    button.setAttribute("aria-pressed", String(enabled));
  };

  updateButton(injectEnabled);

  button.addEventListener("click", () => {
    injectEnabled = !injectEnabled;
    updateButton(injectEnabled);
    void saveInjectEnabled(injectEnabled);
    onToggle(injectEnabled);
  });

  shadow.append(style, button);
  document.body.appendChild(host);
}

async function init(): Promise<void> {
  const adapter = getPlatformAdapter();
  if (!adapter) {
    console.debug(
      "[ContextBridge] No adapter for host:",
      window.location.hostname
    );
    return;
  }

  console.debug(
    "[ContextBridge] Content script active on",
    window.location.hostname,
    `(${adapter.id})`
  );

  injectEnabled = await loadInjectEnabled();

  try {
    const response = await sendBackgroundMessage({
      type: "ENSURE_SESSION",
      platform: adapter.id,
    });
    if (response.ok && "sessionId" in response) {
      sessionId = response.sessionId;
      console.debug("[ContextBridge] Session ready:", sessionId);
    } else if (!response.ok) {
      console.error("[ContextBridge] ENSURE_SESSION failed:", response.error);
    }
  } catch (err) {
    console.error("[ContextBridge] Could not ensure session:", err);
  }

  adapter.onNewMessage((msg) => {
    handleNewMessage(msg);
  });

  registerInjectListener(adapter);
  void pullAndApplyActiveContext(adapter);

  const mountToggle = () => {
    if (document.getElementById("contextbridge-toggle-host")) return;
    createFloatingToggle((enabled) => {
      console.debug(
        "[ContextBridge] Injection",
        enabled ? "enabled" : "disabled"
      );
    });
  };

  if (document.body) {
    mountToggle();
  } else {
    document.addEventListener("DOMContentLoaded", mountToggle, { once: true });
  }
}

void init();
