import { normalizeOutput, runCodeTests, runSnippet, type RunLanguage } from "../runner/run";
import type { Executor, TestRun } from "../runner/types";
import type { Question } from "./schema";

// Execution checks for content. LLM-written questions can be wrong, so every
// claim that can be executed IS executed, in the same sandbox the app uses.

const RUNNABLE: string[] = ["javascript", "typescript"];

/** True when the validator can prove the answer by running code. */
export function isExecutionVerified(q: Question): boolean {
  switch (q.format) {
    case "code-short":
    case "code-full":
      return true;
    case "predict-output":
      return RUNNABLE.includes(q.data.language);
    case "fill-blank":
    case "parsons":
      return RUNNABLE.includes(q.data.language) && q.tests.length > 0;
    default:
      return false;
  }
}

export function fillTemplate(template: string, values: string[]): string {
  let i = 0;
  return template.replace(/\{\{blank\}\}/g, () => values[i++] ?? "");
}

function describeFailure(run: TestRun): string {
  if (run.error) return run.error;
  const bad = run.results.find((r) => !r.passed);
  if (!bad) return "no tests ran";
  if (bad.error) return `${bad.name}: ${bad.error}`;
  const show = (v: unknown) => (typeof v === "string" ? v : JSON.stringify(v));
  return `${bad.name}: expected ${show(bad.expected)}, got ${show(bad.actual)}`;
}

export async function verifyExecution(q: Question, exec: Executor): Promise<string[]> {
  const errors: string[] = [];

  if (q.format === "code-short" || q.format === "code-full") {
    const base = { language: q.data.language, entry: q.data.entry, tests: q.tests, schema: q.data.schema, seed: q.data.seed };
    const ref = await runCodeTests(exec, { ...base, code: q.referenceSolution });
    if (!ref.passed) errors.push(`referenceSolution fails its tests — ${describeFailure(ref)}`);
    const starter = await runCodeTests(exec, { ...base, code: q.data.starter });
    if (starter.passed) errors.push("starter code already passes all tests (question is trivial or tests are too weak)");
  }

  if (q.format === "predict-output" && RUNNABLE.includes(q.data.language)) {
    const run = await runSnippet(exec, q.data.language as RunLanguage, q.data.code);
    const actual = normalizeOutput(run.output);
    if (actual !== normalizeOutput(q.answer.output)) {
      errors.push(
        `answer.output does not match real output.\n    stored: ${JSON.stringify(q.answer.output)}\n    actual: ${JSON.stringify(actual)}`,
      );
    }
  }

  if ((q.format === "fill-blank" || q.format === "parsons") && isExecutionVerified(q)) {
    const code =
      q.format === "fill-blank"
        ? fillTemplate(q.data.template, q.answer.blanks.map((b) => b[0]))
        : q.answer.lines.join("\n");
    const run = await runCodeTests(exec, {
      language: q.data.language as RunLanguage,
      code,
      entry: q.data.entry,
      tests: q.tests,
    });
    if (!run.passed) errors.push(`the correct answer does not pass the tests — ${describeFailure(run)}`);
  }

  return errors;
}
