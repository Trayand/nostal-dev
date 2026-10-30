---
description: Generate new verified questions for a track/level (draft → validate → fix → verified)
argument-hint: <track> <level> <count> [topic]
---

Generate questions for nostal-dev. Arguments: `$ARGUMENTS`
(format: `<track> <level> <count> [topic]`, e.g. `javascript 2 10 closures`).

## 1. Read context first
- `docs/CONTENT-AUTHORING.md` — the exact schema and rules for every format. Follow it strictly.
- `profile.json` — `lang` (write prompts/explanations in this language), `focusTopics`, `weakAreas`.
  Bias topic choice toward focus topics and weak areas that fit this track.
- `content/tracks.json` — the track must exist (otherwise stop and suggest `/add-track`).
- Existing questions in `content/<track>/` (all levels): list their `id`, `topic`, `title` so you
  **avoid duplicates**, reuse existing topic names, and continue id numbering.

## 2. Plan the batch
- If a topic is given, all questions use it; otherwise spread over 3–5 relevant topics.
- Mix formats suited to the track:
  - `logic`, `javascript`, `typescript`: ~40% executable (`code-short`, `code-full`, or
    `predict-output`), the rest `multiple-choice`, `find-bug`, `fill-blank`, `parsons`.
    Prefer adding `entry` + `tests` to fill-blank/parsons so they are execution-verified.
  - `sql`: mostly `code-short`/`code-full` (SQLite), some MC/find-bug.
  - `go`: never executable. Use MC, predict-output, find-bug, fill-blank, parsons; at L3+ add a
    `desktop` challenge with go.mod + starter + table-driven `_test.go`.
  - `concepts`: mostly `flashcard`, some `multiple-choice`.
- Match the requested level's difficulty (see "Levels" in the authoring doc).

## 3. Write
- Create `content/<track>/l<level>/<topic-or-mix>-<YYYY-MM-DD>.json` (JSON array).
- Every item: `"status": "draft"`, `"source": { "model": "<your model id>", "date": "<today>" }`.

## 4. Validate and fix (max 3 rounds)
- Run `npm run content:validate -- --file <your file>`.
- For each failing item, read the error, fix the **question** (wrong stored output, wrong expected
  rows, starter that already passes, schema typos…). Never weaken tests just to pass.
  If the reference solution is wrong, fix the solution; if the stored answer is wrong, fix the answer.
- Repeat up to 3 rounds. Items still failing after 3 rounds: delete them from the file and list them
  in your report with the last error.

## 5. Self-review non-executable items
Items the validator can only check structurally (MC, find-bug, flashcard, Go, non-tested
fill-blank/parsons) — re-read each one as a skeptical reviewer: is the marked answer really the only
correct one? Is the explanation factually right? Fix or delete doubtful items. Add
`"reviewed": { "by": "<model id> (self-review)", "date": "<today>" }` to the ones you checked.

## 6. Promote
- Run `npm run content:validate -- --file <your file> --promote` (marks passing drafts `verified`).
- Run `npm run content:build` and confirm the new items are shipped.

## 7. Report
Short summary: file written, count per format, how many verified, how many rejected (and why),
and anything the owner should review manually (`npm run content:review`).
