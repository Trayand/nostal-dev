import type { SqlTable, TestRun } from "@/lib/runner/types";
import { useApp } from "../AppProvider";

function Table({ table }: { table: SqlTable }) {
  if (!table.columns.length) return <p className="text-sm text-muted">(0 kolom)</p>;
  return (
    <div className="overflow-x-auto">
      <table className="border-collapse font-mono text-xs">
        <thead>
          <tr>{table.columns.map((c, i) => <th key={i} className="border border-border px-2 py-1 text-left">{c}</th>)}</tr>
        </thead>
        <tbody>
          {table.rows.map((r, i) => (
            <tr key={i}>{r.map((v, j) => <td key={j} className="border border-border px-2 py-1">{v === null ? "NULL" : String(v)}</td>)}</tr>
          ))}
        </tbody>
      </table>
      {table.rows.length === 0 && <p className="text-xs text-muted">(0 baris)</p>}
    </div>
  );
}

function Value({ v }: { v: string | SqlTable | null }) {
  if (v === null) return <span className="text-muted">—</span>;
  if (typeof v === "string") return <code className="font-mono text-xs break-all whitespace-pre-wrap">{v}</code>;
  return <Table table={v} />;
}

export function TestResults({ run }: { run: TestRun }) {
  const { t } = useApp();
  const passed = run.results.filter((r) => r.passed).length;
  return (
    <section aria-live="polite" className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3">
      <h3 className="font-semibold">
        {t("q.tests")}: {passed}/{run.results.length} {t("q.passed")}
      </h3>
      {run.error && (
        <pre className="overflow-x-auto rounded-lg bg-bad-bg p-2 font-mono text-xs whitespace-pre-wrap text-bad">{run.error}</pre>
      )}
      <ul className="flex flex-col gap-2">
        {run.results.map((r, i) => (
          <li key={i} className={`rounded-lg border p-2 text-sm ${r.passed ? "border-ok/50" : "border-bad/60 bg-bad-bg/40"}`}>
            <p className="font-medium">
              <span aria-hidden="true">{r.passed ? "✓" : "✗"}</span> {r.name}
              {r.input !== undefined && <code className="ml-2 font-mono text-xs text-muted">({r.input})</code>}
            </p>
            {!r.passed && (
              <div className="mt-1 grid gap-1">
                {r.error ? (
                  <p className="font-mono text-xs text-bad">{r.error}</p>
                ) : (
                  <>
                    <div><span className="text-xs text-muted">{t("q.expected")}: </span><Value v={r.expected} /></div>
                    <div><span className="text-xs text-muted">{t("q.got")}: </span><Value v={r.actual} /></div>
                  </>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
      {run.logs.length > 0 && (
        <details>
          <summary className="min-h-11 cursor-pointer py-2 text-sm text-muted">{t("q.logs")} ({run.logs.length})</summary>
          <pre className="overflow-x-auto rounded-lg bg-surface-2 p-2 font-mono text-xs">{run.logs.join("\n")}</pre>
        </details>
      )}
    </section>
  );
}
