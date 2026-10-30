import { z } from "zod";

// Question schema. Content lives in content/<track>/l<level>/*.json (each file
// is a JSON array). See MANUAL.md for a walkthrough with one example per format.

export const LANGUAGES = ["javascript", "typescript", "sql", "go", "text"] as const;
export const EXEC_LANGUAGES = ["javascript", "typescript"] as const;
export const FORMATS = [
  "multiple-choice", "predict-output", "find-bug", "fill-blank", "parsons",
  "flashcard", "code-short", "code-full", "desktop",
] as const;
export const STATUSES = ["draft", "verified", "published"] as const;

const language = z.enum(LANGUAGES);
const md = z.string().min(1);
const entry = z.string().regex(/^[A-Za-z_$][\w$]*$/, "entry must be a plain function name");

/** JS/TS test: call `data.entry(...input)` and deep-compare with `expected`. */
export const jsTest = z.object({
  name: z.string().optional(),
  input: z.array(z.unknown()),
  expected: z.unknown(),
});

/** SQL test: optional extra setup SQL, then compare the query result set. */
export const sqlTest = z.object({
  name: z.string().optional(),
  setup: z.string().optional(),
  expected: z.object({
    columns: z.array(z.string()),
    rows: z.array(z.array(z.unknown())),
  }),
  /** If false, row order is ignored (default true only when the query should ORDER BY). */
  ordered: z.boolean().default(false),
});

const base = {
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "id must be kebab-case (a-z, 0-9, -)"),
  track: z.string().min(1),
  level: z.number().int().min(1).max(5),
  topic: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "topic must be kebab-case"),
  tags: z.array(z.string()).default([]),
  title: z.string().min(3),
  prompt: md,
  hints: z.array(md).max(2, "max 2 progressive hints").default([]),
  explanation: md,
  estimatedMinutes: z.number().positive().max(240),
  source: z
    .object({ model: z.string(), date: z.string(), note: z.string().optional() })
    .optional(),
  reviewed: z.object({ by: z.string(), date: z.string(), note: z.string().optional() }).optional(),
  status: z.enum(STATUSES),
  referenceSolution: z.string().optional(),
};

const multipleChoice = z.strictObject({
  ...base,
  format: z.literal("multiple-choice"),
  data: z.strictObject({
    options: z.array(z.string().min(1)).min(2).max(6),
    code: z.string().optional(),
    language: language.optional(),
  }),
  answer: z.object({ index: z.number().int().min(0) }),
  tests: z.array(z.never()).default([]),
});

const predictOutput = z.strictObject({
  ...base,
  format: z.literal("predict-output"),
  data: z.strictObject({
    language,
    code: z.string().min(1),
    /** Optional choices; if absent the user types the output. */
    options: z.array(z.string()).min(2).max(6).optional(),
  }),
  /** Exact console output, lines joined with "\n". JS/TS snippets are executed to verify it. */
  answer: z.object({ output: z.string() }),
  tests: z.array(z.never()).default([]),
});

const findBug = z.strictObject({
  ...base,
  format: z.literal("find-bug"),
  data: z.strictObject({ language, code: z.string().min(1) }),
  /** 1-based line number of the bug, plus the corrected line shown after answering. */
  answer: z.object({ line: z.number().int().min(1), fixedLine: z.string().optional() }),
  tests: z.array(z.never()).default([]),
});

const fillBlank = z.strictObject({
  ...base,
  format: z.literal("fill-blank"),
  data: z.strictObject({
    language,
    /** Code with one `{{blank}}` marker per blank. */
    template: z.string().includes("{{blank}}", { message: "template needs at least one {{blank}}" }),
    /** Optional word bank (recommended on mobile). */
    choices: z.array(z.string()).optional(),
    /** For JS/TS: function to call when `tests` are given (validator fills blanks and runs them). */
    entry: entry.optional(),
  }),
  /** Accepted answers per blank, in order. First entry is the canonical one. */
  answer: z.object({ blanks: z.array(z.array(z.string().min(1)).min(1)).min(1) }),
  tests: z.array(jsTest).default([]),
});

const parsons = z.strictObject({
  ...base,
  format: z.literal("parsons"),
  data: z.strictObject({ language, entry: entry.optional() }),
  /** Lines in the correct order (indentation included). The app shuffles them. */
  answer: z.object({ lines: z.array(z.string()).min(3).max(12) }),
  tests: z.array(jsTest).default([]),
});

const flashcard = z.strictObject({
  ...base,
  format: z.literal("flashcard"),
  data: z.strictObject({}).default({}),
  /** `prompt` is the front of the card, `answer.back` the back (markdown). */
  answer: z.object({ back: md }),
  tests: z.array(z.never()).default([]),
});

