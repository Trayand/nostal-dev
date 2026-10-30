import { useApp } from "../AppProvider";
import type { FormatProps } from "./types";

/** Every code line is a button; the learner taps the buggy one. */
export function FindBug({ q, value, onChange, locked }: FormatProps<"find-bug">) {
  const { t } = useApp();
  const selected = value?.kind === "line" ? value.line : null;
  const lines = q.data.code.split("\n");
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">{t("q.tapBuggyLine")}</p>
      <div role="radiogroup" aria-label={t("q.code")} className="rounded-xl border border-border bg-surface-2 py-1 font-mono text-sm">
        {lines.map((line, i) => {
          const n = i + 1;
          const isSel = selected === n;
          const isBug = locked && n === q.answer.line;
          const isWrong = locked && isSel && !isBug;
          const tone = isBug ? "bg-ok-bg outline outline-2 outline-ok" : isWrong ? "bg-bad-bg" : isSel ? "bg-accent/20 outline outline-2 outline-accent" : "";
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={isSel}
              aria-label={`Baris ${n}: ${line.trim() || "(kosong)"}`}
              disabled={locked}
              onClick={() => onChange({ kind: "line", line: n })}
              className={`flex min-h-11 w-full items-start text-left -outline-offset-2 ${tone}`}
            >
              <span aria-hidden="true" className="w-9 shrink-0 select-none py-1 pr-3 text-right text-muted/70">{n}</span>
              <span className="min-w-0 flex-1 whitespace-pre-wrap break-words py-1 pr-3">{line || " "}</span>
            </button>
          );
        })}
      </div>
      {locked && q.answer.fixedLine && (
        <div>
          <p className="mb-1 text-sm text-muted">{t("q.fixedLine")} (baris {q.answer.line})</p>
          <pre className="overflow-x-auto rounded-xl border border-ok bg-ok-bg p-3 font-mono text-sm">{q.answer.fixedLine}</pre>
        </div>
      )}
    </div>
  );
}
