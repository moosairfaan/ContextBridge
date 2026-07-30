import { useEffect } from "react";
import { CONVERSATION_SESSION_STORAGE_KEYS } from "../../storage/conversationSessionTypes";

export function useConversationSessionStorageSync(
  onStorageChanged: () => void
): void {
  useEffect(() => {
    const storageChangeListener = (
      storageChanges: { [key: string]: chrome.storage.StorageChange },
      storageAreaName: string
    ) => {
      if (storageAreaName !== "local") return;
      if (
        storageChanges[CONVERSATION_SESSION_STORAGE_KEYS.sessions] ||
        storageChanges[CONVERSATION_SESSION_STORAGE_KEYS.active]
      ) {
        onStorageChanged();
      }
    };
    chrome.storage.onChanged.addListener(storageChangeListener);
    return () => chrome.storage.onChanged.removeListener(storageChangeListener);
  }, [onStorageChanged]);
}
