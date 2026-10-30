import { Icon } from "../Icon";

/** Big tappable radio options. After locking, the correct one turns green and a wrong pick red. */
export function OptionList({
  options,
  selected,
  correct,
  locked,
  onSelect,
  mono = false,
}: {
  options: { key: number; label: React.ReactNode }[];
  selected: number | null;
  correct: number;
  locked: boolean;
  onSelect: (index: number) => void;
  mono?: boolean;
}) {
  return (
    <div role="radiogroup" className="flex flex-col gap-2">
      {options.map(({ key, label }) => {
        const isSel = selected === key;
        const isCorrect = locked && key === correct;
        const isWrong = locked && isSel && key !== correct;
        const tone = isCorrect
          ? "border-ok bg-ok-bg"
          : isWrong
            ? "border-bad bg-bad-bg"
            : isSel
              ? "border-accent bg-surface-2"
              : "border-border bg-surface";
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={isSel}
            disabled={locked}
            onClick={() => onSelect(key)}
            className={`flex min-h-12 w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left ${tone} ${mono ? "font-mono text-sm whitespace-pre-wrap" : ""}`}
          >
            <span
              aria-hidden="true"
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${isSel ? "border-accent bg-accent" : "border-muted"}`}
            >
              {isSel && <span className="h-2 w-2 rounded-full bg-accent-contrast" />}
            </span>
            <span className="min-w-0 flex-1">{label}</span>
            {isCorrect && <Icon name="check" className="h-5 w-5 text-ok" />}
          </button>
        );
      })}
    </div>
  );
}
