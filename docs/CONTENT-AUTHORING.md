# Content authoring reference

Precise rules for writing questions — used by `/gen-questions`, `/review-content` and
anyone writing JSON by hand. The source of truth for the shape is
`src/lib/content/schema.ts` (zod, **strict**: unknown fields are errors).
The owner-facing walkthrough (Indonesian) is in `MANUAL.md`.

## Files
- Location: `content/<track>/l<level>/<batch-name>.json` — a **JSON array** of questions.
  Folder track/level must match each item's `track`/`level`.
- One file per generation batch, e.g. `content/javascript/l2/closures-2026-10-25.json`.
- New items start as `"status": "draft"`. Only `verified`/`published` items ship.
- `npm run content:validate -- --track <id>` validates; `--promote` flips passing drafts to `verified`.

## Common fields (every format)
| field | rule |
|---|---|
| `id` | kebab-case, unique in the whole bank: `<track-short>-<topic>-<nnn>` (`js-closures-004`, `sql-joins-002`) |
| `track`, `level` | track id from `content/tracks.json`; level 1–5 |
| `format` | one of the formats below |
| `topic` | kebab-case, reuse existing topics where possible (check the bank first) |
| `tags` | short kebab-case strings |
| `title` | short, distinct (near-duplicate titles in a track are flagged) |
| `prompt` | markdown, in `profile.json` `lang` (Indonesian by default). Code identifiers stay English |
| `hints` | exactly 2, progressive: first a nudge, second nearly the answer (flashcards may have 1) |
| `explanation` | markdown: *why* the answer is right and the common mistake |
| `estimatedMinutes` | realistic: MC 1, predict 1–2, code-short 2–4, code-full 5–20, desktop 15–60 |
| `source` | `{ "model": "<model id>", "date": "YYYY-MM-DD" }` |
| `status` | `draft` when written |
| `reviewed` | optional `{ "by", "date", "note"? }` — set by `/review-content` after a factual check |

## Levels
L1 Warm-up (syntax, one concept) · L2 Basic (combine 2 ideas) · L3 Intermediate (common
real-world patterns, edge cases) · L4 Advanced (subtle semantics, performance) ·
L5 Interview-grade (classic interview problems, tricky reasoning).

## Formats

### multiple-choice
`data: { options: string[2..6], code?, language? }`, `answer: { index }` (0-based).
Exactly one correct option; distractors must be plausible. Options are inline markdown.

### predict-output
`data: { language, code, options? }`, `answer: { output }`.
- JS/TS snippets are **executed by the validator**; `answer.output` must equal the real output.
- Output format = our sandbox's single-line Node-like `console.log`:
  `[ 1, 2 ]`, `{ a: 1, b: 'x' }`, `Map(1) { 'k' => 1 }`, `Set(2) { 1, 2 }`, top-level strings raw,
  nested strings in single quotes, multiple args joined by a space, one line per call.
  Prefer printing primitives or `JSON.stringify(...)` to avoid formatting ambiguity.
- A thrown error appears as a final line `Uncaught TypeError: <V8 message>`. Avoid relying on exact
  error messages; prefer questions where the output is printed values.
- Snippets run as a classic (sloppy-mode) script body, not a module: no `import`/`export`,
  avoid top-level `this`. Timers and promises are awaited (event-loop questions work).
- If `options` is given, `answer.output` must be exactly one of them.
- Go predict-output is allowed but **not executed** — double-check it by reasoning.

### find-bug
`data: { language, code }`, `answer: { line (1-based), fixedLine? }`. Exactly one buggy line.

### fill-blank
`data: { language, template, choices?, entry? }`, `answer: { blanks: string[][] }`, `tests?`.
- `template` contains one `{{blank}}` per blank; `blanks[i]` = accepted answers (first = canonical).
- `choices` (word bank) strongly recommended for mobile; must contain an accepted answer per blank.
- For JS/TS, add `entry` + `tests` so the validator fills the canonical answers and runs the tests.

### parsons
`data: { language, entry? }`, `answer: { lines: string[3..12] }` (correct order, keep indentation).
Lines must be unique (`"  }"` vs `"}"` are different). JS/TS: add `entry` + `tests` to verify.

### flashcard
`data: {}` (or omit), `prompt` = front, `answer: { back }` (markdown). Concepts track mostly.

### code-short / code-full (JS, TS, SQL only — never Go)
`data: { language, starter, entry?, schema?, seed? }`, `tests`, `referenceSolution` (required).
- **JS/TS**: `entry` = function name. Test = `{ "name"?, "input": [args...], "expected": value }`.
  The function is called `entry(...input)` (async functions are awaited) and deep-compared
  (numbers ±1e-9, JSON values only). Starter keeps the signature and must **fail** the tests.
- **TS** is transpiled (types stripped) — no type checking. Type-level topics → MC/predict/find-bug.
- **SQL** (SQLite): `schema` = CREATE TABLEs, `seed` = INSERTs. Test =
  `{ "name"?, "setup"?, "expected": { "columns": [...], "rows": [[...]] }, "ordered": bool }`.
  Each test uses a fresh DB (schema → seed → setup → query). Column names compared case-insensitive.
  Use `"ordered": true` only when the task requires ORDER BY. Starter: `"-- tulis query di sini\n"`.
- code-short: 1–5 lines of work. code-full: a full function; ≥10 min gets a "better on desktop" hint.
- Include edge-case tests (empty input, zero, negatives, duplicates, NULLs).

### desktop (Go and big challenges)
`data: { language, files: [{ path, content, kind: starter|test|other }], command }`,
optional `referenceSolution`. For Go: `go.mod` (`go 1.22`), a starter file that compiles but fails,
and a `_test.go` file with table-driven tests; `command: "go test ./..."`. Not executed by the
validator — make sure the starter compiles and the reference passes the tests by careful reading.

## Quality bar
- One unambiguous correct answer. Explanations teach, not just restate.
- No trivia about obscure APIs at L1–L3. Realistic code, English identifiers.
- Don't duplicate existing questions (check titles/topics in the track first).
- Indonesian prose: natural, concise, technical terms may stay English (closure, callback, query).
