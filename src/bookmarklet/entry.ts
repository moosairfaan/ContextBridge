import { formatHandoffSummary } from "../lib/formatSummary";
import { parseCurrentPage } from "../parsers/parseCurrentPage";

const TOAST_ID = "contextbridge-bookmarklet-toast";
const FAILURE_MESSAGE =
  "Couldn't read this page — try pasting manually instead";
const SUCCESS_MESSAGE = "Copied conversation for Claude ✓";

function removeExistingToast(): void {
  document.getElementById(TOAST_ID)?.remove();
}

function showToast(message: string, isError: boolean): void {
  removeExistingToast();

  const toast = document.createElement("div");
  toast.id = TOAST_ID;
  toast.setAttribute("role", "status");
  toast.textContent = message;
  toast.style.cssText = [
    "position:fixed",
    "left:50%",
    "bottom:24px",
    "transform:translateX(-50%)",
    "z-index:2147483647",
    "max-width:min(92vw,420px)",
    "padding:12px 16px",
    "border-radius:10px",
    "font:600 13px/1.4 system-ui,-apple-system,sans-serif",
    "color:#fff",
    `background:${isError ? "#991b1b" : "#1c1917"}`,
    "box-shadow:0 8px 28px rgba(0,0,0,.28)",
    "pointer-events:none",
  ].join(";");

  document.documentElement.appendChild(toast);
  window.setTimeout(() => {
    toast.remove();
  }, 2000);
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  throw new Error("Clipboard API unavailable");
}

async function runBookmarklet(): Promise<void> {
  try {
    const conversation = parseCurrentPage();
    if (!conversation.turns.length) {
      showToast(FAILURE_MESSAGE, true);
      return;
    }

    const summary = formatHandoffSummary(conversation);
    if (!summary.trim()) {
      showToast(FAILURE_MESSAGE, true);
      return;
    }

    await copyText(summary);
    showToast(SUCCESS_MESSAGE, false);
  } catch {
    showToast(FAILURE_MESSAGE, true);
  }
}

void runBookmarklet();
