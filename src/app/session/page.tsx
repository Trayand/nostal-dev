"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { Icon } from "@/components/Icon";
import { QuestionView, type Outcome } from "@/components/QuestionView";
import { Button, ProgressBar } from "@/components/ui";
import { loadIndex, loadQuestions, type BundledQuestion } from "@/lib/content/loader";
import { localDate } from "@/lib/engine/dates";
import { recordOutcome } from "@/lib/engine/record";
import { buildCardsSession, buildDailySession, buildPracticeSession } from "@/lib/engine/session";
import { profile } from "@/lib/profile";
import { getStorage } from "@/lib/storage";

// URL modes:
//   /session/?mode=daily                         today's mixed session (resumable)
//   /session/?mode=practice&track=sql&level=2&topic=joins
//   /session/?mode=cards[&new=1]                 flashcard review
//   /session/?q=id1,id2                          specific questions

const DAILY_KEY = "ph-daily";

interface DailySaved { date: string; ids: string[]; index: number }

function readDaily(): DailySaved | null {
  try {
    const saved = JSON.parse(localStorage.getItem(DAILY_KEY) ?? "null") as DailySaved | null;
    return saved && saved.date === localDate() ? saved : null;
  } catch {
    return null;
  }
}

function writeDaily(saved: DailySaved) {
  try {
    localStorage.setItem(DAILY_KEY, JSON.stringify(saved));
  } catch {
    // Resume is a convenience; ignore blocked storage.
  }
}

async function planSession(params: URLSearchParams, goalMinutes: number): Promise<{ ids: string[]; start: number }> {
  const explicit = params.get("q");
  if (explicit) return { ids: explicit.split(",").filter(Boolean), start: 0 };

  const [index, state] = await Promise.all([loadIndex(), getStorage().getProgress()]);
  const today = localDate();
  const mode = params.get("mode") ?? "daily";

  if (mode === "practice") {
    const level = Number(params.get("level")) || undefined;
    const ids = buildPracticeSession({
      questions: index.questions, state, profile, today,
      track: params.get("track") ?? "", level, topic: params.get("topic") || undefined,
    });
    return { ids, start: 0 };
  }
  if (mode === "cards") {
    const onlyNew = params.get("new") === "1";
    return { ids: buildCardsSession({ questions: index.questions, srs: state.srs, today, newLimit: onlyNew ? 10 : 5, onlyNew }), start: 0 };
  }

  const saved = readDaily();
  if (saved && saved.index < saved.ids.length && params.get("fresh") !== "1") return { ids: saved.ids, start: saved.index };
  const ids = buildDailySession({ questions: index.questions, state, profile, today, goalMinutes });
  writeDaily({ date: today, ids, index: 0 });
  return { ids, start: 0 };
}

function SessionInner() {
  const params = useSearchParams();
  const { t, settings, ready } = useApp();
  const [queue, setQueue] = useState<BundledQuestion[] | null>(null);
  const [index, setIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [levelUps, setLevelUps] = useState<{ track: string; level: number }[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const sessionId = useRef(`s-${Date.now().toString(36)}`);
  const isDaily = !params.get("q") && (params.get("mode") ?? "daily") === "daily";

  useEffect(() => {
    if (!ready) return; // wait for saved settings (daily goal)
    let cancelled = false;
    planSession(new URLSearchParams(params.toString()), settings.dailyGoalMinutes)
      .then(async ({ ids, start }) => {
        const qs = await loadQuestions(ids);
        if (cancelled) return;
        setQueue(qs);
        setIndex(Math.min(start, qs.length));
      })
      .catch(() => !cancelled && setQueue([]));
    return () => {
      cancelled = true;
    };
    // Plan once per URL; changing the goal mid-session must not reshuffle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, ready]);

  const q = queue?.[index];

  const onAnswered = useCallback(
    async (outcome: Outcome) => {
      if (!q) return;
      setAnswered((n) => n + 1);
      if (outcome.correct && !outcome.revealed) setCorrectCount((n) => n + 1);
      const { levelUp } = await recordOutcome(getStorage(), q, outcome, {
        thresholds: profile.levelThresholds,
        sessionId: sessionId.current,
      });
      if (levelUp) {
        setLevelUps((l) => [...l, { track: q.track, level: levelUp }]);
        setToast(t("q.levelUp", { track: q.track, level: t(`level.${levelUp}` as "level.1") }));
        setTimeout(() => setToast(null), 4000);
      }
    },
    [q, t],
  );

  const next = () => {
    const nextIndex = index + 1;
    setIndex(nextIndex);
    if (isDaily && queue) writeDaily({ date: localDate(), ids: queue.map((x) => x.id), index: nextIndex });
    window.scrollTo({ top: 0 });
  };

  if (!queue) return <p className="p-6 text-muted">{t("session.loading")}</p>;
  if (!queue.length) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <p className="text-muted">{t("session.empty")}</p>
        <Link href="/" className="mt-4 inline-block text-accent underline">{t("session.backHome")}</Link>
      </div>
    );
  }

  if (!q) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6 pt-[calc(env(safe-area-inset-top)+2rem)]">
        <h1 className="text-3xl font-bold">🎉 {t("session.done")}</h1>
        {answered > 0 && <p className="text-lg">{t("session.summary", { c: correctCount, n: answered })}</p>}
        {levelUps.map((l) => (
          <p key={l.track} className="rounded-xl bg-ok-bg p-3 text-ok">
            ⬆️ {t("q.levelUp", { track: l.track, level: t(`level.${l.level}` as "level.1") })}
          </p>
        ))}
        <Link href="/" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-accent px-4 font-semibold text-accent-contrast">
          {t("session.backHome")}
        </Link>
        <Button onClick={() => window.location.reload()}>{t("session.again")}</Button>
      </div>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-border bg-bg/95 px-2 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <Link href="/" aria-label={t("q.close")} className="flex h-12 w-12 shrink-0 items-center justify-center text-muted">
            <Icon name="close" />
          </Link>
          <div className="flex flex-1 flex-col gap-1 pr-3">
            <span className="text-xs text-muted">{t("q.progress", { i: index + 1, n: queue.length })}</span>
            <ProgressBar value={index / queue.length} label={t("q.progress", { i: index + 1, n: queue.length })} />
          </div>
        </div>
      </header>
      {toast && (
        <div role="status" className="fixed inset-x-3 top-16 z-30 mx-auto max-w-md rounded-xl border border-ok bg-ok-bg p-3 text-center font-semibold text-ok shadow-lg">
          ⬆️ {toast}
        </div>
      )}
      <QuestionView
        key={q.id}
        q={q}
        onAnswered={onAnswered}
        onNext={next}
        nextLabel={index === queue.length - 1 ? t("q.finish") : t("q.next")}
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
