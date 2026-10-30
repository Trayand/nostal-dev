import { IndexedDbAdapter } from "./indexeddb";
import { MemoryAdapter } from "./memory";
import type { StorageAdapter } from "./types";

export type * from "./types";

let adapter: StorageAdapter | null = null;

/**
 * App-wide storage. To add sync in Phase 2, return a wrapper here
 * (e.g. `new SyncAdapter(new IndexedDbAdapter(), api)`) — UI code stays the same.
 */
export function getStorage(): StorageAdapter {
  if (!adapter) {
    adapter = typeof indexedDB !== "undefined" ? new IndexedDbAdapter() : new MemoryAdapter();
  }
  return adapter;
}

/** For tests only. */
export function setStorage(next: StorageAdapter) {
  adapter = next;
}
