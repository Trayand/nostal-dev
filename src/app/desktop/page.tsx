"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { Page } from "@/components/Page";
import { Button, Card, Chip, CodeBlock, Markdown } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { loadIndex, loadQuestions, type BundledQuestion } from "@/lib/content/loader";
import { downloadBlob, createZip } from "@/lib/zip";

type DesktopQ = Extract<BundledQuestion, { format: "desktop" }>;

export default function DesktopPage() {
  const { t } = useApp();
  const [items, setItems] = useState<DesktopQ[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    loadIndex()
      .then((index) => loadQuestions(index.questions.filter((q) => q.format === "desktop").map((q) => q.id)))
      .then((qs) => setItems(qs as DesktopQ[]))
      .catch(() => setItems([]));
  }, []);

  const download = (q: DesktopQ) => {
    const readme = `# ${q.title}\n\n${q.prompt}\n\nRun:\n\n    ${q.data.command}\n`;
    const zip = createZip([...q.data.files, { path: "README.md", content: readme }]);
    downloadBlob(zip, `${q.id}.zip`, "application/zip");
  };

  return (
    <Page title={t("desktop.title")}>
      <p className="mb-4 text-muted">{t("desktop.intro")}</p>
      {items === null && <p className="text-muted">{t("common.loading")}</p>}
      {items?.length === 0 && <p className="text-muted">{t("desktop.none")}</p>}
      <ul className="flex flex-col gap-3">
        {items?.map((q) => (
          <li key={q.id}>
            <Card className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setOpen(open === q.id ? null : q.id)}
                aria-expanded={open === q.id}
                className="flex min-h-11 items-start gap-3 text-left"
              >
                <Icon name="laptop" className="mt-0.5 h-6 w-6 shrink-0 text-accent" />
                <span className="flex-1">
                  <span className="block font-semibold">{q.title}</span>
                  <span className="mt-1 flex flex-wrap gap-1.5">
                    <Chip>{q.track}</Chip>
                    <Chip>{t(`level.${q.level}` as "level.1")}</Chip>
                    <Chip>~{q.estimatedMinutes} {t("common.minutesShort")}</Chip>
                  </span>
                </span>
              </button>
              {open === q.id && (
                <div className="flex flex-col gap-3">
                  <Markdown html={q.html.prompt} />
                  <div>
                    <p className="text-sm text-muted">{t("desktop.command")}</p>
                    <code className="block rounded-lg bg-surface-2 p-2 font-mono text-sm">{q.data.command}</code>
                  </div>
                  <div>
                    <p className="text-sm text-muted">{t("desktop.files")}</p>
                    <ul className="font-mono text-sm">
                      {q.data.files.map((f) => <li key={f.path}>• {f.path} <span className="text-muted">({f.kind})</span></li>)}
                    </ul>
                  </div>
                  <Button variant="primary" onClick={() => download(q)}>
                    <Icon name="download" className="h-5 w-5" /> {t("desktop.download")}
                  </Button>
                  {q.html.hints.length > 0 && (
                    <details>
                      <summary className="min-h-11 cursor-pointer py-2 text-sm text-muted">💡 {t("q.hint")}</summary>
                      {q.html.hints.map((h, i) => <Markdown key={i} html={h} className="text-sm" />)}
                    </details>
                  )}
                  {q.referenceSolution && (
                    <details>
                      <summary className="min-h-11 cursor-pointer py-2 text-sm text-muted">{t("desktop.solution")}</summary>
                      <CodeBlock code={q.referenceSolution} />
                      <Markdown html={q.html.explanation} className="mt-2 text-sm" />
                    </details>
                  )}
                </div>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </Page>
  );
}
