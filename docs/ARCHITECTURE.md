# Architecture

nostal-dev is a **static site** (Next.js `output: "export"`). There is no server code at
runtime: the browser downloads HTML/JS/JSON once, the service worker caches everything, and all
state lives in IndexedDB on the device.

```
 content/*.json ──(npm run content:build)──► public/content/*.json ─┐
 profile.json ───────────(bundled at build)──────────────────────────┤
                                                                     ▼
                        next build ──► out/ (static files) ──► gen-sw ──► out/sw.js
                                                                     │
 Browser ── service worker (cache-first, offline) ◄──────────────────┘
    │
    ├─ React screens (src/app/*) ── engine (src/lib/engine) ── StorageAdapter ── IndexedDB
    └─ code runs ── src/lib/runner ── Web Worker (public/workers/*.js) ── sql.js WASM
```

## 1. Content pipeline

1. **Authoring** — questions are JSON arrays in `content/<track>/l<level>/*.json`, written by hand
   or by `/gen-questions`. New items are `status: "draft"`. Reference: `docs/CONTENT-AUTHORING.md`.
2. **Validation** — `npm run content:validate` (`scripts/content-validate.ts` →
   `src/lib/content/validate.ts`):
   - zod schema (`src/lib/content/schema.ts`), **strict** so typo'd field names are errors;
   - cross-field rules (answer index in range, blank count, unique parsons lines, …);
   - folder must match track/level; track must exist; executable formats only on tracks whose
     `language` is javascript/typescript/sql (so `go` can never execute);
   - duplicate ids (error), near-duplicate titles in a track (warning, token Jaccard ≥ 0.75),
     identical prompts (error);
   - **execution** (`src/lib/content/verify.ts`), using the same worker files as the app:
     - `code-short`/`code-full`: `referenceSolution` must pass **all** tests and the `starter` must
       **fail** (otherwise the question is trivial or the tests are weak);
     - SQL: reference query on schema + seed (+ per-test setup) must equal the expected result set;
     - JS/TS `predict-output`: snippet is run and its output must equal `answer.output`;
     - JS/TS `fill-blank`/`parsons` with tests: the canonical answer must pass the tests.
   - `--promote` flips passing drafts to `verified`.
3. **Build** — `npm run content:build` re-validates everything and bundles only items that are
   `verified`/`published` **and** pass. Markdown is pre-rendered to HTML at build time (with raw
   HTML escaped), so the app ships no markdown library. Output: `public/content/index.json`
   (track summaries + light question summaries) and `public/content/<track>.json`. Failures are
   listed in `reports/build-report.md` and never shipped.
4. **Review** — non-executable items are listed by `npm run content:review` in
   `reports/review-checklist.md` for manual or LLM review (`/review-content`), which stamps
   `reviewed: { by, date }`.

## 2. Execution sandbox

`public/workers/js-runner.js` and `public/workers/sql-runner.js` are plain JavaScript files —
deliberately not bundled — so **the same file** runs:
- in the app as a Web Worker (`src/lib/runner/browser.ts`), and
- in the validator inside a Node `worker_thread` with a 10-line shim that provides `self`,
  `postMessage` and `onmessage` (`scripts/lib/node-runner.ts`).

`src/lib/runner/run.ts` is shared logic on top of an `Executor` interface (TS → JS transpile with
sucrase, response shaping, output normalisation).

Safety and limits:
- Workers have no DOM. Network/storage APIs (`fetch`, `XMLHttpRequest`, `WebSocket`,
  `importScripts`, `indexedDB`, …) are deleted before user code runs.
- A **fresh worker per run**; the caller terminates it after a timeout (3 s JS, 8 s SQL) — this is
  what stops infinite loops.
- User code runs via `new Function` in sloppy mode (like a classic script). Timers and promises are
  tracked so async snippets finish before output is collected.
- `console.log` uses our own single-line Node-like formatter, identical in app and validator.
- SQL: each test opens a new in-memory SQLite DB: schema → seed → test setup → query. Result sets
  are compared on lower-cased column names and rows (numbers rounded to 1e-6; unordered unless
  `ordered: true`).
- TypeScript: types are stripped, never checked. Type-system topics use non-executable formats.

## 3. Storage

All persistence goes through `StorageAdapter` (`src/lib/storage/types.ts`):
`getProgress, getAttempts, saveAttempt, get/saveSrsCard(s), get/saveTrackState(s),
get/saveSettings, get/saveCodeDraft, exportAll, importAll(mode), resetAll`.

- `IndexedDbAdapter` (via `idb`) — stores: `attempts`, `srs`, `trackStates`, `settings`, `drafts`.
- `MemoryAdapter` — tests and fallback when IndexedDB is unavailable.
- `getStorage()` (`src/lib/storage/index.ts`) is the single place that picks the adapter.
- Attempts are **append-only** with unique ids. All other records carry `updatedAt`.
- Export = one JSON file (validated with zod on import). Import modes: `replace`, or `merge`
  (attempts unioned by id; other records last-write-wins by `updatedAt`) — `src/lib/storage/merge.ts`.

Small per-device conveniences use `localStorage`: the theme (so the first paint is correct) and
the in-progress daily session (for "Continue session"). Losing them is harmless.

## 4. Learning engine (`src/lib/engine/`, pure functions, unit tested)

- **Levels** (`levels.ts`): a track levels up when accuracy ≥ `levelUpAccuracy` over the last
  `windowSize` attempts *at the current level* (defaults 0.8 / 10, from `profile.json`). Levels never
  go down automatically; the learner can practise any level manually.
