import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { mergeExports } from "./merge";
import type {
  Attempt, CodeDraft, ExportFile, ImportMode, ProgressSnapshot,
  Settings, SrsCard, StorageAdapter, TrackState,
} from "./types";

interface HubDB extends DBSchema {
  attempts: { key: string; value: Attempt; indexes: { byAnsweredAt: string } };
  srs: { key: string; value: SrsCard };
  trackStates: { key: string; value: TrackState };
  settings: { key: string; value: Settings & { key: string } };
  drafts: { key: string; value: CodeDraft };
}

const DB_NAME = "programming-hub";
const DB_VERSION = 1;
const STORES = ["attempts", "srs", "trackStates", "settings", "drafts"] as const;

export class IndexedDbAdapter implements StorageAdapter {
  private dbPromise: Promise<IDBPDatabase<HubDB>>;

  constructor(name = DB_NAME) {
    this.dbPromise = openDB<HubDB>(name, DB_VERSION, {
      upgrade(db) {
        // Add new stores/indexes here with `if (oldVersion < N)` blocks when bumping DB_VERSION.
        const attempts = db.createObjectStore("attempts", { keyPath: "id" });
        attempts.createIndex("byAnsweredAt", "answeredAt");
        db.createObjectStore("srs", { keyPath: "questionId" });
        db.createObjectStore("trackStates", { keyPath: "track" });
        db.createObjectStore("settings", { keyPath: "key" });
        db.createObjectStore("drafts", { keyPath: "questionId" });
      },
    });
  }

  async getProgress(): Promise<ProgressSnapshot> {
    const [attempts, srs, trackStates] = await Promise.all([
      this.getAttempts(), this.getSrsCards(), this.getTrackStates(),
    ]);
    return { attempts, srs, trackStates };
  }

  async getAttempts() {
    return (await this.dbPromise).getAllFromIndex("attempts", "byAnsweredAt");
  }
  async saveAttempt(a: Attempt) {
    await (await this.dbPromise).put("attempts", a);
  }

  async getSrsCards() { return (await this.dbPromise).getAll("srs"); }
  async getSrsCard(id: string) { return (await this.dbPromise).get("srs", id); }
  async saveSrsCard(c: SrsCard) { await (await this.dbPromise).put("srs", c); }

  async getTrackStates() { return (await this.dbPromise).getAll("trackStates"); }
  async saveTrackState(s: TrackState) { await (await this.dbPromise).put("trackStates", s); }

  async getSettings(): Promise<Settings | null> {
    const row = await (await this.dbPromise).get("settings", "main");
    if (!row) return null;
    const { key: _key, ...settings } = row;
    return settings;
  }
  async saveSettings(s: Settings) {
    await (await this.dbPromise).put("settings", { ...s, key: "main" });
  }

  async getCodeDraft(id: string) { return (await this.dbPromise).get("drafts", id); }
  async saveCodeDraft(d: CodeDraft) { await (await this.dbPromise).put("drafts", d); }

  async exportAll(): Promise<ExportFile> {
    const db = await this.dbPromise;
    return {
      app: "programming-hub",
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      ...(await this.getProgress()),
      settings: await this.getSettings(),
      drafts: await db.getAll("drafts"),
    };
  }

  async importAll(file: ExportFile, mode: ImportMode) {
    const data = mode === "merge" ? mergeExports(await this.exportAll(), file) : file;
    const db = await this.dbPromise;
    // One transaction: either the whole import lands or nothing changes.
    const tx = db.transaction(STORES, "readwrite");
    await Promise.all(STORES.map((s) => tx.objectStore(s).clear()));
    for (const a of data.attempts) tx.objectStore("attempts").put(a);
    for (const c of data.srs) tx.objectStore("srs").put(c);
    for (const t of data.trackStates) tx.objectStore("trackStates").put(t);
    for (const d of data.drafts) tx.objectStore("drafts").put(d);
    if (data.settings) tx.objectStore("settings").put({ ...data.settings, key: "main" });
    await tx.done;
  }

  async resetAll() {
    const db = await this.dbPromise;
    const tx = db.transaction(STORES, "readwrite");
    await Promise.all(STORES.map((s) => tx.objectStore(s).clear()));
    await tx.done;
  }
}
