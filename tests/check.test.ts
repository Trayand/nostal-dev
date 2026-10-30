import { describe, expect, it } from "vitest";
import { checkAnswer, isComplete, shuffleLines } from "@/lib/content/check";
import { questionSchema, type Question } from "@/lib/content/schema";

const base = {
  track: "javascript", level: 1, topic: "t", title: "Title", prompt: "p", explanation: "e",
  estimatedMinutes: 1, status: "verified",
};
const parse = (q: Record<string, unknown>) => questionSchema.parse({ id: "x", ...base, ...q }) as Question;

describe("checkAnswer", () => {
  it("predict-output ignores trailing whitespace and CRLF", () => {
    const q = parse({ format: "predict-output", data: { language: "javascript", code: "x" }, answer: { output: "1\n2" } });
    expect(checkAnswer(q, { kind: "text", text: "1  \r\n2\n" })).toBe(true);
    expect(checkAnswer(q, { kind: "text", text: "1 2" })).toBe(false);
  });

  it("fill-blank accepts any listed alternative, whitespace-insensitive", () => {
    const q = parse({
      format: "fill-blank", data: { language: "javascript", template: "a {{blank}} b {{blank}}" },
      answer: { blanks: [["const", "let"], ["x => x"]] },
    });
    expect(checkAnswer(q, { kind: "blanks", values: ["let", " x  =>  x "] })).toBe(true);
    expect(checkAnswer(q, { kind: "blanks", values: ["var", "x => x"] })).toBe(false);
    expect(isComplete({ kind: "blanks", values: ["let", null] })).toBe(false);
  });

  it("parsons compares the exact order", () => {
    const lines = ["a", "b", "c"];
    const q = parse({ format: "parsons", data: { language: "javascript" }, answer: { lines } });
    expect(checkAnswer(q, { kind: "order", lines })).toBe(true);
    expect(checkAnswer(q, { kind: "order", lines: ["b", "a", "c"] })).toBe(false);
  });

  it("find-bug and multiple-choice", () => {
    const fb = parse({ format: "find-bug", data: { language: "javascript", code: "a\nb" }, answer: { line: 2 } });
    expect(checkAnswer(fb, { kind: "line", line: 2 })).toBe(true);
    const mc = parse({ format: "multiple-choice", data: { options: ["a", "b"] }, answer: { index: 1 } });
    expect(checkAnswer(mc, { kind: "choice", index: 0 })).toBe(false);
  });
});

describe("shuffleLines", () => {
  it("never returns the original order", () => {
    for (let seed = 1; seed < 50; seed++) expect(shuffleLines(["a", "b", "c"], seed)).not.toEqual(["a", "b", "c"]);
  });
});
