export * from "./types";
export * from "./contextStore";
export * from "./settings";
export * from "./sessionUtils";

export type StorageArea = "local" | "sync" | "session";

export async function get<T extends Record<string, unknown>>(
  keys?: string | string[] | null
): Promise<T> {
  return chrome.storage.local.get(keys) as Promise<T>;
}

export async function set(items: Record<string, unknown>): Promise<void> {
  await chrome.storage.local.set(items);
}

export async function remove(keys: string | string[]): Promise<void> {
  await chrome.storage.local.remove(keys);
}
