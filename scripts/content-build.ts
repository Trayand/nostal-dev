// npm run content:build
//
// Validates the bank, then bundles ONLY shippable items (status verified/published
// AND passing every check) into public/content/:
//   index.json      tracks + lightweight summaries of every question
//   <track>.json    full questions of one track, with markdown pre-rendered to HTML
// Failed items are listed in reports/build-report.md and never shipped.
import { createHash } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { Marked } from "marked";
import type { Question } from "../src/lib/content/schema";
import { isShippable, validateBank } from "../src/lib/content/validate";
import { formatResultsMarkdown, readContentFiles, readTracks, writeReport } from "./lib/content-files";
import { nodeExecutor } from "./lib/node-runner";

const OUT = "public/content";

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Raw HTML inside markdown is escaped: content is rendered as text, never as markup.
const marked = new Marked({
  gfm: true,
  renderer: {
    html({ text }) {
      return escapeHtml(text);
    },
  },
});
const md = (s: string) => marked.parse(s, { async: false });
const mdInline = (s: string) => marked.parseInline(s, { async: false });

function renderHtml(q: Question) {
  return {
    prompt: md(q.prompt),
    explanation: md(q.explanation),
    hints: q.hints.map(md),
    back: q.format === "flashcard" ? md(q.answer.back) : undefined,
    options: q.format === "multiple-choice" ? q.data.options.map(mdInline) : undefined,
  };
}

async function main() {
  const tracks = readTracks();
  const { files, broken } = readContentFiles();
  const results = [
    ...broken,
    ...(await validateBank(files, { trackIds: tracks.map((t) => t.id),
      trackLanguages: Object.fromEntries(tracks.map((t) => [t.id, t.language])), exec: nodeExecutor })),
  ];
  const shipped = results.filter(isShippable).map((r) => r.question!);
  const failed = results.filter((r) => !r.ok);

  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  const hash = createHash("sha256");
  const trackSummaries = [];
  for (const track of tracks) {
    const qs = shipped
      .filter((q) => q.track === track.id)
      .sort((a, b) => a.level - b.level || a.id.localeCompare(b.id));
    const bundle = qs.map((q) => ({ ...q, html: renderHtml(q) }));
    const json = JSON.stringify(bundle);
    hash.update(json);
    writeFileSync(`${OUT}/${track.id}.json`, json);
    const levels: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const q of qs) levels[q.level]++;
    trackSummaries.push({ ...track, count: qs.length, levels, topics: [...new Set(qs.map((q) => q.topic))].sort() });
  }

  const index = {
    version: hash.digest("hex").slice(0, 10),
    generatedAt: new Date().toISOString(),
    tracks: trackSummaries,
    questions: shipped.map((q) => ({
      id: q.id, track: q.track, level: q.level, format: q.format, topic: q.topic,
      tags: q.tags, title: q.title, estimatedMinutes: q.estimatedMinutes,
    })),
  };
  writeFileSync(`${OUT}/index.json`, JSON.stringify(index));

  const notShipped = results.filter((r) => r.ok && !isShippable(r));
  const report =
    formatResultsMarkdown("Content build report", results) +
    `\n## Shipped per track\n\n| Track | L1 | L2 | L3 | L4 | L5 | Total |\n|---|---|---|---|---|---|---|\n` +
    trackSummaries.map((t) => `| ${t.id} | ${[1, 2, 3, 4, 5].map((l) => t.levels[l]).join(" | ")} | ${t.count} |`).join("\n") +
    `\n\nPassing but not shipped (status draft): ${notShipped.length}\n`;
  const reportPath = writeReport("build-report.md", report);

  console.log(
    `content:build → ${shipped.length} shipped, ${failed.length} failed, ${notShipped.length} drafts held back (version ${index.version})`,
  );
  for (const t of trackSummaries) console.log(`  ${t.id.padEnd(11)} ${String(t.count).padStart(3)}  L1-5: ${[1, 2, 3, 4, 5].map((l) => t.levels[l]).join("/")}`);
  if (failed.length) console.log(`  ✗ ${failed.length} failing item(s) excluded — see ${reportPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
