# nostal-dev — guide for Claude

Mobile-first, offline PWA for daily programming practice. Single user, static site,
**no backend, no accounts, no runtime LLM/API calls** (Phase 1). The owner reads this
code to learn Next.js, so keep it simple and readable.

## Stack
- Next.js (App Router) + TypeScript, `output: "export"` (static site in `out/`), Tailwind CSS v4.
- PWA: `public/manifest.webmanifest` + hand-written service worker (`src/sw/sw-template.js`,
  turned into `out/sw.js` by `scripts/gen-sw.ts` after `next build`).
- Storage: IndexedDB via `idb`, always behind the `StorageAdapter` interface (`src/lib/storage/`).
- Code editor: CodeMirror 6 (`src/components/editor/`).
- Execution sandbox: Web Workers in `public/workers/` (plain JS, shared by the app and the
  Node validator). JS native, TS transpiled with sucrase, SQL via sql.js (SQLite WASM).
- Content: JSON files in `content/`, validated with zod, built into `public/content/`.
- Tests: Vitest (`tests/`), Playwright smoke tests (`e2e/`).

## Layout
```
content/                  question bank (source of truth) + tracks.json
  <track>/l<level>/*.json  each file = JSON array of questions (one batch)
profile.json              owner preferences: lang, focus topics, weak areas, goal, level thresholds
public/workers/           sandbox runners (js-runner.js, sql-runner.js) — used by app AND validator
scripts/                  Node/TS tooling: content-validate/build/review, gen-sw, gen-icons, serve-out
src/app/                  routes (one folder per screen); all screens are client components
src/components/           UI; components/formats/ = one component per question format
src/lib/content/          zod schema, loader, answer checking
src/lib/runner/           browser side of the sandbox (spawns workers, timeouts)
src/lib/engine/           levels, SRS, stats, session builder (pure functions, unit tested)
src/lib/storage/          StorageAdapter interface, IndexedDB + memory implementations
.claude/commands/         /gen-questions, /review-content, /add-track
docs/                     CONCEPT, ARCHITECTURE, ROADMAP
```

## Commands
| Command | What |
|---|---|
| `npm run dev` | Dev server (no service worker in dev) |
| `npm run build` | content:build → next build → generate `out/sw.js` |
| `npm run preview` | Serve `out/` at http://localhost:4173 |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright smoke tests (needs a build first) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run content:validate` | Validate all content; `--promote` marks passing drafts `verified` |
| `npm run content:build` | Validate + bundle shippable content into `public/content/` |
| `npm run content:review` | Checklist of non-executable items for manual/LLM review |

Playwright uses its bundled Chromium; set `PW_CHANNEL=chrome` (or `msedge`) to use an installed browser.

## Writing content
Read `docs/CONTENT-AUTHORING.md` before creating or editing questions (exact schema per format,
predict-output formatting, SQL test shape). Use `/gen-questions`, `/review-content`, `/add-track`
in `.claude/commands/`. Owner-facing walkthrough (Indonesian): `MANUAL.md`.

## Rules
1. **Never ship unverified content.** Only items with `status: "verified"` or `"published"` that
   pass validation are bundled. Never hand-edit `public/content/` — it is generated.
2. **Never mark an item `verified` by hand without running `npm run content:validate`.**
   Executable items must pass their reference solution and their starter must fail.
3. **UI never touches IndexedDB directly** — only through `getStorage()` (`StorageAdapter`).
   New persisted data = new method on the interface + both implementations + export/import.
4. **No backend, auth, analytics, paid services, or runtime network calls** in Phase 1.
5. **No Go/Python execution.** Go content uses non-executable formats or `desktop`.
6. Sandbox code lives only in `public/workers/*.js` so the app and validator run the same code.
   User code must never get network or DOM access; always run it with a timeout.
7. UI text goes through `t()` (`src/lib/i18n.ts`), Indonesian first. Code/identifiers in English.
8. Mobile-first: tap targets ≥ 44px, no hover-only interactions, test at 360px width.
9. Keep dependencies minimal; justify any new one in docs/ARCHITECTURE.md.
10. Ambiguous requirement → choose the simplest option and note it in docs/ARCHITECTURE.md.

## Conventions
- Question ids: kebab-case, `<track>-<topic>-<nnn>` (e.g. `js-closures-003`). Unique across the bank.
- Pure logic (engine, checking, validation) has no React imports and has unit tests.
- Dates: attempts store ISO timestamps; SRS due dates are local `YYYY-MM-DD`.
- Comments explain *why*; keep them short.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
