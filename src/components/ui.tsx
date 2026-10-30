// Small shared UI primitives. Tap targets are at least 44px tall.

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-contrast font-semibold disabled:opacity-40",
  secondary: "border border-border bg-surface-2 text-text disabled:opacity-40",
  ghost: "text-muted hover:text-text disabled:opacity-40",
  danger: "border border-bad text-bad disabled:opacity-40",
};

export function Button({
  variant = "secondary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-base transition-colors ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

export function Card({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-2xl border border-border bg-surface p-4 ${className}`} {...props} />;
}

export function Chip({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-muted ${className}`}>
      {children}
    </span>
  );
}

/** Pre-rendered (build-time) markdown. Raw HTML in content is escaped at build time. */
export function Markdown({ html, className = "" }: { html: string; className?: string }) {
  return <div className={`prose-hub ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function CodeBlock({ code, className = "" }: { code: string; className?: string }) {
  const lines = code.split("\n");
  return (
    <pre
      className={`overflow-x-auto rounded-xl border border-border bg-surface-2 p-3 font-mono text-sm leading-6 ${className}`}
    >
      <code>
        {lines.map((line, i) => (
          <div key={i} className="flex">
            <span aria-hidden="true" className="mr-3 w-6 shrink-0 select-none text-right text-muted/70">
              {i + 1}
            </span>
            <span className="whitespace-pre">{line || " "}</span>
          </div>
        ))}
      </code>
    </pre>
  );
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
      className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
      <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${pct}%` }} />
    </div>
  );
}
