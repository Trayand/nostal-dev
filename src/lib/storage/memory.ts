import { mergeExports } from "./merge";
import type {
  Attempt, CodeDraft, ExportFile, ImportMode, ProgressSnapshot,
  Settings, SrsCard, StorageAdapter, TrackState,
} from "./types";

/** In-memory adapter: used by unit tests and as a fallback when IndexedDB is unavailable. */
export class MemoryAdapter implements StorageAdapter {
  private attempts = new Map<string, Attempt>();
  private srs = new Map<string, SrsCard>();
  private trackStates = new Map<string, TrackState>();
  private drafts = new Map<string, CodeDraft>();
  private settings: Settings | null = null;

  async getProgress(): Promise<ProgressSnapshot> {
    return {
      attempts: await this.getAttempts(),
      srs: await this.getSrsCards(),
      trackStates: await this.getTrackStates(),
    };
  }
  async getAttempts() {
    return [...this.attempts.values()].sort((a, b) => a.answeredAt.localeCompare(b.answeredAt));
  }
  async saveAttempt(a: Attempt) { this.attempts.set(a.id, a); }

  async getSrsCards() { return [...this.srs.values()]; }
  async getSrsCard(id: string) { return this.srs.get(id); }
  async saveSrsCard(c: SrsCard) { this.srs.set(c.questionId, c); }

  async getTrackStates() { return [...this.trackStates.values()]; }
  async saveTrackState(s: TrackState) { this.trackStates.set(s.track, s); }

  async getSettings() { return this.settings; }
  async saveSettings(s: Settings) { this.settings = s; }

  async getCodeDraft(id: string) { return this.drafts.get(id); }
  async saveCodeDraft(d: CodeDraft) { this.drafts.set(d.questionId, d); }

  async exportAll(): Promise<ExportFile> {
    return {
      app: "nostal-dev",
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      ...(await this.getProgress()),
      settings: this.settings,
      drafts: [...this.drafts.values()],
    };
  }

  async importAll(file: ExportFile, mode: ImportMode) {
    const data = mode === "merge" ? mergeExports(await this.exportAll(), file) : file;
    await this.resetAll();
    data.attempts.forEach((a) => this.attempts.set(a.id, a));
    data.srs.forEach((c) => this.srs.set(c.questionId, c));
    data.trackStates.forEach((t) => this.trackStates.set(t.track, t));
    data.drafts.forEach((d) => this.drafts.set(d.questionId, d));
    this.settings = data.settings;
  }

  async resetAll() {
    this.attempts.clear();
    this.srs.clear();
    this.trackStates.clear();
    this.drafts.clear();
    this.settings = null;
  }
}
