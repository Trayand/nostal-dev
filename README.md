# Programming Hub

Mobile-first, offline PWA for daily programming practice — for a developer getting back into
shape. Indonesian explanations, English code. No backend, no account, no API costs.

- **Tracks:** logic, JavaScript, TypeScript, Go (learning + desktop challenges), SQL, concepts
- **Formats:** multiple-choice, predict-output, find-bug, fill-blank, parsons, flashcard,
  code-short, code-full (runs JS/TS/SQL in the browser), desktop (download starter + tests)
- **Learning engine:** 5 levels per track with auto level-up, weak-spot weighting,
  SM-2 spaced repetition, daily mixed session, streaks
- **Trustworthy content:** every executable answer is run by the validator before it can ship

## Quick start
```bash
npm install
npm run dev                  # http://localhost:3000 (no service worker in dev)
npm run build && npm run preview   # production build at http://localhost:4173 (offline, installable)
npm test                     # unit tests
npm run test:e2e             # Playwright smoke tests (after a build)
```

## Content
```bash
npm run content:validate     # schema + execute reference solutions/outputs
npm run content:build        # bundle verified items into public/content/
npm run content:review       # checklist for non-executable items
```
Generate more with Claude Code: `/gen-questions javascript 2 10`, `/review-content`, `/add-track`.

## Docs
- [MANUAL.md](MANUAL.md) — owner's manual (Indonesian): usage, deploy, writing questions, backup, troubleshooting
- [CLAUDE.md](CLAUDE.md) — conventions and rules for Claude Code
- [docs/CONCEPT.md](docs/CONCEPT.md) — vision, differentiators, modules
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — data flow, content pipeline, sandbox, storage, Phase 2 sync design
- [docs/CONTENT-AUTHORING.md](docs/CONTENT-AUTHORING.md) — exact question schema and rules
- [docs/ROADMAP.md](docs/ROADMAP.md) — phases and ideas backlog

## Stack
Next.js (App Router, static export) · TypeScript · Tailwind CSS · IndexedDB (idb) ·
CodeMirror 6 · sucrase · sql.js · zod · Vitest · Playwright
