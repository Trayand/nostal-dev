# Concept

## Vision
A pocket gym for programming. Ten to fifteen minutes a day, one thumb, on the train or in a queue,
and the skills that faded during a long break come back — then keep growing toward
interview-grade problems.

## Who it's for
One person: a developer **returning to programming after a long break**. They know roughly how
things work but have lost fluency: syntax details, async semantics, SQL joins, Git commands.
They want short daily practice, honest feedback, and to see progress.

## Differentiators
- **Returning-developer path** — starts with warm-ups (L1) that rebuild fluency fast, then climbs
  to interview-grade (L5). Adaptive: weak topics come back more often; concepts are kept fresh with
  spaced repetition.
- **Indonesian explanations** — prompts, hints and explanations are in Indonesian (configurable);
  code and identifiers stay in English, the way real code is written.
- **Mobile-first, not mobile-tolerated** — answer formats designed for thumbs: tap the buggy line,
  pick from a word bank, reorder lines, predict output. Real coding is still possible with a symbol
  toolbar, and big problems move to the desktop with a downloadable starter + tests.
- **Offline and free** — a static PWA: no account, no server, no API costs, works in airplane mode.
- **Owner-customizable** — content and preferences are plain files (`content/`, `profile.json`).
  New questions are generated with Claude Code (`/gen-questions`) and **verified by running them**
  before they can ship.
- **Trustworthy content** — every executable claim (reference solution, expected output, SQL result)
  is executed in the same sandbox the app uses. Non-executable items go through a review checklist.

## Modules
| Module | What it does |
|---|---|
| Today | Daily mixed session (new + review + weak spots), streak, daily goal |
| Practice | Pick track → level → topic and drill |
| Question formats | multiple-choice, predict-output, find-bug, fill-blank, parsons, flashcard, code-short, code-full, desktop |
| Code runner | In-browser sandbox: JavaScript, TypeScript (transpiled), SQL (SQLite WASM) |
| Learning engine | 5 levels per track, auto level-up, weak-spot weighting, SM-2 spaced repetition |
| Cards | Spaced-repetition queue for concept flashcards |
| Progress | Accuracy per track/level, weak topics, streak calendar, history |
| Desktop challenges | Go and large problems: download starter + tests, run locally |
| Settings | Theme, language, daily goal, export/import backup, reset, install help |
| Content pipeline | Schema, validator (executes answers), build, review checklist |
| Claude commands | `/gen-questions`, `/review-content`, `/add-track` |

## Tracks (initial)
| Track | Language | Executable in browser |
|---|---|---|
| logic | JavaScript | yes |
| javascript | JavaScript | yes |
| typescript | TypeScript (types stripped) | yes (runtime behaviour only) |
| go | Go | **no** — learning formats + desktop challenges with `go test` |
| sql | SQLite | yes |
| concepts | — | no — flashcards + multiple choice |

## Non-goals (Phase 1)
Accounts, sync, backend, analytics, paid services, runtime AI calls, Go/Python execution,
social features.
