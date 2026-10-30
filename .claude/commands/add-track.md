---
description: Scaffold a new learning track (folders, config, docs)
argument-hint: <track-id> ["Title"] [language]
---

Add a new track to nostal-dev. Arguments: `$ARGUMENTS`
(`<track-id>` kebab-case, optional title, optional language: javascript | typescript | sql | go | text).

1. Check `content/tracks.json`; stop if the id already exists.
2. Decide the track's `language`:
   - `javascript` / `typescript` / `sql` → executable formats are available.
   - anything else (e.g. git, http, system-design, python) → `text` (or `go` for Go-like learning
     tracks): only non-executable formats + `desktop`. **Do not add new runtimes** (Python etc.) —
     that is a roadmap item (docs/ROADMAP.md), not part of this command.
3. Append to `content/tracks.json`:
   `{ "id", "title" (in profile.json lang), "description" (one sentence), "language", "icon" (one emoji) }`.
4. Create `content/<track-id>/l1` … `l5`, each with an empty `.gitkeep`.
5. Nothing to change in code: the validator only allows `code-short`/`code-full` when the track's
   `language` is javascript, typescript or sql (`trackLanguages` in `src/lib/content/validate.ts`).
6. Docs: add the track to the track list in `MANUAL.md` (section "Track") and `docs/CONCEPT.md`
   (module list). Mention any format restrictions.
7. Run `npm run content:validate` and `npm run content:build` (the track appears with 0 questions;
   tracks with 0 questions are hidden in the UI).
8. Suggest next step: `/gen-questions <track-id> 1 10`.
