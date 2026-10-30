import { useState } from "react";
import { useApp } from "../AppProvider";
import type { FormatProps } from "./types";

/**
 * Code with blanks. With a word bank (data.choices): tap a blank, then tap a
 * choice. Without one: each blank is a small text input.
 */
export function FillBlank({ q, value, onChange, locked }: FormatProps<"fill-blank">) {
  const { t } = useApp();
  const parts = q.data.template.split("{{blank}}");
  const count = parts.length - 1;
  const values = value?.kind === "blanks" ? value.values : Array<string | null>(count).fill(null);
  const [active, setActive] = useState(0);
  const choices = q.data.choices;

  const setBlank = (i: number, v: string | null) => {
    const next = [...values];
    next[i] = v;
    onChange({ kind: "blanks", values: next });
    if (v !== null && choices) {
      const nextEmpty = next.findIndex((x, j) => j > i && x === null);
      setActive(nextEmpty >= 0 ? nextEmpty : i);
    }
  };

  const blankTone = (i: number) => {
    if (!locked) return active === i && choices ? "border-accent bg-accent/15" : "border-border bg-surface";
    const ok = values[i] !== null && q.answer.blanks[i].some((a) => a.trim() === values[i]!.trim());
    return ok ? "border-ok bg-ok-bg" : "border-bad bg-bad-bg";
  };

  return (
    <div className="flex flex-col gap-3">
      {choices && <p className="text-sm text-muted">{t("q.tapToFill")}</p>}
      <pre className="overflow-x-auto rounded-xl border border-border bg-surface-2 p-3 font-mono text-sm leading-9 whitespace-pre-wrap">
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < count &&
              (choices ? (
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => (values[i] !== null && active === i ? setBlank(i, null) : setActive(i))}
                  aria-label={`Kotak ${i + 1}: ${values[i] ?? "kosong"}`}
                  className={`mx-0.5 inline-block min-h-9 min-w-14 rounded-lg border-2 px-2 align-middle leading-7 ${blankTone(i)}`}
                >
                  {values[i] ?? "___"}
                </button>
              ) : (
                <input
                  value={values[i] ?? ""}
                  disabled={locked}
                  onChange={(e) => setBlank(i, e.target.value === "" ? null : e.target.value)}
                  aria-label={`Kotak ${i + 1}`}
                  placeholder={t("q.blankPlaceholder")}
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  size={Math.max(4, (values[i] ?? "").length + 1)}
                  className={`mx-0.5 inline-block min-h-9 rounded-lg border-2 px-2 align-middle font-mono ${blankTone(i)}`}
                />
              ))}
          </span>
        ))}
      </pre>
      {choices && !locked && (
        <div className="flex flex-wrap gap-2">
          {choices.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setBlank(active, c)}
              className="min-h-11 rounded-lg border border-border bg-surface px-3 font-mono"
            >
              {c}
            </button>
          ))}
        </div>
      )}
      {locked && (
        <p className="text-sm text-muted">
          {t("q.correctAnswer")}:{" "}
          {q.answer.blanks.map((b, i) => (
            <code key={i} className="mx-1 rounded bg-ok-bg px-1.5 py-0.5 font-mono">{b[0]}</code>
          ))}
        </p>
      )}
    </div>
  );
}
