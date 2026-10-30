"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { Icon } from "@/components/Icon";
import { Page } from "@/components/Page";
import { Card, ProgressBar } from "@/components/ui";
import { localDate } from "@/lib/engine/dates";
import { currentLevel } from "@/lib/engine/levels";
import { isDue } from "@/lib/engine/srs";
import { minutesOn, streak, weakTopics } from "@/lib/engine/stats";
import { useLearner } from "@/lib/use-learner";

export default function TodayPage() {
  const { t, settings } = useApp();
  const { index, state, loading } = useLearner();
  const [resumable, setResumable] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("ph-daily") ?? "null");
      setResumable(!!saved && saved.date === localDate() && saved.index > 0 && saved.index < saved.ids.length);
    } catch {
      setResumable(false);
    }
  }, []);

  if (loading || !index || !state) return <Page title={t("today.title")}><p className="text-muted">{t("common.loading")}</p></Page>;

  const today = localDate();
  const minutes = minutesOn(state.attempts, today);
  const goal = settings.dailyGoalMinutes;
  const days = streak(state.attempts, today);
  const available = new Set(index.questions.map((q) => q.id));
  const due = state.srs.filter((c) => isDue(c, today) && available.has(c.questionId)).length;
  const weak = weakTopics(state.attempts, today).slice(0, 4);
  const desktopCount = index.questions.filter((q) => q.format === "desktop").length;

  return (
    <Page title={t("today.title")}>
      {index.questions.length === 0 ? (
        <Card><p className="text-muted">{t("today.empty")}</p></Card>
      ) : (
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-muted">{t("today.streak")}</p>
                <p className="text-3xl font-bold"><span aria-hidden="true">🔥</span> {days} <span className="text-base font-normal text-muted">{t("today.days")}</span></p>
              </div>
              <div>
                <p className="text-sm text-muted">{t("today.due")}</p>
                <p className="text-3xl font-bold">{due}</p>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted">{t("today.goal")}</span>
                <span>{Math.round(minutes)} / {goal} {t("today.minutes")}</span>
              </div>
              <ProgressBar value={minutes / goal} label={t("today.goal")} />
              {minutes >= goal && <p className="text-sm text-ok">{t("today.goalDone")}</p>}
            </div>
            <Link
              href={resumable ? "/session/?mode=daily" : "/session/?mode=daily&fresh=1"}
              className="flex min-h-14 items-center justify-center rounded-xl bg-accent text-lg font-semibold text-accent-contrast"
            >
              {resumable ? t("today.continue") : t("today.start")}
            </Link>
            <p className="text-center text-sm text-muted">{t("today.mix")}</p>
          </Card>

          <section>
            <h2 className="mb-2 font-semibold">{t("today.weak")}</h2>
            {weak.length === 0 ? (
              <p className="text-sm text-muted">{t("today.noWeak")}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {weak.map((w) => (
                  <li key={`${w.track}/${w.topic}`}>
                    <Link
                      href={`/session/?mode=practice&track=${w.track}&topic=${w.topic}`}
                      className="flex min-h-12 items-center justify-between rounded-xl border border-border bg-surface px-4"
                    >
                      <span>{w.topic} <span className="text-sm text-muted">· {w.track}</span></span>
                      <span className="text-sm text-bad">{Math.round(w.accuracy * 100)}%</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {index.tracks.filter((tr) => tr.count > 0).map((tr) => (
                <li key={tr.id}>
                  <Link href={`/practice/?track=${tr.id}`} className="flex min-h-14 items-center gap-2 rounded-xl border border-border bg-surface px-3">
                    <span aria-hidden="true" className="text-xl">{tr.icon}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{tr.title}</span>
                      <span className="block text-xs text-muted">L{currentLevel(state.trackStates, tr.id)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {desktopCount > 0 && (
            <Link href="/desktop/" className="flex min-h-12 items-center gap-3 rounded-xl border border-border bg-surface px-4">
              <Icon name="laptop" className="h-5 w-5 text-accent" />
              <span className="flex-1">{t("today.desktop")}</span>
              <span className="text-sm text-muted">{desktopCount}</span>
            </Link>
          )}
        </div>
      )}
    </Page>
  );
}
