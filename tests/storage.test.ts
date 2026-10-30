import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { IndexedDbAdapter } from "@/lib/storage/indexeddb";
import { MemoryAdapter } from "@/lib/storage/memory";
import { parseExportFile } from "@/lib/storage/export-schema";
import type { Attempt, StorageAdapter } from "@/lib/storage/types";

const attempt = (id: string, answeredAt: string): Attempt => ({
  id, questionId: "q1", track: "javascript", level: 1, topic: "loops", format: "multiple-choice",
  correct: true, hintsUsed: 0, revealed: false, durationMs: 1000, answeredAt,
});

let dbCounter = 0;
const adapters: [string, () => StorageAdapter][] = [
  ["MemoryAdapter", () => new MemoryAdapter()],
  ["IndexedDbAdapter", () => new IndexedDbAdapter(`test-db-${dbCounter++}`)],
];

describe.each(adapters)("%s", (_name, make) => {
  it("saves and lists attempts in time order", async () => {
    const s = make();
    await s.saveAttempt(attempt("b", "2026-01-02T00:00:00Z"));
    await s.saveAttempt(attempt("a", "2026-01-01T00:00:00Z"));
    expect((await s.getAttempts()).map((a) => a.id)).toEqual(["a", "b"]);
  });

  it("round-trips export → replace import", async () => {
    const s = make();
    await s.saveAttempt(attempt("a", "2026-01-01T00:00:00Z"));
    await s.saveTrackState({ track: "javascript", level: 2, updatedAt: "2026-01-01T00:00:00Z" });
    await s.saveSettings({ theme: "light", lang: "en", dailyGoalMinutes: 20, updatedAt: "2026-01-01T00:00:00Z" });
    const file = parseExportFile(JSON.parse(JSON.stringify(await s.exportAll())));

    const t = make();
    await t.saveAttempt(attempt("other", "2026-02-01T00:00:00Z"));
    await t.importAll(file, "replace");
    expect((await t.getAttempts()).map((a) => a.id)).toEqual(["a"]);
    expect((await t.getTrackStates())[0].level).toBe(2);
    expect((await t.getSettings())?.theme).toBe("light");
  });

  it("merge import unions attempts and keeps the newest records", async () => {
    const s = make();
    await s.saveAttempt(attempt("local", "2026-01-01T00:00:00Z"));
    await s.saveTrackState({ track: "javascript", level: 3, updatedAt: "2026-03-01T00:00:00Z" });
    const incoming = await make().exportAll();
    incoming.attempts = [attempt("remote", "2026-01-05T00:00:00Z")];
    incoming.trackStates = [
      { track: "javascript", level: 2, updatedAt: "2026-02-01T00:00:00Z" }, // older → loses
      { track: "sql", level: 2, updatedAt: "2026-02-01T00:00:00Z" },
    ];
    await s.importAll(incoming, "merge");
    expect((await s.getAttempts()).map((a) => a.id)).toEqual(["local", "remote"]);
    const states = Object.fromEntries((await s.getTrackStates()).map((t) => [t.track, t.level]));
    expect(states).toEqual({ javascript: 3, sql: 2 });
  });

  it("resetAll clears everything", async () => {
    const s = make();
    await s.saveAttempt(attempt("a", "2026-01-01T00:00:00Z"));
    await s.saveCodeDraft({ questionId: "q1", code: "x", updatedAt: "2026-01-01T00:00:00Z" });
    await s.resetAll();
    expect(await s.getAttempts()).toEqual([]);
    expect(await s.getCodeDraft("q1")).toBeUndefined();
  });
});

describe("parseExportFile", () => {
  it("accepts backups made under the old app name", async () => {
    const legacy = { ...(await new MemoryAdapter().exportAll()), app: "programming-hub" };
    expect(parseExportFile(legacy).app).toBe("nostal-dev");
  });

  it("rejects files from other apps", () => {
    expect(() => parseExportFile({ app: "something-else" })).toThrow();
  });
});
