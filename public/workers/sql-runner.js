/* SQL sandbox runner (SQLite compiled to WebAssembly via sql.js).
 *
 * Same file for the app (Web Worker) and the validator (Node worker_thread).
 * Every test gets a fresh in-memory database: schema → seed → test setup → query.
 *
 * Protocol:
 *   { schema, seed, query, tests: [{ name?, setup?, expected: { columns, rows }, ordered }] }
 *     → { results: [{ name, passed, expected, actual, error? }], error? }
 */
"use strict";

let sqlPromise = null;

function loadSql() {
  if (!sqlPromise) {
    // The Node validator injects its own loader; in the browser we load the
    // static copy in public/sqljs/ (copied there by scripts/copy-assets.ts).
    sqlPromise = self.__loadSqlJs
      ? self.__loadSqlJs()
      : (importScripts("../sqljs/sql-wasm.js"),
        self.initSqlJs({ locateFile: (file) => new URL("../sqljs/" + file, self.location.href).href }));
    sqlPromise.then(() => {
      // sql.js is loaded; user queries never need the network.
      for (const name of ["fetch", "XMLHttpRequest", "WebSocket", "importScripts"]) {
        try {
          Object.defineProperty(self, name, { value: undefined, writable: false, configurable: false });
        } catch (_) {
          /* ignore */
        }
      }
    });
  }
  return sqlPromise;
}

function normalizeValue(v) {
  if (typeof v === "number") return Math.round(v * 1e6) / 1e6;
  if (v instanceof Uint8Array) return "x'" + Array.from(v, (b) => b.toString(16).padStart(2, "0")).join("") + "'";
  return v;
}

function normalize(resultSet, ordered) {
  const columns = resultSet.columns.map((c) => String(c).trim().toLowerCase());
  let rows = resultSet.rows.map((r) => r.map(normalizeValue));
  if (!ordered) rows = rows.map((r) => [JSON.stringify(r), r]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).map((x) => x[1]);
  return { columns, rows };
}

function sameResult(actual, expected, ordered) {
  const a = normalize(actual, ordered);
  const e = normalize(expected, ordered);
  return JSON.stringify(a) === JSON.stringify(e);
}

function runQuery(SQL, { schema, seed, setup, query }) {
  const db = new SQL.Database();
  try {
    db.run(schema || "");
    if (seed) db.run(seed);
    if (setup) db.run(setup);
    // Step through statements one by one (unlike db.exec, this keeps column
    // names when a SELECT returns zero rows). The last statement that has
    // columns is the result, so learners may write helper statements first.
    let last = { columns: [], rows: [] };
    for (const stmt of db.iterateStatements(query || "")) {
      try {
        const columns = stmt.getColumnNames();
        const rows = [];
        while (stmt.step()) rows.push(stmt.get());
        if (columns.length) last = { columns, rows };
      } finally {
        stmt.free();
      }
    }
    return last;
  } finally {
    db.close();
  }
}

async function runTests({ schema, seed, query, tests }) {
  const SQL = await loadSql();
  const results = tests.map((t, i) => {
    const name = t.name || "test " + (i + 1);
    try {
      const actual = runQuery(SQL, { schema, seed, setup: t.setup, query });
      return {
        name,
        passed: sameResult(actual, t.expected, !!t.ordered),
        expected: t.expected,
        actual: { columns: actual.columns, rows: actual.rows.slice(0, 50) },
      };
    } catch (e) {
      return { name, passed: false, expected: t.expected, actual: null, error: String((e && e.message) || e) };
    }
  });
  return { results };
}

self.onmessage = async (event) => {
  try {
    self.postMessage(await runTests(event.data));
  } catch (e) {
    self.postMessage({ results: [], error: String((e && e.message) || e) });
  }
};
