import { CodeBlock } from "../ui";
import { OptionList } from "./OptionList";
import type { FormatProps } from "./types";

export function MultipleChoice({ q, value, onChange, locked }: FormatProps<"multiple-choice">) {
  const selected = value?.kind === "choice" ? value.index : null;
  const labels = q.html.options ?? q.data.options;
  return (
    <div className="flex flex-col gap-3">
      {q.data.code && <CodeBlock code={q.data.code} />}
      <OptionList
        options={labels.map((html, key) => ({
          key,
          label: <span className="prose-hub" dangerouslySetInnerHTML={{ __html: html }} />,
        }))}
        selected={selected}
        correct={q.answer.index}
        locked={locked}
        onSelect={(index) => onChange({ kind: "choice", index })}
      />
    </div>
  );
}
