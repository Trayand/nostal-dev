import { useApp } from "../AppProvider";
import { CodeBlock } from "../ui";
import { OptionList } from "./OptionList";
import type { FormatProps } from "./types";

export function PredictOutput({ q, value, onChange, locked }: FormatProps<"predict-output">) {
  const { t } = useApp();
  const options = q.data.options;
  return (
    <div className="flex flex-col gap-3">
      <CodeBlock code={q.data.code} />
      {options ? (
        <OptionList
          mono
          options={options.map((label, key) => ({ key, label }))}
          selected={value?.kind === "choice" ? value.index : null}
          correct={options.indexOf(q.answer.output)}
          locked={locked}
          onSelect={(index) => onChange({ kind: "choice", index })}
        />
      ) : (
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-muted">{t("q.yourAnswer")}</span>
          <textarea
            value={value?.kind === "text" ? value.text : ""}
            onChange={(e) => onChange({ kind: "text", text: e.target.value })}
            disabled={locked}
            rows={3}
            placeholder={t("q.typeOutput")}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="rounded-xl border border-border bg-surface p-3 font-mono text-base"
          />
        </label>
      )}
      {locked && !options && (
        <div>
          <p className="mb-1 text-sm text-muted">{t("q.expectedOutput")}</p>
          <pre className="rounded-xl border border-ok bg-ok-bg p-3 font-mono text-sm whitespace-pre-wrap">{q.answer.output}</pre>
        </div>
      )}
    </div>
  );
}
