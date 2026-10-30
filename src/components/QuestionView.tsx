"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { checkAnswer, isComplete, type AnswerValue } from "@/lib/content/check";
import type { BundledQuestion } from "@/lib/content/loader";
import { browserExecutor } from "@/lib/runner/browser";
import { runCodeTests } from "@/lib/runner/run";
import type { TestRun } from "@/lib/runner/types";
import { getStorage } from "@/lib/storage";
import { useApp } from "./AppProvider";
import { FillBlank } from "./formats/FillBlank";
import { FindBug } from "./formats/FindBug";
import { MultipleChoice } from "./formats/MultipleChoice";
import { Parsons } from "./formats/Parsons";
import { PredictOutput } from "./formats/PredictOutput";
import { TestResults } from "./formats/TestResults";
import { Button, Chip, CodeBlock, Markdown } from "./ui";

// CodeMirror is big; load it only when a code question is shown (and never during prerender).
const CodeEditor = dynamic(() => import("./editor/CodeEditor").then((m) => m.CodeEditor), {
  ssr: false,
  loading: () => <div className="h-40 animate-pulse rounded-xl bg-surface-2" />,
});

export interface Outcome {
  correct: boolean;
  hintsUsed: number;
  revealed: boolean;
  durationMs: number;
  /** Flashcards: self-grade 0..5 (SM-2 scale). */
  grade?: number;
}

interface Props {
  q: BundledQuestion;
  /** Called once, when the question is finished (checked, passed, revealed or graded). */
  onAnswered: (outcome: Outcome) => void;
  onNext: () => void;
  nextLabel: string;
}

type CodeQ = Extract<BundledQuestion, { format: "code-short" | "code-full" }>;
const isCode = (q: BundledQuestion): q is CodeQ => q.format === "code-short" || q.format === "code-full";

