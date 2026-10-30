# Roadmap

## Phase 1 — Offline single-user PWA (this release)
- [x] P0 Foundation: Next.js static export, Tailwind, PWA shell (manifest + service worker),
      storage adapter + IndexedDB
- [x] P1 Content engine: zod schema, validator that executes answers, JS/TS/SQL sandboxes,
      content build, Vitest
- [x] P2 Question UIs: 9 formats, CodeMirror editor + mobile symbol toolbar, test results panel,
      desktop challenges with ZIP download
- [x] P3 Learning engine: levels, weak-spot weighting, SM-2 SRS, daily session, progress,
      export/import
- [x] P4 Content: Claude commands (`/gen-questions`, `/review-content`, `/add-track`) and the initial
      verified bank (≥ 15 per track)
- [x] P5 Docs & polish: MANUAL, docs, Playwright smoke tests, 360 px pass

## Phase 2 — Accounts & sync
Design in `docs/ARCHITECTURE.md` §8.
- [ ] `SyncAdapter` wrapping IndexedDB with an outbox (no UI change)
- [ ] API: push/pull with change cursor; Postgres (Supabase) or Cloudflare D1
- [ ] Auth: passkeys or magic link; anonymous mode stays
- [ ] First sign-in merges local data; conflict rules = current merge rules (append-only attempts,
      LWW for the rest)
- [ ] Sync status indicator + "last synced" in Settings

## Ideas backlog
Content & tracks
- [x] **System design** track (flashcards + scenario MC) — added; scenario walkthroughs still open
- [ ] **Interview prep** mode: timed L4–L5 sets, mock-interview checklist
- [x] **Git** track (MC, find-bug, parsons) — added
- [ ] Git: in-browser simulated repo (commit graph exercises)
- [x] **HTTP & Web** track — added
- [ ] **Python** track with Pyodide (WASM) — lazy-loaded, ~10 MB, opt-in download
- [x] **React** track (plain-JS logic executable; hooks as MC/find-bug) — added
- [ ] More tracks: Node.js, regex, Linux shell, data structures
- [ ] Spaced "concept chains": a flashcard unlocks related code questions

Learning
- [ ] Optional level-down suggestion after a long slump
- [ ] Per-topic mastery view and goals ("master SQL joins this week")
- [ ] Mistake notebook: auto-collected wrong answers with notes
- [ ] Weekly review summary screen

App
- [ ] Syntax-highlighted static code blocks (reuse CodeMirror's highlighter)
- [ ] Drag-and-drop for parsons on desktop (keep buttons for mobile/a11y)
- [ ] iOS keyboard handling via `visualViewport` for the code toolbar
- [ ] Notifications/reminders for the daily goal (Web Push needs a server → Phase 2)
- [ ] Content packs: import extra question bundles from a URL/file without rebuilding
- [ ] i18n of content (parallel `prompt_en` fields) if sharing with non-Indonesian users

Tooling
- [ ] Run Go desktop challenges' reference solutions in CI (with Go installed) to verify them
- [ ] Second-model review in CI for non-executable items
- [ ] GitHub Action: validate + build + deploy to Pages on push
