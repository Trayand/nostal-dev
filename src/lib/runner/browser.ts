import { withBase } from "../base-path";
import type { Executor, JsRequest, JsResponse, SqlRequest, SqlResponse } from "./types";

/**
 * Starts a fresh Web Worker per run and kills it on timeout. A fresh worker
 * means no state leaks between runs and an infinite loop can always be stopped.
 */
function runInWorker<T>(script: string, message: unknown, timeoutMs: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const worker = new Worker(withBase(script));
    const finish = (value: T) => {
      clearTimeout(timer);
      worker.terminate();
      resolve(value);
    };
    const timer = setTimeout(
      () => finish({ ...fallback, error: `Timeout: kode berjalan lebih dari ${timeoutMs / 1000} detik (infinite loop?)` }),
      timeoutMs,
    );
    worker.onmessage = (e: MessageEvent<T>) => finish(e.data);
    worker.onerror = (e) => finish({ ...fallback, error: e.message || "Worker error" });
    worker.postMessage(message);
  });
}

export const browserExecutor: Executor = {
  js(req: JsRequest, timeoutMs: number) {
    return runInWorker<JsResponse>("/workers/js-runner.js", req, timeoutMs, { results: [], logs: [], output: "" });
  },
  sql(req: SqlRequest, timeoutMs: number) {
    return runInWorker<SqlResponse>("/workers/sql-runner.js", req, timeoutMs, { results: [] });
  },
};
