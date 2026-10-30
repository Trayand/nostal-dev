// npm run content:validate [-- --track <id>] [--file <path>] [--promote] [--no-exec]
//
// Validates every question in content/. Executable claims are run in the same
// sandbox as the app (public/workers/*). Writes reports/validation-report.md.
//   --track / --file   only execute matching items (duplicates are still checked bank-wide)
//   --promote          set status "verified" on draft items that pass
//   --no-exec          structure-only (fast)
// Exit code 1 when any selected item fails.
import { validateBank } from "../src/lib/content/validate";
import { argValue, formatResultsMarkdown, readContentFiles, readTracks, setStatus, writeReport } from "./lib/content-files";
import { nodeExecutor } from "./lib/node-runner";

async function main() {
  const track = argValue("--track");
  const file = argValue("--file")?.replace(/\\/g, "/");
  const promote = process.argv.includes("--promote");
  const noExec = process.argv.includes("--no-exec");
  const selected = (r: { file: string; question?: { track: string } }) =>
    (!track || r.question?.track === track) && (!file || r.file === file || r.file.endsWith(file));

  const { files, broken } = readContentFiles();
  const started = Date.now();
  const all = [
    ...broken,
    ...(await validateBank(files, {
      trackIds: readTracks().map((t) => t.id),
      exec: nodeExecutor,
      skipExecution: noExec,
      executeOnly: selected,
      onProgress: (done, total) => process.stdout.write(`\r  executing ${done}/${total}…`),
    })),
  ];
  process.stdout.write("\n");
  const results = all.filter((r) => r.index < 0 || selected(r));

  for (const r of results) {
    if (r.ok && !r.warnings.length) continue;
    const mark = r.ok ? "⚠" : "✗";
    console.log(`${mark} ${r.id}  (${r.file}${r.index >= 0 ? ` [${r.index}]` : ""}, ${r.status})`);
    for (const e of r.errors) console.log(`    error: ${e}`);
    for (const w of r.warnings) console.log(`    warn:  ${w}`);
  }

  const failed = results.filter((r) => !r.ok);
  const executed = results.filter((r) => r.executed && r.ok).length;
  console.log(
    `\n${results.length} items · ${results.length - failed.length} passed (${executed} proven by execution) · ${failed.length} failed · ${((Date.now() - started) / 1000).toFixed(1)}s`,
  );

  if (promote) {
    const byFile = new Map<string, number[]>();
    for (const r of results) {
      if (r.ok && r.status === "draft") byFile.set(r.file, [...(byFile.get(r.file) ?? []), r.index]);
    }
    let n = 0;
    for (const [f, idx] of byFile) {
      setStatus(f, idx, "verified");
      n += idx.length;
    }
    console.log(`Promoted ${n} draft item(s) to "verified".`);
  }

  const report = writeReport("validation-report.md", formatResultsMarkdown("Content validation report", results));
  console.log(`Report: ${report}`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
