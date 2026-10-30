import { describe, expect, it } from "vitest";
import { normalizeOutput, runCodeTests, runSnippet } from "@/lib/runner/run";
import { nodeExecutor as exec } from "../scripts/lib/node-runner";

describe("JS sandbox", () => {
  it("formats console output like Node (single line)", async () => {
    const r = await runSnippet(exec, "javascript", "console.log([1, 'a', { b: null }], new Set([1]), 'raw')");
    expect(r.output).toBe("[ 1, 'a', { b: null } ] Set(1) { 1 } raw");
  });

  it("waits for timers and microtasks in order", async () => {
    const code = "setTimeout(() => console.log('timeout'), 0); Promise.resolve().then(() => console.log('micro')); console.log('sync');";
    expect((await runSnippet(exec, "javascript", code)).output).toBe("sync\nmicro\ntimeout");
  });

  it("reports thrown errors as an Uncaught line", async () => {
    const r = await runSnippet(exec, "javascript", "console.log(1); undefinedFn();");
    expect(r.output).toBe("1\nUncaught ReferenceError: undefinedFn is not defined");
  });

  it("runs TypeScript by stripping types", async () => {
    const r = await runSnippet(exec, "typescript", "const n: number = 2; interface A { x: string } console.log(n * 2);");
    expect(r.output).toBe("4");
  });

  it("runs function tests including async functions", async () => {
    const r = await runCodeTests(exec, {
      language: "javascript",
      code: "async function f(x) { return x * 2 }",
      entry: "f",
      tests: [{ input: [2], expected: 4 }, { input: [3], expected: 7 }],
    });
    expect(r.passed).toBe(false);
    expect(r.results.map((t) => t.passed)).toEqual([true, false]);
    expect(r.results[1].actual).toBe("6");
  });

  it("kills infinite loops with a timeout", async () => {
    const r = await runCodeTests(exec, { language: "javascript", code: "function f(){ for(;;){} }", entry: "f", tests: [{ input: [], expected: 1 }] });
    expect(r.passed).toBe(false);
    expect(r.error).toMatch(/Timeout/);
  });

  it("has no network access", async () => {
    const r = await runSnippet(exec, "javascript", "console.log(typeof fetch, typeof XMLHttpRequest, typeof WebSocket)");
    expect(r.output).toBe("undefined undefined undefined");
  });

  it("reports a missing entry function clearly", async () => {
    const r = await runCodeTests(exec, { language: "javascript", code: "function g(){}", entry: "f", tests: [{ input: [], expected: 1 }] });
    expect(r.error).toContain("`f` was not found");
  });
});

describe("SQL sandbox", () => {
  const schema = "CREATE TABLE t (name TEXT, v INTEGER);";
  const seed = "INSERT INTO t VALUES ('a', 1), ('b', 2), ('c', 3);";

  it("compares unordered result sets", async () => {
    const r = await runCodeTests(exec, {
      language: "sql", code: "SELECT name FROM t WHERE v >= 2", schema, seed,
      tests: [{ expected: { columns: ["name"], rows: [["c"], ["b"]] }, ordered: false }],
    });
    expect(r.passed).toBe(true);
  });

  it("enforces order when ordered is true", async () => {
    const r = await runCodeTests(exec, {
      language: "sql", code: "SELECT name FROM t ORDER BY v", schema, seed,
      tests: [{ expected: { columns: ["name"], rows: [["c"], ["b"], ["a"]] }, ordered: true }],
    });
    expect(r.passed).toBe(false);
  });

  it("applies per-test setup on a fresh database", async () => {
    const r = await runCodeTests(exec, {
      language: "sql", code: "SELECT COUNT(*) AS n FROM t", schema, seed,
      tests: [
        { setup: "DELETE FROM t;", expected: { columns: ["n"], rows: [[0]] }, ordered: false },
        { expected: { columns: ["n"], rows: [[3]] }, ordered: false },
      ],
    });
    expect(r.passed).toBe(true);
  });

  it("returns SQL errors per test", async () => {
    const r = await runCodeTests(exec, {
      language: "sql", code: "SELEC nope", schema, seed,
      tests: [{ expected: { columns: ["n"], rows: [] }, ordered: false }],
    });
    expect(r.passed).toBe(false);
    expect(r.results[0].error).toMatch(/syntax error/);
  });
});

describe("normalizeOutput", () => {
  it("ignores trailing spaces, CRLF and outer blank lines", () => {
    expect(normalizeOutput("\n a  \r\nb\t\n\n")).toBe(" a\nb");
  });
});
