"use client";

import { useApp } from "@/components/AppProvider";
import { Page } from "@/components/Page";
import { Card } from "@/components/ui";
import { addDays, dateOf, localDate } from "@/lib/engine/dates";
import { currentLevel } from "@/lib/engine/levels";
import { activityByDay, streak, trackLevelStats, weakTopics } from "@/lib/engine/stats";
import { useLearner } from "@/lib/use-learner";

const WEEKS = 12;

function pct(correct: number, total: number) {
  return total ? `${Math.round((correct / total) * 100)}%` : "–";
}

export default function ProgressPage() {
  const { t } = useApp();
  const { index, state, loading } = useLearner();
  if (loading || !index || !state) return <Page title={t("progress.title")}><p className="text-muted">{t("common.loading")}</p></Page>;

  const today = localDate();
  const stats = trackLevelStats(state.attempts);
  const activity = activityByDay(state.attempts);
  const weak = weakTopics(state.attempts, today).slice(0, 8);
  const titles = new Map(index.questions.map((q) => [q.id, q.title]));
  const history = [...state.attempts].reverse().slice(0, 20);

  // Calendar: WEEKS columns × 7 rows, ending this week (rows = Mon..Sun).
  const dow = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7;
  const start = addDays(today, -(WEEKS - 1) * 7 - dow);
  const cells = Array.from({ length: WEEKS * 7 }, (_, i) => addDays(start, i));
  const shade = (n: number) => (n === 0 ? "bg-surface-2" : n < 3 ? "bg-accent/35" : n < 8 ? "bg-accent/65" : "bg-accent");

  return (
    <Page title={t("progress.title")}>
      <div className="flex flex-col gap-5">
        <section>
          <h2 className="mb-2 font-semibold">{t("progress.calendar")} · 🔥 {streak(state.attempts, today)} {t("today.days")}</h2>
          <Card className="overflow-x-auto">
            <div className="grid w-max grid-flow-col grid-rows-7 gap-1" role="img"
              aria-label={`${t("progress.calendar")}: ${[...activity.keys()].length} hari aktif`}>
              {cells.map((d) => {
                const a = activity.get(d);
                return (
                  <div key={d} title={`${d}: ${a?.count ?? 0}`}
                    className={`h-4 w-4 rounded-sm ${d > today ? "opacity-0" : shade(a?.count ?? 0)} ${d === today ? "ring-2 ring-text/60" : ""}`} />
                );
              })}
            </div>
          </Card>
        </section>

        <section>
          <h2 className="mb-2 font-semibold">{t("progress.byTrack")}</h2>
          <div className="flex flex-col gap-2">
            {index.tracks.filter((tr) => tr.count > 0).map((tr) => {
              const levels = stats[tr.id] ?? {};
              const total = Object.values(levels).reduce((s, l) => s + l.attempts, 0);
              const correct = Object.values(levels).reduce((s, l) => s + l.correct, 0);
              return (
                <Card key={tr.id} className="p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-semibold"><span aria-hidden="true">{tr.icon}</span> {tr.title}</span>
                    <span className="text-sm text-muted">L{currentLevel(state.trackStates, tr.id)} · {pct(correct, total)} · {total} {t("progress.attempts")}</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1 text-center text-xs">
                    {[1, 2, 3, 4, 5].map((l) => (
                      <div key={l} className="rounded-lg bg-surface-2 py-1.5">
                        <div className="text-muted">L{l}</div>
                        <div className="font-semibold">{pct(levels[l]?.correct ?? 0, levels[l]?.attempts ?? 0)}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-2 font-semibold">{t("progress.weakTopics")}</h2>
          {weak.length === 0 ? <p className="text-sm text-muted">{t("today.noWeak")}</p> : (
            <ul className="flex flex-col gap-1.5">
              {weak.map((w) => (
                <li key={`${w.track}/${w.topic}`} className="flex justify-between rounded-xl bg-surface px-3 py-2 text-sm">
                  <span>{w.topic} <span className="text-muted">· {w.track}</span></span>
                  <span className="text-bad">{pct(w.correct, w.attempts)} ({w.attempts})</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-2 font-semibold">{t("progress.history")}</h2>
          {history.length === 0 ? <p className="text-sm text-muted">{t("progress.none")}</p> : (
            <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-surface">
              {history.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span aria-label={a.correct ? t("q.correct") : t("q.incorrect")} className={a.correct ? "text-ok" : "text-bad"}>
                    {a.correct ? "✓" : "✗"}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{titles.get(a.questionId) ?? a.questionId}</span>
                  <span className="shrink-0 text-xs text-muted">{a.track} L{a.level} · {dateOf(a.answeredAt).slice(5)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Page>
  );
}
