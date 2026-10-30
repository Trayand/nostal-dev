---
description: Second-pass factual review of non-executable questions; report and fix
argument-hint: [track] [--all]
---

Review nostal-dev content that cannot be verified by running code. Arguments: `$ARGUMENTS`
(optional track id; `--all` to re-review items that already have a `reviewed` stamp).

1. Run `npm run content:review -- [--track <track>] [--all]`. It writes
   `reports/review-checklist.md` listing every non-executable item (MC, find-bug, flashcard, Go,
   untested fill-blank/parsons, non-JS predict-output) without a `reviewed` stamp.
2. Read `docs/CONTENT-AUTHORING.md` for the quality bar.
3. For each item in the checklist, check as a skeptical expert:
   - Is the marked answer correct and the **only** correct option? Any outdated facts
     (language versions, HTTP/Git behaviour)?
   - For Go: would the code compile? Is the claimed output/bug real (reason step by step)?
   - Does the explanation match the answer and teach the "why"? Are hints progressive?
   - Is the level appropriate? Is the Indonesian wording clear?
4. Fix problems directly in the JSON file (the path is in the checklist). If an item cannot be
   fixed confidently, set its `status` back to `"draft"` so it stops shipping, and say why.
5. For every item judged correct (after fixes), add
   `"reviewed": { "by": "<model id>", "date": "<YYYY-MM-DD>", "note": "<optional>" }`.
6. Run `npm run content:validate` (must stay green) and `npm run content:build`.
7. Report: items reviewed, fixed (what changed), demoted to draft, and anything needing the
   owner's judgement.