- **SRS** (`srs.ts`): SM-2 simplified. Every answered question gets a card. Grade from outcome:
  solution shown → 0, wrong → 1, right with hints → 3, right → 4; flashcards self-grade 1/3/4/5.
  Intervals 1 → 3 → interval × ease; ease ≥ 1.3; "easy" ×1.3 bonus.
- **Weights** (`session.ts`): unseen ×1.5, low topic accuracy up to ×3, recent misses up to ×2.5,
  `weakAreas` ×1.5, `focusTopics` ×1.3, correct in the last 2 days ×0.2.
- **Daily session**: target = goal minutes ÷ average estimated minutes (5–15 items):
  ≤ 40 % due reviews, ~30 % weak-topic items, rest new items at each track's current level.
  Desktop challenges are never in sessions. Seeded RNG makes it testable.
- **recordOutcome** (`record.ts`): attempt → SRS update → level check (one place, used by all screens).

## 5. PWA

- `public/manifest.webmanifest` uses relative URLs so it works under any base path.
- `src/sw/sw-template.js` is a small hand-written service worker. After `next build`,
  `scripts/gen-sw.ts` lists every file in `out/` and writes `out/sw.js` with that precache list and a
  content hash as cache name. Strategy: precache on install, cache-first with `ignoreSearch`
  (covers `?_rsc=` payloads and `/session/?mode=…`), network fallback, old caches deleted on
  activate.
- Updates: a new SW waits; the app shows "new version available" and sends `SKIP_WAITING` when the
  user taps reload. (First install never reloads the page.)
- The SW is only registered in production builds (`npm run build && npm run preview`).

## 6. Dependencies (and why)

| Dependency | Why |
|---|---|
| next, react, react-dom | Framework (App Router, static export) |
| tailwindcss, @tailwindcss/postcss | Styling with design tokens |
| idb | Tiny promise wrapper over IndexedDB |
| zod | Content schema + import validation with readable errors |
| codemirror + @codemirror/* | Mobile-capable code editor (lazy-loaded) |
| sucrase | Fast, small TS → JS transform in the browser (lazy-loaded) |
| sql.js | SQLite in WebAssembly for SQL questions |
| marked (dev) | Markdown → HTML at content build time only |
| vitest, @playwright/test, fake-indexeddb, tsx (dev) | Tests and TS scripts |

Deliberately **not** used: a PWA plugin (Serwist/next-pwa — the hand-written SW is ~70 lines and
works with static export + Turbopack), a ZIP library (`src/lib/zip.ts`, store-only), an image
library for icons (`scripts/gen-icons.ts`), an icon font, a state manager.

## 7. Decisions on ambiguous requirements

| Topic | Decision |
|---|---|
| Content file granularity | One file **per batch** (JSON array), not per question — fewer files, one file per `/gen-questions` run. |
| Statuses shipped | `verified` and `published` (published = verified + intended as stable). Drafts never ship. |
| "Show solution" | Ends the question, recorded as incorrect, SRS grade 0. |
| Code questions retries | Code can be re-run until it passes (correct) or the learner shows the solution. Other formats: first Check is final. |
| Hints | Max 2 per question; using hints keeps the answer correct but lowers the SRS grade. |
| predict-output answer format | Our sandbox's single-line Node-like format (documented in CONTENT-AUTHORING). |
| Level-down | Not automatic; manual level choice in Practice. |
| UI language vs content language | UI switchable (id/en) in Settings; content is written in `profile.json` `lang`. |
| profile.json at runtime | Bundled at build time (rebuild after editing). Settings screen overrides goal/lang per device. |
| Lighthouse PWA audit | Lighthouse ≥ 12 removed the PWA category; installability/offline are checked by Playwright instead (`e2e/pwa.spec.ts`). |
| Desktop "done" | Marked manually by the learner (counts as a correct attempt, not in SRS). |

## 8. Phase 2 plan: backend, accounts, sync

Goal: same app, optional sign-in, progress synced across devices. Still offline-first.

**Shape**
```
UI ── getStorage() ── SyncAdapter ──┬── IndexedDbAdapter (source of truth on device)
                                    └── SyncClient ── HTTPS ── API (+ auth) ── Postgres
```
- `SyncAdapter implements StorageAdapter`: every write goes to IndexedDB first (instant, offline),
  then is appended to an outbox store. Reads always come from IndexedDB. **No UI change.**
- Sync loop (on app start, on `online`, every few minutes, after N writes):
  1. `POST /sync/push` the outbox (attempts, SRS cards, track states, settings, drafts).
  2. `GET /sync/pull?since=<cursor>` returns records changed on the server since the cursor.
  3. Merge with the same rules as `mergeExports` and store the new cursor.
- **Conflict strategy** (already implemented for import/merge):
  - attempts: append-only, unique ids → union, never conflict;
  - SRS cards, track states, settings, drafts: last-write-wins on `updatedAt` (server keeps the
    newer one; ties broken by device id). Acceptable for a single learner on a few devices. If it
    ever matters, SRS could be recomputed from the attempt log, which is conflict-free.
  - Clock skew: server stamps `receivedAt`; LWW uses client `updatedAt` but clamps future dates.
- **Auth**: passkeys or email magic link (no passwords to store); session cookie or short-lived JWT.
  Hosted options: Supabase (Postgres + auth + row-level security) or Cloudflare Workers + D1.
  Anonymous use keeps working; signing in uploads the local data once (merge).
- **Server schema** (sketch): `users`, `devices`, `attempts(user_id, id, …, received_at)`,
  `records(user_id, kind, key, json, updated_at, received_at)` with a per-user change cursor.
- **Content** stays static (still built from `content/`), so the backend only stores progress.
- Hosting must move off pure static only for the API; the PWA itself can stay on Pages/Vercel.