const codeData = z.strictObject({
  language: z.enum(["javascript", "typescript", "sql"]),
  starter: z.string(),
  /** JS/TS: name of the function the tests call. */
  entry: entry.optional(),
  /** SQL: CREATE TABLE statements and INSERTs. */
  schema: z.string().optional(),
  seed: z.string().optional(),
});

const codeShort = z.strictObject({
  ...base,
  format: z.literal("code-short"),
  data: codeData,
  answer: z.object({}).default({}),
  tests: z.array(z.union([jsTest, sqlTest])).min(1),
  referenceSolution: z.string().min(1),
});

const codeFull = codeShort.extend({ format: z.literal("code-full") });

const desktop = z.strictObject({
  ...base,
  format: z.literal("desktop"),
  data: z.strictObject({
    language,
    files: z
      .array(
        z.object({
          path: z.string().regex(/^[\w./-]+$/, "plain relative path"),
          content: z.string(),
          kind: z.enum(["starter", "test", "other"]),
        }),
      )
      .min(1),
    /** Command to run locally, e.g. "go test ./...". */
    command: z.string().min(1),
  }),
  answer: z.object({}).default({}),
  tests: z.array(z.never()).default([]),
});

export const questionSchema = z.discriminatedUnion("format", [
  multipleChoice, predictOutput, findBug, fillBlank, parsons, flashcard, codeShort, codeFull, desktop,
]);

export type Question = z.infer<typeof questionSchema>;
export type QuestionFormat = Question["format"];
export type JsTest = z.infer<typeof jsTest>;
export type SqlTest = z.infer<typeof sqlTest>;
export type CodeQuestion = Extract<Question, { format: "code-short" | "code-full" }>;
export type Status = (typeof STATUSES)[number];

export const EXECUTABLE_FORMATS: QuestionFormat[] = ["code-short", "code-full"];

/** Cross-field rules zod's shape can't express. Returns human-readable errors. */
export function semanticErrors(q: Question): string[] {
  const errors: string[] = [];
  switch (q.format) {
    case "multiple-choice":
      if (q.answer.index >= q.data.options.length) errors.push("answer.index is out of range of data.options");
      if (new Set(q.data.options).size !== q.data.options.length) errors.push("data.options has duplicates");
      break;
    case "predict-output":
      if (q.data.options && !q.data.options.includes(q.answer.output)) {
        errors.push("answer.output must be one of data.options");
      }
      break;
    case "find-bug": {
      const lines = q.data.code.split("\n").length;
      if (q.answer.line > lines) errors.push(`answer.line ${q.answer.line} > number of code lines (${lines})`);
      break;
    }
    case "fill-blank": {
      const count = q.data.template.split("{{blank}}").length - 1;
      if (count !== q.answer.blanks.length) {
        errors.push(`template has ${count} {{blank}} markers but answer.blanks has ${q.answer.blanks.length}`);
      }
      if (q.data.choices) {
        q.answer.blanks.forEach((accepted, i) => {
          if (!accepted.some((a) => q.data.choices!.includes(a))) {
            errors.push(`blank ${i + 1}: none of its accepted answers is in data.choices`);
          }
        });
      }
      if (q.tests.length && !q.data.entry) errors.push("data.entry is required when tests are given");
      break;
    }
    case "parsons":
      if (new Set(q.answer.lines).size !== q.answer.lines.length) {
        errors.push("answer.lines must be unique (identical lines make the order ambiguous)");
      }
      if (q.tests.length && !q.data.entry) errors.push("data.entry is required when tests are given");
      break;
    case "code-short":
    case "code-full": {
      const isSql = q.data.language === "sql";
      if (isSql && !q.data.schema) errors.push("SQL questions need data.schema");
      if (!isSql && !q.data.entry) errors.push("JS/TS questions need data.entry");
      q.tests.forEach((t, i) => {
        const isJsTest = "input" in t;
        if (isSql && isJsTest) errors.push(`tests[${i}] must be a SQL test ({ expected: { columns, rows } })`);
        if (!isSql && !isJsTest) errors.push(`tests[${i}] must be a JS test ({ input: [...], expected })`);
      });
      break;
    }
    case "desktop":
      if (!q.data.files.some((f) => f.kind === "starter")) errors.push("desktop needs at least one starter file");
      break;
  }
  if (q.track === "go" && (q.format === "code-short" || q.format === "code-full")) {
    errors.push("go track cannot use executable formats (use desktop or non-executable formats)");
  }
  return errors;
}
