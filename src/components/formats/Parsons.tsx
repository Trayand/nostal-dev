import { useEffect } from "react";
import { hashString, shuffleLines } from "@/lib/content/check";
import { useApp } from "../AppProvider";
import { Icon } from "../Icon";
import type { FormatProps } from "./types";

/** Reorder lines with up/down buttons — works with one thumb and with a keyboard (no drag needed). */
export function Parsons({ q, value, onChange, locked }: FormatProps<"parsons">) {
  const { t } = useApp();

  useEffect(() => {
    if (!value) onChange({ kind: "order", lines: shuffleLines(q.answer.lines, hashString(q.id)) });
  }, [q.id, q.answer.lines, value, onChange]);

  const lines = value?.kind === "order" ? value.lines : [];
  const move = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= lines.length) return;
    const next = [...lines];
    [next[i], next[j]] = [next[j], next[i]];
    onChange({ kind: "order", lines: next });
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">{t("q.parsonsHelp")}</p>
      <ol className="flex flex-col gap-1.5">
        {lines.map((line, i) => {
          const tone = locked ? (line === q.answer.lines[i] ? "border-ok bg-ok-bg" : "border-bad bg-bad-bg") : "border-border bg-surface";
          return (
            <li key={line} className={`flex items-center gap-1 rounded-xl border-2 py-1 pl-3 pr-1 ${tone}`}>
              <span className="min-w-0 flex-1 overflow-x-auto whitespace-pre font-mono text-sm">{line}</span>
              {!locked && (
                <>
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
                    aria-label={`${t("q.moveUp")}: ${line.trim()}`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted disabled:opacity-25">
                    <Icon name="up" className="h-5 w-5" />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === lines.length - 1}
                    aria-label={`${t("q.moveDown")}: ${line.trim()}`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted disabled:opacity-25">
                    <Icon name="down" className="h-5 w-5" />
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ol>
      {locked && (
        <div>
          <p className="mb-1 text-sm text-muted">{t("q.correctAnswer")}</p>
          <pre className="overflow-x-auto rounded-xl border border-ok bg-ok-bg p-3 font-mono text-sm">{q.answer.lines.join("\n")}</pre>
        </div>
      )}
    </div>
  );
}
