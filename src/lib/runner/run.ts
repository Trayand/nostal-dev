import type { JsTest, SqlTest } from "../content/schema";
import {
  DEFAULT_TIMEOUT_MS, SQL_TIMEOUT_MS,
  type Executor, type SnippetRun, type TestRun,
} from "./types";

// Shared by the app and the validator: prepares code (TS → JS) and turns raw
// worker responses into a TestRun. The Executor decides where the worker runs.

export type RunLanguage = "javascript" | "typescript" | "sql";

export interface CodeRunInput {
  language: RunLanguage;
  code: string;
  entry?: string;
  tests: (JsTest | SqlTest)[];
  schema?: string;
  seed?: string;
}

async function toJs(language: RunLanguage, code: string): Promise<string> {
  if (language !== "typescript") return code;
  // Loaded lazily: sucrase is only needed for TypeScript questions.
  const { transpileTs } = await import("./transpile");
  return transpileTs(code);
}

export async function runCodeTests(exec: Executor, input: CodeRunInput): Promise<TestRun> {
  if (input.language === "sql") {
    const res = await exec.sql(
      { schema: input.schema ?? "", seed: input.seed, query: input.code, tests: input.tests as SqlTest[] },
      SQL_TIMEOUT_MS,
    );
    const results = res.results ?? [];
    return {
      passed: !res.error && results.length > 0 && results.every((r) => r.passed),
      results,
      logs: [],
      error: res.error,
    };
  }

  let code: string;
  try {
    code = await toJs(input.language, input.code);
  } catch (e) {
    return { passed: false, results: [], logs: [], error: `SyntaxError: ${(e as Error).message}` };
  }
  const res = await exec.js(
    { kind: "tests", code, entry: input.entry ?? "", tests: input.tests as JsTest[] },
    DEFAULT_TIMEOUT_MS,
  );
  const results = res.results ?? [];
  return {
    passed: !res.error && results.length > 0 && results.every((r) => r.passed),
    results,
    logs: res.logs ?? [],
    error: res.error,
  };
}

export async function runSnippet(exec: Executor, language: RunLanguage, source: string): Promise<SnippetRun> {
  let code: string;
  try {
    code = await toJs(language, source);
  } catch (e) {
    return { output: "", error: `SyntaxError: ${(e as Error).message}` };
  }
  const res = await exec.js({ kind: "snippet", code }, DEFAULT_TIMEOUT_MS);
  const output = [res.output ?? "", res.error ? `Uncaught ${res.error}` : ""].filter(Boolean).join("\n");
  return { output, error: res.error };
}

/** Normalizes console output for comparison: unify newlines, trim line ends and outer blank lines. */
export function normalizeOutput(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.trimEnd())
    .join("\n")
    .replace(/^\n+|\n+$/g, "");
}
