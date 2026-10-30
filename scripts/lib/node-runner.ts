// Node implementation of the sandbox Executor. Runs public/workers/*.js — the
// exact files the app uses — inside worker_threads with a small shim that
// provides the Web Worker globals they expect (self, postMessage, onmessage).
import { Worker } from "node:worker_threads";
import path from "node:path";
import type { Executor, JsRequest, JsResponse, SqlRequest, SqlResponse } from "../../src/lib/runner/types";

const WORKERS = path.resolve(__dirname, "../../public/workers");
const SQL_JS = require.resolve("sql.js");

const BOOTSTRAP = [
  'const { parentPort, workerData } = require("worker_threads");',
  'const fs = require("fs");',
  'const vm = require("vm");',
  "globalThis.self = globalThis;",
  "self.postMessage = (m) => parentPort.postMessage(m);",
  "if (workerData.sqlJs) self.__loadSqlJs = () => require(workerData.sqlJs)();",
  'process.on("unhandledRejection", (r) => self.__onUnhandled && self.__onUnhandled(r));',
  'process.on("uncaughtException", (e) => self.__onUnhandled && self.__onUnhandled(e));',
  'vm.runInThisContext(fs.readFileSync(workerData.script, "utf8"), { filename: workerData.script });',
  'parentPort.on("message", (data) => self.onmessage({ data }));',
].join("\n");

function run<T>(script: string, message: unknown, timeoutMs: number, fallback: T, sqlJs?: string): Promise<T> {
  return new Promise((resolve) => {
    const worker = new Worker(BOOTSTRAP, {
      eval: true,
      workerData: { script: path.join(WORKERS, script), sqlJs },
      resourceLimits: { maxOldGenerationSizeMb: 256 },
    });
    const finish = (value: T) => {
      clearTimeout(timer);
      void worker.terminate();
      resolve(value);
    };
    const timer = setTimeout(() => finish({ ...fallback, error: `Timeout after ${timeoutMs} ms` }), timeoutMs);
    worker.on("message", (m: T) => finish(m));
    worker.on("error", (e) => finish({ ...fallback, error: e.message }));
    worker.postMessage(message);
  });
}

export const nodeExecutor: Executor = {
  js(req: JsRequest, timeoutMs: number) {
    return run<JsResponse>("js-runner.js", req, timeoutMs, { results: [], logs: [], output: "" });
  },
  sql(req: SqlRequest, timeoutMs: number) {
    return run<SqlResponse>("sql-runner.js", req, timeoutMs, { results: [] }, SQL_JS);
  },
};
