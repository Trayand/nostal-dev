import type { JsTest, SqlTest } from "../content/schema";

export interface SqlTable {
  columns: string[];
  rows: unknown[][];
}

export interface TestResult {
  name: string;
  passed: boolean;
  /** JS/TS: formatted arguments. */
  input?: string;
  /** JS/TS: formatted value. SQL: result table. */
  expected: string | SqlTable;
  actual: string | SqlTable | null;
  error?: string;
}

export interface TestRun {
  passed: boolean;
  results: TestResult[];
  logs: string[];
  error?: string;
}

export interface SnippetRun {
  /** Console output, plus a final "Uncaught ..." line if the snippet threw. */
  output: string;
  error?: string;
}

// Raw messages exchanged with public/workers/*.js
export type JsRequest =
  | { kind: "tests"; code: string; entry: string; tests: JsTest[] }
  | { kind: "snippet"; code: string };

export interface JsResponse {
  results?: TestResult[];
  logs?: string[];
  output?: string;
  error?: string;
}

export interface SqlRequest {
  schema: string;
  seed?: string;
  query: string;
  tests: SqlTest[];
}

export interface SqlResponse {
  results: TestResult[];
  error?: string;
}

/** Runs a worker script with a timeout. Browser: Web Worker. Node: worker_threads. */
export interface Executor {
  js(req: JsRequest, timeoutMs: number): Promise<JsResponse>;
  sql(req: SqlRequest, timeoutMs: number): Promise<SqlResponse>;
}

export const DEFAULT_TIMEOUT_MS = 3000;
export const SQL_TIMEOUT_MS = 8000;
