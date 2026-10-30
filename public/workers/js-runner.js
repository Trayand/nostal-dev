/* JavaScript sandbox runner.
 *
 * The SAME file runs in two places:
 *   - the app: as a Web Worker (src/lib/runner/browser.ts)
 *   - the validator: inside a Node worker_thread (scripts/lib/node-runner.ts)
 * so content is verified with exactly the code the learner's answer runs in.
 * TypeScript is transpiled to JS (sucrase) before it is sent here.
 *
 * Protocol (postMessage):
 *   { kind: "tests", code, entry, tests: [{ name?, input: [...], expected }] }
 *     → { results: [{ name, passed, input, expected, actual, error? }], logs, error? }
 *   { kind: "snippet", code }
 *     → { output, logs, error? }
 *
 * Safety: workers have no DOM. Network/storage APIs are removed below.
 * Infinite loops are handled by the caller, which terminates the worker on timeout.
 */
"use strict";

(function lockDown() {
  const blocked = [
    "fetch", "XMLHttpRequest", "WebSocket", "EventSource", "importScripts",
    "indexedDB", "caches", "BroadcastChannel", "Worker", "SharedWorker", "WebTransport",
  ];
  for (const name of blocked) {
    try {
      Object.defineProperty(self, name, { value: undefined, writable: false, configurable: false });
    } catch (_) {
      /* not present in this environment */
    }
  }
})();

const send = self.postMessage.bind(self);
const MAX_LOG_LINES = 200;

// ---------- value formatting (single-line, Node-like) ----------
// Arrays: [ 1, 2 ]  Objects: { a: 1, b: 'x' }  Map(1) { 'k' => 1 }  Set(2) { 1, 2 }
// Top-level strings print raw (like console.log); nested strings are quoted.

function inspect(value, depth, top, seen) {
  seen = seen || new Set();
  switch (typeof value) {
    case "string":
      return top ? value : "'" + value.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n") + "'";
    case "number":
      return Object.is(value, -0) ? "-0" : String(value);
    case "bigint":
      return value + "n";
    case "boolean":
    case "undefined":
      return String(value);
    case "symbol":
      return value.toString();
    case "function": {
      const src = Function.prototype.toString.call(value);
      if (src.startsWith("class")) return "[class " + (value.name || "(anonymous)") + "]";
      return value.name ? "[Function: " + value.name + "]" : "[Function (anonymous)]";
    }
  }
  if (value === null) return "null";
  if (seen.has(value)) return "[Circular]";
  if (value instanceof Date) return isNaN(value) ? "Invalid Date" : value.toISOString();
  if (value instanceof RegExp) return String(value);
  if (value instanceof Error) return value.name + ": " + value.message;
  if (typeof Promise !== "undefined" && value instanceof Promise) return "Promise { <pending> }";

  const next = (v) => inspect(v, depth + 1, false, seen);
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      if (value.length === 0) return "[]";
      if (depth >= 2) return "[Array]";
      const items = [];
      for (let i = 0; i < value.length; i++) items.push(i in value ? next(value[i]) : "<empty>");
      return "[ " + items.join(", ") + " ]";
    }
    if (value instanceof Map) {
      if (value.size === 0) return "Map(0) {}";
      if (depth >= 2) return "[Map]";
      const items = [...value].map(([k, v]) => next(k) + " => " + next(v));
      return "Map(" + value.size + ") { " + items.join(", ") + " }";
    }
    if (value instanceof Set) {
      if (value.size === 0) return "Set(0) {}";
      if (depth >= 2) return "[Set]";
      return "Set(" + value.size + ") { " + [...value].map(next).join(", ") + " }";
    }
    const proto = Object.getPrototypeOf(value);
    const ctor = proto && proto.constructor && proto.constructor.name;
    const prefix = proto === null ? "[Object: null prototype] " : ctor && ctor !== "Object" ? ctor + " " : "";
    const keys = Object.keys(value);
    if (keys.length === 0) return prefix + "{}";
    if (depth >= 2) return ctor && ctor !== "Object" ? "[" + ctor + "]" : "[Object]";
    const items = keys.map((k) => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : "'" + k + "'") + ": " + next(value[k]));
    return prefix + "{ " + items.join(", ") + " }";
  } finally {
    seen.delete(value);
  }
}

function formatArgs(args) {
  return args.map((a) => inspect(a, 0, true)).join(" ");
}

function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) < 1e-9;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  if (a instanceof Map || a instanceof Set || b instanceof Map || b instanceof Set) return false;
  // JSON (where expected values come from) has no `undefined`, so ignore undefined-valued keys.
  const ka = Object.keys(a).filter((k) => a[k] !== undefined).sort();
  const kb = Object.keys(b).filter((k) => b[k] !== undefined).sort();
  return ka.length === kb.length && ka.every((k, i) => k === kb[i] && deepEqual(a[k], b[k]));
}

