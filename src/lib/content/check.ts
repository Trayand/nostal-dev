import { normalizeOutput } from "../runner/run";
import type { Question } from "./schema";

// Answer checking for the non-executable formats (pure, unit tested).
// Code formats are checked by running tests in the sandbox instead.

export type AnswerValue =
  | { kind: "choice"; index: number }
  | { kind: "text"; text: string }
  | { kind: "line"; line: number }
  | { kind: "blanks"; values: (string | null)[] }
  | { kind: "order"; lines: string[] };

const squash = (s: string) => s.trim().replace(/\s+/g, " ");

/** True when the user has given a complete answer (enables the Check button). */
export function isComplete(value: AnswerValue | null): boolean {
  if (!value) return false;
  switch (value.kind) {
    case "text":
      return value.text.trim().length > 0;
    case "blanks":
      return value.values.every((v) => v !== null && v.trim() !== "");
    default:
      return true;
  }
}

export function checkAnswer(q: Question, value: AnswerValue): boolean {
  switch (q.format) {
    case "multiple-choice":
      return value.kind === "choice" && value.index === q.answer.index;
    case "predict-output": {
      const given =
        value.kind === "choice" && q.data.options ? q.data.options[value.index] : value.kind === "text" ? value.text : null;
      return given !== null && given !== undefined && normalizeOutput(given) === normalizeOutput(q.answer.output);
    }
    case "find-bug":
      return value.kind === "line" && value.line === q.answer.line;
    case "fill-blank":
      return (
        value.kind === "blanks" &&
        value.values.length === q.answer.blanks.length &&
        value.values.every((v, i) => v !== null && q.answer.blanks[i].some((a) => squash(a) === squash(v)))
      );
    case "parsons":
      return (
        value.kind === "order" &&
        value.lines.length === q.answer.lines.length &&
        value.lines.every((l, i) => l === q.answer.lines[i])
      );
    default:
      return false;
  }
}

/** Shuffles lines so they never start in the correct order (deterministic per seed). */
export function shuffleLines(lines: string[], seed: number): string[] {
  if (lines.length < 2) return [...lines];
  let s = seed || 1;
  const rand = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  for (let attempt = 0; attempt < 10; attempt++) {
    const out = [...lines];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    if (out.some((l, i) => l !== lines[i])) return out;
  }
  return [...lines.slice(1), lines[0]];
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
