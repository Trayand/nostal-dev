// Data records persisted on the device.
// Every mutable record carries `updatedAt` (ISO string) so a future sync
// backend (Phase 2) can merge with last-write-wins. Attempts are append-only.

export interface Attempt {
  id: string;
  questionId: string;
  track: string;
  level: number;
  topic: string;
  format: string;
  correct: boolean;
  hintsUsed: number;
  /** User pressed "show solution" — always stored as incorrect. */
  revealed: boolean;
  durationMs: number;
  answeredAt: string;
  sessionId?: string;
}

/** Spaced-repetition state for one question (SM-2 simplified). */
export interface SrsCard {
  questionId: string;
  track: string;
  ease: number;
  intervalDays: number;
  reps: number;
  lapses: number;
  /** Local date `YYYY-MM-DD` when the card is due again. */
  due: string;
  lastReviewed: string;
  updatedAt: string;
}

export interface TrackState {
  track: string;
  level: number;
  updatedAt: string;
}

export type Theme = "dark" | "light" | "system";
export type Lang = "id" | "en";

export interface Settings {
  theme: Theme;
  lang: Lang;
  dailyGoalMinutes: number;
  updatedAt: string;
}

export interface CodeDraft {
  questionId: string;
  code: string;
  updatedAt: string;
}

export interface ProgressSnapshot {
  attempts: Attempt[];
  srs: SrsCard[];
  trackStates: TrackState[];
}

export interface ExportFile extends ProgressSnapshot {
  app: "programming-hub";
  schemaVersion: 1;
  exportedAt: string;
  settings: Settings | null;
  drafts: CodeDraft[];
}

export type ImportMode = "merge" | "replace";

/**
 * The only way UI code touches persisted data.
 * Phase 1: IndexedDB. Phase 2: a SyncAdapter can wrap IndexedDB and push/pull
 * to a backend without any UI change.
 */
export interface StorageAdapter {
  getProgress(): Promise<ProgressSnapshot>;
  getAttempts(): Promise<Attempt[]>;
  saveAttempt(attempt: Attempt): Promise<void>;

  getSrsCards(): Promise<SrsCard[]>;
  getSrsCard(questionId: string): Promise<SrsCard | undefined>;
  saveSrsCard(card: SrsCard): Promise<void>;

  getTrackStates(): Promise<TrackState[]>;
  saveTrackState(state: TrackState): Promise<void>;

  getSettings(): Promise<Settings | null>;
  saveSettings(settings: Settings): Promise<void>;

  getCodeDraft(questionId: string): Promise<CodeDraft | undefined>;
  saveCodeDraft(draft: CodeDraft): Promise<void>;

  exportAll(): Promise<ExportFile>;
  importAll(file: ExportFile, mode: ImportMode): Promise<void>;
  resetAll(): Promise<void>;
}
