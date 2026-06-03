import { useEffect } from "react";

export function useStorageSync(onChange: () => void): void {
  useEffect(() => {
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area !== "local") return;
      if (changes.cb_sessions || changes.cb_active) {
        onChange();
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [onChange]);
}
