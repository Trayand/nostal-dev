// Deliberately broken questions. The validator must reject every one of them.
// `expect` is a fragment of the error message the validator should produce.

const base = {
  track: "javascript",
  level: 1,
  topic: "fixtures",
  tags: [],
  prompt: "Prompt",
  hints: ["h1", "h2"],
  explanation: "Explanation",
  estimatedMinutes: 1,
  status: "verified",
};

const codeData = (starter: string) => ({ language: "javascript", starter, entry: "add" });
const addTests = [
  { input: [1, 2], expected: 3 },
  { input: [2, 2], expected: 4 },
];

export const brokenItems: { item: Record<string, unknown>; expect: string }[] = [
  {
    expect: "referenceSolution fails",
    item: {
      ...base, id: "broken-wrong-reference", title: "Wrong reference", format: "code-short",
      data: codeData("function add(a, b) {}"), tests: addTests,
      referenceSolution: "function add(a, b) { return a - b; }",
    },
  },
  {
    expect: "starter code already passes",
    item: {
      ...base, id: "broken-trivial-starter", title: "Starter already solves it", format: "code-short",
      data: codeData("function add(a, b) { return a + b; }"), tests: addTests,
      referenceSolution: "function add(a, b) { return a + b; }",
    },
  },
  {
    expect: "Timeout",
    item: {
      ...base, id: "broken-infinite-loop", title: "Reference never ends", format: "code-short",
      data: codeData("function add(a, b) {}"), tests: addTests,
      referenceSolution: "function add(a, b) { while (true) {} }",
    },
  },
  {
    expect: "answer.output does not match",
    item: {
      ...base, id: "broken-predict-output", title: "Wrong stored output", format: "predict-output",
      data: { language: "javascript", code: "console.log(0.1 + 0.2 === 0.3)" },
      answer: { output: "true" },
    },
  },
  {
    expect: "referenceSolution fails",
    item: {
      ...base, track: "sql", id: "broken-sql-expected", title: "SQL expected rows wrong", format: "code-short",
      data: {
        language: "sql", starter: "-- query",
        schema: "CREATE TABLE t (n INTEGER);", seed: "INSERT INTO t VALUES (1), (2), (3);",
      },
      tests: [{ expected: { columns: ["total"], rows: [[7]] } }],
      referenceSolution: "SELECT SUM(n) AS total FROM t;",
    },
  },
  {
    expect: "explaination",
    item: {
      ...base, id: "broken-typo-field", title: "Typo in field name", format: "multiple-choice",
      explanation: undefined, explaination: "typo",
      data: { options: ["a", "b"] }, answer: { index: 0 },
    },
  },
  {
    expect: "out of range",
    item: {
      ...base, id: "broken-mc-index", title: "Answer index out of range", format: "multiple-choice",
      data: { options: ["a", "b"] }, answer: { index: 5 },
    },
  },
  {
    expect: "{{blank}} markers",
    item: {
      ...base, id: "broken-fill-count", title: "Blank count mismatch", format: "fill-blank",
      data: { language: "javascript", template: "const x = {{blank}};" },
      answer: { blanks: [["1"], ["2"]] },
    },
  },
  {
    expect: "does not pass the tests",
    item: {
      ...base, id: "broken-parsons-order", title: "Parsons answer is wrong", format: "parsons",
      data: { language: "javascript", entry: "f" },
      answer: { lines: ["function f() {", "  return 1;", "  return 2;", "}"] },
      tests: [{ input: [], expected: 2 }],
    },
  },
  {
    expect: "go track cannot use executable formats",
    item: {
      ...base, track: "go", id: "broken-go-exec", title: "Go must not execute", format: "code-full",
      data: codeData("function add(a, b) {}"), tests: addTests,
      referenceSolution: "function add(a, b) { return a + b; }",
    },
  },
  {
    expect: "kebab-case",
    item: {
      ...base, id: "Broken_ID", title: "Bad id", format: "flashcard", answer: { back: "x" },
    },
  },
];

/** A valid item, used to prove the validator does not reject good content. */
export const goodItem = {
  ...base, id: "fixture-good-add", title: "Add two numbers", format: "code-short",
  data: codeData("function add(a, b) {\n  // TODO\n}"), tests: addTests,
  referenceSolution: "function add(a, b) { return a + b; }",
};
