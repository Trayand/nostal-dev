// Reads content/**.json from disk for the validator, builder and reviewer.
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { ItemResult, SourceFile } from "../../src/lib/content/validate";

export const CONTENT_DIR = "content";
export const REPORTS_DIR = "reports";

export interface TrackMeta {
  id: string;
  title: string;
  description: string;
  language: string;
  icon: string;
}

export function readTracks(): TrackMeta[] {
  return JSON.parse(readFileSync(path.join(CONTENT_DIR, "tracks.json"), "utf8"));
}

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

/** All question files, plus results for files that are not valid JSON at all. */
export function readContentFiles(): { files: SourceFile[]; broken: ItemResult[] } {
  const files: SourceFile[] = [];
  const broken: ItemResult[] = [];
  for (const full of walk(CONTENT_DIR).sort()) {
    const rel = full.split(path.sep).join("/");
    if (!rel.endsWith(".json") || rel === `${CONTENT_DIR}/tracks.json`) continue;
    try {
      files.push({ path: rel, json: JSON.parse(readFileSync(full, "utf8")) });
    } catch (e) {
      broken.push({
        file: rel, index: -1, id: "(file)", status: "?", ok: false, executed: false,
        errors: [`invalid JSON: ${(e as Error).message}`], warnings: [],
      });
    }
  }
  return { files, broken };
}

/** Rewrites one field on items of a content file (used by --promote). */
export function setStatus(file: string, indexes: number[], status: string) {
  const items = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>[];
  for (const i of indexes) items[i].status = status;
  writeFileSync(file, `${JSON.stringify(items, null, 2)}\n`);
}

export function writeReport(name: string, content: string) {
  mkdirSync(REPORTS_DIR, { recursive: true });
  writeFileSync(path.join(REPORTS_DIR, name), content);
  return path.join(REPORTS_DIR, name);
}

export function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

export function formatResultsMarkdown(title: string, results: ItemResult[]): string {
  const failed = results.filter((r) => !r.ok);
  const warned = results.filter((r) => r.ok && r.warnings.length);
  const lines = [
    `# ${title}`,
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `- Items: ${results.length}`,
    `- Passed: ${results.length - failed.length}`,
    `- Failed: ${failed.length}`,
    `- With warnings: ${warned.length}`,
    "",
  ];
  if (failed.length) {
    lines.push("## Failed (never shipped)", "");
    for (const r of failed) {
      lines.push(`### \`${r.id}\` — ${r.file}${r.index >= 0 ? ` [${r.index}]` : ""} (status: ${r.status})`, "");
      for (const e of r.errors) lines.push(`- ${e.replace(/\n/g, "\n  ")}`);
      lines.push("");
    }
  }
  if (warned.length) {
    lines.push("## Warnings", "");
    for (const r of warned) lines.push(`- \`${r.id}\`: ${r.warnings.join("; ")}`);
    lines.push("");
  }
  return lines.join("\n");
}
