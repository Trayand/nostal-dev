import type { ExportFile } from "./types";

/** Keep whichever record has the newest `updatedAt` (last-write-wins). */
function lww<T extends { updatedAt: string }>(
  a: T[],
  b: T[],
  key: (item: T) => string,
): T[] {
  const map = new Map<string, T>();
  for (const item of [...a, ...b]) {
    const prev = map.get(key(item));
    if (!prev || item.updatedAt > prev.updatedAt) map.set(key(item), item);
  }
  return [...map.values()];
}

/**
 * Merge two exports. Attempts are append-only, so they are unioned by id.
 * Everything else is last-write-wins. The same rule is the planned conflict
 * strategy for Phase 2 sync (see docs/ARCHITECTURE.md).
 */
export function mergeExports(current: ExportFile, incoming: ExportFile): ExportFile {
  const attempts = new Map(current.attempts.map((a) => [a.id, a]));
  for (const a of incoming.attempts) attempts.set(a.id, a);

  let settings = current.settings;
  if (incoming.settings && (!settings || incoming.settings.updatedAt > settings.updatedAt)) {
    settings = incoming.settings;
  }

  return {
    ...current,
    exportedAt: new Date().toISOString(),
    attempts: [...attempts.values()].sort((x, y) => x.answeredAt.localeCompare(y.answeredAt)),
    srs: lww(current.srs, incoming.srs, (c) => c.questionId),
    trackStates: lww(current.trackStates, incoming.trackStates, (t) => t.track),
    drafts: lww(current.drafts, incoming.drafts, (d) => d.questionId),
    settings,
  };
}
