"use client";

import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { Page } from "@/components/Page";
import { Card } from "@/components/ui";
import { localDate } from "@/lib/engine/dates";
import { isDue } from "@/lib/engine/srs";
import { useLearner } from "@/lib/use-learner";

export default function CardsPage() {
  const { t } = useApp();
  const { index, state, loading } = useLearner();

  if (loading || !index || !state) return <Page title={t("cards.title")}><p className="text-muted">{t("common.loading")}</p></Page>;

  const today = localDate();
  const cards = index.questions.filter((q) => q.format === "flashcard");
  const cardIds = new Set(cards.map((c) => c.id));
  const srs = state.srs.filter((c) => cardIds.has(c.questionId));
  const due = srs.filter((c) => isDue(c, today));
  const unseen = cards.length - srs.length;
  const byTopic = new Map<string, number>();
  for (const c of cards) byTopic.set(c.topic, (byTopic.get(c.topic) ?? 0) + 1);

  return (
    <Page title={t("cards.title")}>
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-4">
          <p className="text-2xl font-bold">{due.length ? t("cards.due", { n: due.length }) : t("cards.none")}</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-muted">{t("cards.total")}</p><p className="text-xl font-semibold">{cards.length}</p></div>
            <div><p className="text-muted">{t("cards.learned")}</p><p className="text-xl font-semibold">{srs.filter((c) => c.reps > 0).length}</p></div>
          </div>
          {due.length > 0 && (
            <Link href="/session/?mode=cards" className="flex min-h-14 items-center justify-center rounded-xl bg-accent text-lg font-semibold text-accent-contrast">
              {t("cards.start")}
            </Link>
          )}
          {unseen > 0 && (
            <Link href="/session/?mode=cards&new=1" className="flex min-h-12 items-center justify-center rounded-xl border border-border bg-surface-2">
              {t("cards.learnNew")} ({Math.min(10, unseen)})
            </Link>
          )}
        </Card>
        <section>
          <h2 className="mb-2 font-semibold">{t("practice.topic")}</h2>
          <div className="flex flex-wrap gap-2">
            {[...byTopic].sort().map(([topic, n]) => (
              <span key={topic} className="rounded-full bg-surface-2 px-3 py-1 text-sm">{topic} <span className="text-muted">{n}</span></span>
            ))}
          </div>
        </section>
      </div>
    </Page>
  );
}
