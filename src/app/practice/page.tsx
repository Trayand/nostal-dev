"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { Icon } from "@/components/Icon";
import { Page } from "@/components/Page";
import { currentLevel, levelProgress } from "@/lib/engine/levels";
import { profile } from "@/lib/profile";
import { useLearner } from "@/lib/use-learner";

const LEVELS = [1, 2, 3, 4, 5];

function PracticeInner() {
  const { t } = useApp();
  const params = useSearchParams();
  const { index, state, loading } = useLearner();
  const [track, setTrack] = useState<string | null>(null);
  const [level, setLevel] = useState<number | null>(null);
  const [topic, setTopic] = useState<string>("");

  useEffect(() => {
    if (params.get("track")) setTrack(params.get("track"));
  }, [params]);

  // Default the level picker to the learner's current level for that track.
  useEffect(() => {
    if (track && state) setLevel(currentLevel(state.trackStates, track));
    setTopic("");
  }, [track, state]);

  if (loading || !index || !state) return <p className="text-muted">{t("common.loading")}</p>;

  const tracks = index.tracks.filter((tr) => tr.count > 0);
  const selected = tracks.find((tr) => tr.id === track);
  const pool = index.questions.filter((q) => q.track === track && q.format !== "desktop");
  const atLevel = pool.filter((q) => !level || q.level === level);
  const topics = [...new Set(atLevel.map((q) => q.topic))].sort();
  const count = atLevel.filter((q) => !topic || q.topic === topic).length;
  const mine = track ? currentLevel(state.trackStates, track) : 1;
  const prog = track ? levelProgress(state.attempts, track, mine, profile.levelThresholds) : null;

  const chip = (active: boolean) =>
    `min-h-11 rounded-xl border-2 px-3 text-sm ${active ? "border-accent bg-accent/15 font-semibold" : "border-border bg-surface"}`;

  return (
    <div className="flex flex-col gap-5">
      <section>
        <h2 className="mb-2 font-semibold">{t("practice.pickTrack")}</h2>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {tracks.map((tr) => (
            <li key={tr.id}>
              <button
                type="button"
                onClick={() => setTrack(tr.id)}
                aria-pressed={track === tr.id}
                className={`flex min-h-16 w-full items-center gap-3 rounded-2xl border-2 p-3 text-left ${track === tr.id ? "border-accent bg-accent/10" : "border-border bg-surface"}`}
              >
                <span aria-hidden="true" className="text-2xl">{tr.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{tr.title}</span>
                  <span className="block text-xs text-muted">
                    {tr.count} {t("practice.questions")} · L{currentLevel(state.trackStates, tr.id)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {selected && (
        <>
          <p className="text-sm text-muted">{selected.description}</p>
          <section>
            <h2 className="mb-2 font-semibold">{t("practice.level")}</h2>
            <div className="flex flex-wrap gap-2">
              {LEVELS.map((l) => {
                const n = pool.filter((q) => q.level === l).length;
                return (
                  <button key={l} type="button" disabled={n === 0} onClick={() => setLevel(l)} aria-pressed={level === l}
                    className={`${chip(level === l)} disabled:opacity-35`}>
                    {t(`level.${l}` as "level.1")} <span className="text-muted">({n})</span>
                    {l === mine && <span className="ml-1 text-accent">★</span>}
                  </button>
                );
              })}
            </div>
            {prog && (
              <p className="mt-2 text-xs text-muted">
                ★ {t("practice.current")}: {t(`level.${mine}` as "level.1")} · {prog.correct}/{prog.count} (target {Math.round(profile.levelThresholds.levelUpAccuracy * 100)}% × {prog.windowSize})
              </p>
            )}
          </section>
          {topics.length > 1 && (
            <section>
              <h2 className="mb-2 font-semibold">{t("practice.topic")}</h2>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setTopic("")} aria-pressed={topic === ""} className={chip(topic === "")}>
                  {t("practice.allTopics")}
                </button>
                {topics.map((tp) => (
                  <button key={tp} type="button" onClick={() => setTopic(tp)} aria-pressed={topic === tp} className={chip(topic === tp)}>
                    {tp}
                  </button>
                ))}
              </div>
            </section>
          )}
          {count === 0 ? (
            <p className="text-muted">{t("practice.noQuestions")}</p>
          ) : (
            <Link
              href={`/session/?mode=practice&track=${track}${level ? `&level=${level}` : ""}${topic ? `&topic=${topic}` : ""}`}
              className="flex min-h-14 items-center justify-center rounded-xl bg-accent text-lg font-semibold text-accent-contrast"
            >
              {t("practice.start")} ({Math.min(10, count)})
            </Link>
          )}
        </>
      )}

      <Link href="/desktop/" className="flex min-h-12 items-center gap-3 rounded-xl border border-border bg-surface px-4">
        <Icon name="laptop" className="h-5 w-5 text-accent" />
        <span>{t("practice.desktopLink")}</span>
      </Link>
    </div>
  );
}

export default function PracticePage() {
  const { t } = useApp();
  return (
    <Page title={t("practice.title")}>
      <Suspense fallback={null}>
        <PracticeInner />
      </Suspense>
    </Page>
  );
}
