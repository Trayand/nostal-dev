"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { Icon } from "@/components/Icon";
import { QuestionView } from "@/components/QuestionView";
import { loadQuestions, type BundledQuestion } from "@/lib/content/loader";

function SessionInner() {
  const params = useSearchParams();
  const { t } = useApp();
  const [queue, setQueue] = useState<BundledQuestion[] | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const ids = (params.get("q") ?? "").split(",").filter(Boolean);
    loadQuestions(ids).then((qs) => {
      setQueue(qs);
      setIndex(0);
    });
  }, [params]);

  if (!queue) return <p className="p-6 text-muted">{t("session.loading")}</p>;
  if (!queue.length) return <p className="p-6 text-muted">{t("session.empty")}</p>;
  if (index >= queue.length) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <h1 className="text-2xl font-bold">{t("session.done")}</h1>
        <Link href="/" className="mt-4 inline-block text-accent underline">{t("session.backHome")}</Link>
      </div>
    );
  }

  const q = queue[index];
  const last = index === queue.length - 1;
  return (
    <>
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-bg/95 px-2 pt-[env(safe-area-inset-top)] backdrop-blur">
        <Link href="/" aria-label={t("q.close")} className="flex h-12 w-12 items-center justify-center text-muted">
          <Icon name="close" />
        </Link>
        <span className="text-sm text-muted">{t("q.progress", { i: index + 1, n: queue.length })}</span>
      </header>
      <QuestionView
        key={q.id}
        q={q}
        onAnswered={() => {}}
        onNext={() => setIndex((i) => i + 1)}
        nextLabel={last ? t("q.finish") : t("q.next")}
      />
    </>
  );
}

export default function SessionPage() {
  return (
    <main>
      <Suspense fallback={null}>
        <SessionInner />
      </Suspense>
    </main>
  );
}
