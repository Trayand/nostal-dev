import { withBase } from "../base-path";
import type { Question, QuestionFormat } from "./schema";

// Loads the bundles written by `npm run content:build` (public/content/).
// They are static files, so the service worker serves them offline.

export interface QuestionHtml {
  prompt: string;
  explanation: string;
  hints: string[];
  back?: string;
  options?: string[];
}

export type BundledQuestion = Question & { html: QuestionHtml };

export interface QuestionSummary {
  id: string;
  track: string;
  level: number;
  format: QuestionFormat;
  topic: string;
  tags: string[];
  title: string;
  estimatedMinutes: number;
}

export interface TrackSummary {
  id: string;
  title: string;
  description: string;
  language: string;
  icon: string;
  count: number;
  levels: Record<number, number>;
  topics: string[];
}

export interface ContentIndex {
  version: string;
  generatedAt: string;
  tracks: TrackSummary[];
  questions: QuestionSummary[];
}

let indexPromise: Promise<ContentIndex> | null = null;
const trackCache = new Map<string, Promise<BundledQuestion[]>>();

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(withBase(path));
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

export function loadIndex(): Promise<ContentIndex> {
  if (!indexPromise) {
    indexPromise = fetchJson<ContentIndex>("/content/index.json").catch((e) => {
      indexPromise = null; // allow retry
      throw e;
    });
  }
  return indexPromise;
}

export function loadTrack(track: string): Promise<BundledQuestion[]> {
  let p = trackCache.get(track);
  if (!p) {
    p = fetchJson<BundledQuestion[]>(`/content/${track}.json`);
    trackCache.set(track, p);
    p.catch(() => trackCache.delete(track));
  }
  return p;
}

/** Loads full questions for the given ids (in the same order). */
export async function loadQuestions(ids: string[]): Promise<BundledQuestion[]> {
  const index = await loadIndex();
  const trackOf = new Map(index.questions.map((q) => [q.id, q.track]));
  const tracks = [...new Set(ids.map((id) => trackOf.get(id)).filter((t): t is string => !!t))];
  const all = (await Promise.all(tracks.map(loadTrack))).flat();
  const byId = new Map(all.map((q) => [q.id, q]));
  return ids.map((id) => byId.get(id)).filter((q): q is BundledQuestion => !!q);
}
