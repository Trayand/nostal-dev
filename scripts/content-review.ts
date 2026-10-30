// npm run content:review [-- --track <id>] [--status draft|verified] [--all]
//
// Items that cannot be proven by running code (Go, concepts, find-bug,
// multiple-choice, non-JS predict-output...) are printed as a checklist in
// reports/review-checklist.md for a manual or second-pass LLM review.
// By default only items without a `reviewed` stamp are listed; --all lists every one.
import type { Question } from "../src/lib/content/schema";
import { validateBank } from "../src/lib/content/validate";
import { argValue, readContentFiles, readTracks, writeReport } from "./lib/content-files";

function block(code: string, lang = "") {
  return ["```" + lang, code, "```"].join("\n");
}

function answerText(q: Question): string {
  switch (q.format) {
    case "multiple-choice":
      return q.data.options.map((o, i) => `${i === q.answer.index ? "**✔**" : "◻"} ${o}`).join("  \n");
    case "predict-output":
      return block(q.answer.output);
    case "find-bug":
      return `Line ${q.answer.line}${q.answer.fixedLine ? ` → \`${q.answer.fixedLine}\`` : ""}`;
    case "fill-blank":
      return q.answer.blanks.map((b, i) => `${i + 1}. ${b.map((x) => `\`${x}\``).join(" / ")}`).join("  \n");
    case "parsons":
      return block(q.answer.lines.join("\n"));
    case "flashcard":
      return q.answer.back;
    case "desktop":
      return q.referenceSolution ? block(q.referenceSolution) : "(no reference solution)";
    default:
      return "";
  }
}

function codeOf(q: Question): string | undefined {
  if ("code" in q.data && typeof q.data.code === "string") return q.data.code;
  if (q.format === "fill-blank") return q.data.template;
  if (q.format === "desktop") return q.data.files.map((f) => `// ${f.path} (${f.kind})\n${f.content}`).join("\n\n");
  return undefined;
}

async function main() {
  const track = argValue("--track");
  const status = argValue("--status");
  const all = process.argv.includes("--all");
  const { files } = readContentFiles();
  const results = await validateBank(files, { trackIds: readTracks().map((t) => t.id),
      trackLanguages: Object.fromEntries(readTracks().map((t) => [t.id, t.language])), skipExecution: true });

  const items = results
    .filter((r) => r.question && !r.executed)
    .map((r) => ({ r, q: r.question! }))
    .filter(({ q }) => (!track || q.track === track) && (!status || q.status === status) && (all || !q.reviewed));

  const out = [
    "# Review checklist (non-executable items)",
    "",
    `Generated: ${new Date().toISOString()} · ${items.length} item(s)`,
    "",
    "Check each item for: factual correctness, exactly one correct answer, clear wording,",
    "explanation matches the answer, level/topic fit. When an item is OK, add",
    '`"reviewed": { "by": "<name or model>", "date": "YYYY-MM-DD" }` to it.',
    "",
  ];
  for (const { r, q } of items) {
    const code = codeOf(q);
    out.push(
      `## [ ] \`${q.id}\` — ${q.title}`,
      "",
      `${q.track} · L${q.level} · ${q.format} · topic: ${q.topic} · status: ${q.status} · ${r.file}`,
      "",
      "**Prompt**",
      "",
      q.prompt,
      "",
      ...(code ? [block(code, "data" in q && "language" in q.data ? String(q.data.language) : ""), ""] : []),
      "**Answer**",
      "",
      answerText(q),
      "",
      "**Explanation**",
      "",
      q.explanation,
      "",
      ...(r.errors.length ? [`> ✗ structural errors: ${r.errors.join("; ")}`, ""] : []),
      "---",
      "",
    );
  }
  const path = writeReport("review-checklist.md", out.join("\n"));
  const byTrack = new Map<string, number>();
  for (const { q } of items) byTrack.set(q.track, (byTrack.get(q.track) ?? 0) + 1);
  console.log(`${items.length} item(s) to review → ${path}`);
  for (const [t, n] of byTrack) console.log(`  ${t}: ${n}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
