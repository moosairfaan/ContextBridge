import { getAiChatPlatformAdapterForCurrentPage } from "../platforms";
import {
  isContextInjectionEnabledOnPage,
  reloadContextInjectionEnabledFromStorage,
  setContextInjectionEnabledOnPage,
  writeContextInjectionEnabledToStorage,
} from "./contextInjectionEnabledPreference";
import { listenForServiceWorkerMessagesToTab } from "./respondToTabMessagesFromServiceWorker";
import {
  ensureActiveConversationSessionExistsOnPage,
  pasteActiveSessionSummaryIntoComposer,
} from "./activeConversationSessionOnPage";
import { mountFloatingInjectionToggleButtonWhenPageReady } from "./floatingInjectionToggleButton";

async function startContentScriptOnAiChatPage(): Promise<void> {
  const platformAdapter = getAiChatPlatformAdapterForCurrentPage();
  if (!platformAdapter) {
    console.debug(
      "[ContextBridge] No adapter for host:",
      window.location.hostname
    );
    return;
  }

  console.debug(
    "[ContextBridge] Content script active on",
    window.location.hostname,
    `(${platformAdapter.platformName})`
  );

  await reloadContextInjectionEnabledFromStorage();
  await ensureActiveConversationSessionExistsOnPage(platformAdapter.platformName);

  listenForServiceWorkerMessagesToTab(platformAdapter);
  void pasteActiveSessionSummaryIntoComposer(platformAdapter);

  mountFloatingInjectionToggleButtonWhenPageReady(
    isContextInjectionEnabledOnPage,
    (isInjectionEnabled) => {
      setContextInjectionEnabledOnPage(isInjectionEnabled);
      void writeContextInjectionEnabledToStorage(isInjectionEnabled);
    }
  );
}

void startContentScriptOnAiChatPage();