// ---------- sandbox environment for user code ----------

function createEnv() {
  const logs = [];
  const push = (prefix) => (...args) => {
    if (logs.length < MAX_LOG_LINES) logs.push(prefix + formatArgs(args));
  };
  const sandboxConsole = {
    log: push(""), info: push(""), debug: push(""), warn: push(""), error: push(""),
    table: push(""), dir: push(""),
  };

  // Timers are tracked so async snippets (setTimeout, promises) can finish
  // before output is collected.
  let pending = 0;
  const live = new Set();
  const realSetTimeout = setTimeout;
  const asyncErrors = [];
  const guard = (fn, args) => {
    try {
      fn(...args);
    } catch (e) {
      asyncErrors.push(e);
    }
  };
  const env = {
    console: sandboxConsole,
    setTimeout(fn, ms, ...args) {
      pending++;
      const id = realSetTimeout(() => {
        if (live.delete(id)) pending--;
        guard(fn, args);
      }, ms);
      live.add(id);
      return id;
    },
    clearTimeout(id) {
      if (live.delete(id)) pending--;
      clearTimeout(id);
    },
    setInterval(fn, ms, ...args) {
      pending++;
      const id = setInterval(() => guard(fn, args), ms);
      live.add(id);
      return id;
    },
    clearInterval(id) {
      if (live.delete(id)) pending--;
      clearInterval(id);
    },
  };

  async function settle() {
    // Let microtasks and tracked timers run until nothing is pending.
    for (let i = 0; i < 2; i++) await new Promise((r) => realSetTimeout(r, 0));
    while (pending > 0) await new Promise((r) => realSetTimeout(r, 5));
    await new Promise((r) => realSetTimeout(r, 0));
  }

  return { env, logs, settle, asyncErrors };
}

function compile(code, env, returnExpr) {
  const names = Object.keys(env);
  const body = code + "\n;return " + (returnExpr || "undefined") + ";";
  // eslint-disable-next-line no-new-func
  const fn = new Function(...names, body);
  return () => fn(...names.map((n) => env[n]));
}

function errorText(e) {
  if (e && typeof e === "object" && "message" in e) return (e.name || "Error") + ": " + e.message;
  return "Uncaught " + inspect(e, 0, false);
}

// Unhandled promise rejections from user code end up here (Node shim forwards them too).
let onUnhandled = null;
self.__onUnhandled = (reason) => onUnhandled && onUnhandled(reason);
if (typeof self.addEventListener === "function") {
  self.addEventListener("unhandledrejection", (ev) => {
    ev.preventDefault();
    self.__onUnhandled(ev.reason);
  });
}

async function runSnippet({ code }) {
  const { env, logs, settle, asyncErrors } = createEnv();
  onUnhandled = (r) => asyncErrors.push(r);
  let error;
  try {
    compile(code, env)();
    await settle();
  } catch (e) {
    error = errorText(e);
  }
  if (!error && asyncErrors.length) error = errorText(asyncErrors[0]);
  return { output: logs.join("\n"), logs, error };
}

async function runTests({ code, entry, tests }) {
  const { env, logs, settle } = createEnv();
  if (!/^[A-Za-z_$][\w$]*$/.test(entry || "")) return { results: [], logs, error: "Invalid entry name" };
  let fn;
  try {
    fn = compile(code, env, "typeof " + entry + ' !== "undefined" ? ' + entry + " : undefined")();
  } catch (e) {
    return { results: [], logs, error: errorText(e) };
  }
  if (typeof fn !== "function") {
    return { results: [], logs, error: "Function `" + entry + "` was not found. Keep its name unchanged." };
  }
  const results = [];
  for (let i = 0; i < tests.length; i++) {
    const t = tests[i];
    const input = structuredClone(t.input);
    const shown = t.input.map((v) => inspect(v, 0, false)).join(", ");
    try {
      let actual = fn(...input);
      if (actual && typeof actual.then === "function") actual = await actual;
      results.push({
        name: t.name || "test " + (i + 1),
        passed: deepEqual(actual, t.expected),
        input: shown,
        expected: inspect(t.expected, 0, false),
        actual: inspect(actual, 0, false),
      });
    } catch (e) {
      results.push({
        name: t.name || "test " + (i + 1),
        passed: false,
        input: shown,
        expected: inspect(t.expected, 0, false),
        actual: "",
        error: errorText(e),
      });
    }
  }
  await settle();
  return { results, logs };
}

self.onmessage = async (event) => {
  const msg = event.data;
  try {
    send(msg.kind === "snippet" ? await runSnippet(msg) : await runTests(msg));
  } catch (e) {
    send({ results: [], logs: [], output: "", error: errorText(e) });
  }
};
