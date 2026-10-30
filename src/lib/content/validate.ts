import { z } from "zod";
import type { Executor } from "../runner/types";
import { questionSchema, semanticErrors, type Question } from "./schema";
import { verifyExecution, isExecutionVerified } from "./verify";

// Validates the whole question bank. File reading lives in scripts/; this
// module only gets parsed JSON, so it is easy to unit test.

export interface SourceFile {
  /** Path relative to the repo root, using "/" (e.g. "content/javascript/l1/basics.json"). */
  path: string;
  json: unknown;
}

export interface ItemResult {
  file: string;
  index: number;
  id: string;
  status: string;
  ok: boolean;
  /** Proven by running code (vs. structure-only). */
  executed: boolean;
  errors: string[];
  warnings: string[];
  question?: Question;
}

export interface ValidateOptions {
  trackIds: string[];
  /** Track id → language from tracks.json. Executable formats need javascript/typescript/sql. */
  trackLanguages?: Record<string, string>;
  exec?: Executor;
  /** Skip running code (fast structural check). */
  skipExecution?: boolean;
  /** Limit execution to some items (others still get structural + duplicate checks). */
  executeOnly?: (r: ItemResult) => boolean;
  onProgress?: (done: number, total: number) => void;
}

const RUNNABLE_TRACK_LANGS = ["javascript", "typescript", "sql"];
const PATH_RE = /^content\/([^/]+)\/l([1-5])\/[^/]+\.json$/;

function titleTokens(title: string): Set<string> {
  return new Set(title.toLowerCase().replace(/[^a-z0-9À-ɏ ]+/g, " ").split(/\s+/).filter((w) => w.length > 2));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  return inter / (a.size + b.size - inter);
}

export async function validateBank(files: SourceFile[], opts: ValidateOptions): Promise<ItemResult[]> {
  const results: ItemResult[] = [];

  // 1. Shape + semantic checks per item.
  for (const file of files) {
    const items = Array.isArray(file.json) ? file.json : null;
    if (!items) {
      results.push({
        file: file.path, index: -1, id: "(file)", status: "?", ok: false, executed: false,
        errors: ["file must contain a JSON array of questions"], warnings: [],
      });
      continue;
    }
    const pathMatch = PATH_RE.exec(file.path);
    items.forEach((raw, index) => {
      const rawObj = (raw ?? {}) as Record<string, unknown>;
      const res: ItemResult = {
        file: file.path, index, id: String(rawObj.id ?? `(item ${index})`),
        status: String(rawObj.status ?? "?"), ok: true, executed: false, errors: [], warnings: [],
      };
      const parsed = questionSchema.safeParse(raw);
      if (!parsed.success) {
        res.errors.push(...z.prettifyError(parsed.error).split("\n").filter(Boolean));
      } else {
        const q = parsed.data;
        res.question = q;
        res.executed = isExecutionVerified(q);
        res.errors.push(...semanticErrors(q));
        if (!opts.trackIds.includes(q.track)) res.errors.push(`unknown track "${q.track}" (add it to content/tracks.json)`);
        const trackLang = opts.trackLanguages?.[q.track];
        if (trackLang && !RUNNABLE_TRACK_LANGS.includes(trackLang) && (q.format === "code-short" || q.format === "code-full")) {
          res.errors.push(`track "${q.track}" (language ${trackLang}) cannot use executable formats`);
        }
        if (!pathMatch) {
          res.errors.push("file must live in content/<track>/l<level>/<name>.json");
        } else if (pathMatch[1] !== q.track || Number(pathMatch[2]) !== q.level) {
          res.errors.push(`track/level (${q.track}/l${q.level}) does not match folder (${pathMatch[1]}/l${pathMatch[2]})`);
        }
        if (q.hints.length < 2 && q.format !== "flashcard") res.warnings.push("fewer than 2 hints");
      }
      results.push(res);
    });
  }

  // 2. Duplicate ids (error) and near-duplicate titles within a track (warning).
  const byId = new Map<string, ItemResult[]>();
  for (const r of results) if (r.question) byId.set(r.id, [...(byId.get(r.id) ?? []), r]);
  for (const [id, group] of byId) {
    if (group.length > 1) {
      for (const r of group) r.errors.push(`duplicate id "${id}" (also in ${group.filter((g) => g !== r).map((g) => g.file).join(", ")})`);
    }
  }
  const withQ = results.filter((r) => r.question);
  for (let i = 0; i < withQ.length; i++) {
    for (let j = i + 1; j < withQ.length; j++) {
      const a = withQ[i].question!, b = withQ[j].question!;
      if (a.track !== b.track || a.id === b.id) continue;
      const sim = jaccard(titleTokens(a.title), titleTokens(b.title));
      if (sim >= 0.75) {
        withQ[i].warnings.push(`near-duplicate title of "${b.id}" (${Math.round(sim * 100)}% similar)`);
        withQ[j].warnings.push(`near-duplicate title of "${a.id}" (${Math.round(sim * 100)}% similar)`);
      }
      // Short generic prompts ("What does this print?") are fine when the code differs.
      if (a.format === b.format && a.prompt.trim() === b.prompt.trim() && JSON.stringify(a.data) === JSON.stringify(b.data)) {
        withQ[i].errors.push(`same prompt and data as "${b.id}"`);
      }
    }
  }

  // 3. Execute everything executable (only items that passed the structural checks).
  if (!opts.skipExecution && opts.exec) {
    const exec = opts.exec;
    const runnable = results.filter(
      (r) => r.question && r.errors.length === 0 && r.executed && (opts.executeOnly?.(r) ?? true),
    );
    let done = 0;
    let next = 0;
    // A few runs in parallel: each one is an isolated worker.
    const workerLoop = async () => {
      while (next < runnable.length) {
        const r = runnable[next++];
        try {
          r.errors.push(...(await verifyExecution(r.question!, exec)));
        } catch (e) {
          r.errors.push(`execution crashed: ${(e as Error).message}`);
        }
        opts.onProgress?.(++done, runnable.length);
      }
    };
    await Promise.all(Array.from({ length: 4 }, workerLoop));
  }

  for (const r of results) r.ok = r.errors.length === 0;
  return results;
}

/** Items that may be bundled into the app. */
export function isShippable(r: ItemResult): boolean {
  return r.ok && (r.status === "verified" || r.status === "published");
}