export function QuestionView({ q, onAnswered, onNext, nextLabel }: Props) {
  const { t, isDark } = useApp();
  const started = useRef(Date.now());
  const [value, setValue] = useState<AnswerValue | null>(null);
  const [hintsShown, setHintsShown] = useState(0);
  const [done, setDone] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [backShown, setBackShown] = useState(false);
  const [cardNote, setCardNote] = useState("");
  const [code, setCode] = useState(isCode(q) ? q.data.starter : "");
  const [run, setRun] = useState<TestRun | null>(null);
  const [running, setRunning] = useState(false);

  // Restore an unfinished code draft for this question.
  useEffect(() => {
    if (!isCode(q)) return;
    getStorage().getCodeDraft(q.id).then((d) => d && setCode(d.code)).catch(() => {});
  }, [q]);

  // Save drafts (debounced) while typing.
  useEffect(() => {
    if (!isCode(q) || done || code === q.data.starter) return;
    const id = setTimeout(() => {
      getStorage().saveCodeDraft({ questionId: q.id, code, updatedAt: new Date().toISOString() }).catch(() => {});
    }, 600);
    return () => clearTimeout(id);
  }, [code, q, done]);

  const finish = useCallback(
    (outcome: Omit<Outcome, "durationMs" | "hintsUsed">) => {
      setDone(true);
      setCorrect(outcome.correct);
      setRevealed(outcome.revealed);
      onAnswered({ ...outcome, hintsUsed: hintsShown, durationMs: Date.now() - started.current });
    },
    [hintsShown, onAnswered],
  );

  const check = async () => {
    if (isCode(q)) {
      setRunning(true);
      const result = await runCodeTests(browserExecutor, {
        language: q.data.language, code, entry: q.data.entry, tests: q.tests, schema: q.data.schema, seed: q.data.seed,
      });
      setRunning(false);
      setRun(result);
      if (result.passed) finish({ correct: true, revealed: false });
      return;
    }
    if (value) finish({ correct: checkAnswer(q, value), revealed: false });
  };

  const reveal = () => {
    if (!window.confirm(t("q.solutionConfirm"))) return;
    if (q.format === "flashcard") setBackShown(true);
    finish({ correct: false, revealed: true });
  };

  const grade = (g: number) => finish({ correct: g >= 3, revealed: false, grade: g });

  const totalHints = q.hints.length;
  const code_ = isCode(q);
  const bigProblem = q.format === "code-full" && (q.estimatedMinutes >= 10 || q.data.starter.split("\n").length > 15);

  const prompt = (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        <Chip>{q.track}</Chip>
        <Chip>{t(`level.${q.level}` as "level.1")}</Chip>
        <Chip>{q.topic}</Chip>
        <Chip>~{q.estimatedMinutes} {t("common.minutesShort")}</Chip>
      </div>
      <h2 className="text-xl font-bold">{q.title}</h2>
      <Markdown html={q.html.prompt} />
      {bigProblem && <p className="rounded-xl bg-warn-bg p-3 text-sm text-warn lg:hidden">💻 {t("q.desktopHint")}</p>}
    </section>
  );

  const body = (() => {
    const common = { value, onChange: setValue, locked: done };
    switch (q.format) {
      case "multiple-choice": return <MultipleChoice q={q} {...common} />;
      case "predict-output": return <PredictOutput q={q} {...common} />;
      case "find-bug": return <FindBug q={q} {...common} />;
      case "fill-blank": return <FillBlank q={q} {...common} />;
      case "parsons": return <Parsons q={q} {...common} />;
      case "flashcard":
        // Self-graded: recall (optionally type) the answer, reveal, then rate yourself.
        return (
          <div className="flex flex-col gap-3">
            {!backShown && <p className="text-sm text-muted">{t("q.cardHelp")}</p>}
            {(!backShown || cardNote.trim()) && (
              <label className="flex flex-col gap-1.5">
                <span className="text-sm text-muted">{t("q.yourAnswer")}</span>
                <textarea
                  value={cardNote}
                  onChange={(e) => setCardNote(e.target.value)}
                  readOnly={backShown}
                  rows={3}
                  placeholder={t("q.cardPlaceholder")}
                  className="rounded-xl border border-border bg-surface p-3 text-base"
                />
              </label>
            )}
            {backShown && (
              <>
                <div className="rounded-2xl border-2 border-accent bg-surface p-4"><Markdown html={q.html.back ?? ""} /></div>
                {!done && <p className="text-sm text-muted">{t("q.gradeHelp")}</p>}
              </>
            )}
          </div>
        );
      case "code-short":
      case "code-full":
        return (
          <div className="flex flex-col gap-3">
            <CodeEditor
              value={code}
              onChange={setCode}
              language={q.data.language}
              dark={isDark}
              readOnly={done}
              label={t("q.code")}
            />
            {!done && code !== q.data.starter && (
              <button type="button" onClick={() => setCode(q.data.starter)} className="min-h-11 self-start text-sm text-muted underline">
                {t("q.resetCode")}
              </button>
            )}
            {run && <TestResults run={run} />}
            {run && !run.passed && !done && <p className="text-sm text-muted">{t("q.tryAgain")}</p>}
            {revealed && q.referenceSolution && (
              <div>
                <p className="mb-1 text-sm text-muted">{t("desktop.solution")}</p>
                <CodeBlock code={q.referenceSolution} />
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  })();

  const hints = hintsShown > 0 && (
    <section aria-live="polite" className="flex flex-col gap-2">
      {q.html.hints.slice(0, hintsShown).map((h, i) => (
        <div key={i} className="rounded-xl border border-warn/50 bg-warn-bg p-3 text-sm">
          <p className="mb-1 font-semibold text-warn">💡 {t("q.hintN", { n: i + 1 })}</p>
          <Markdown html={h} />
        </div>
      ))}
    </section>
  );

  const result = done && (
    <section aria-live="assertive" className={`rounded-2xl border-2 p-4 ${correct ? "border-ok bg-ok-bg" : "border-bad bg-bad-bg"}`}>
      <p className={`text-lg font-bold ${correct ? "text-ok" : "text-bad"}`}>
        {revealed ? t("q.revealed") : correct ? `✓ ${t("q.correct")}` : `✗ ${t("q.incorrect")}`}
      </p>
      <h3 className="mt-2 text-sm font-semibold">{t("q.explanation")}</h3>
      <Markdown html={q.html.explanation} className="text-sm" />
    </section>
  );

  const actions = (() => {
    if (done) {
      return <Button variant="primary" className="flex-1" onClick={onNext}>{nextLabel}</Button>;
    }
    const hintBtn = (
      <Button
        onClick={() => setHintsShown((n) => Math.min(totalHints, n + 1))}
        disabled={hintsShown >= totalHints}
        aria-label={hintsShown >= totalHints ? t("q.noMoreHints") : t("q.hint")}
        className="px-3"
      >
        💡<span className="hidden sm:inline">{t("q.hint")}</span>
        {totalHints > 0 && <span className="text-xs text-muted">{hintsShown}/{totalHints}</span>}
      </Button>
    );
    if (q.format === "flashcard") {
      if (!backShown) {
        return (
          <>
            {hintBtn}
            <Button variant="primary" className="flex-1" onClick={() => setBackShown(true)}>{t("q.showBack")}</Button>
          </>
        );
      }
      const grades: [number, "q.gradeAgain" | "q.gradeHard" | "q.gradeGood" | "q.gradeEasy"][] = [
        [1, "q.gradeAgain"], [3, "q.gradeHard"], [4, "q.gradeGood"], [5, "q.gradeEasy"],
      ];
      return grades.map(([g, key]) => (
        <Button key={g} variant={g === 4 ? "primary" : "secondary"} className="flex-1 px-1 text-sm" onClick={() => grade(g)}>
          {t(key)}
        </Button>
      ));
    }
    return (
      <>
        {hintBtn}
        <Button onClick={reveal} className="px-3">{t("q.solution")}</Button>
        <Button
          variant="primary"
          className="flex-1"
          onClick={check}
          disabled={running || (!code_ && !isComplete(value))}
        >
          {code_ ? (running ? t("q.running") : t("q.runTests")) : t("q.check")}
        </Button>
      </>
    );
  })();

  return (
    <>
      {code_ ? (
        // Phone: one column (prompt, hints, editor, result). Desktop: two panes,
        // prompt + result on the left, editor on the right.
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pb-36 pt-2 lg:grid lg:max-w-6xl lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-8">
          <div className="flex flex-col gap-4 lg:col-start-1 lg:row-start-1">{prompt}{hints}</div>
          <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">{body}</div>
          {result && <div className="lg:col-start-1 lg:row-start-2">{result}</div>}
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pb-36 pt-2">{prompt}{body}{hints}{result}</div>
      )}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-2xl gap-2 p-3">{actions}</div>
      </div>
    </>
  );
}
