# Working logs (keep this file open and fill it in as you go)

These feed sections 5 and 6 of the submission. One line per entry is plenty. Write it the moment it happens, not at the end.

## Decision Log
Format: `[min] Decision | options | picked | why`
(min = minutes after the 17:48 UTC start)

- [24] Login | real login (Supabase) vs mock login with seeded users | Supabase first, reverted to mock at [52] | Supabase sign-in was merged in PR #4. The user asked to revert so the basics could be checked first (PR #5). The brief allows mock login.
- [84] Database URL | web URL vs Postgres URI in DATABASE_URL | refuse a web URL at startup with a clear message, and check it in CI | Render deploy crashed on the Supabase project URL. The startup guard and the CI boot check stop the same mistake before deploy.
- [55] Editor layout | keep the first layout vs redesign | redesign (PR #6) | a centered page, sticky action bar and grouped toolbar read more like a document editor. Handlers and labels stayed the same, so tests kept passing.
- [100] Home page | plain list vs hero, stats and colored cards | hero and cards (PR #7) | makes owned and shared documents easy to scan. Only classes and markup changed.
- [115] Dictation | OpenWhispr vs browser speech API | browser speech API (PR #8) | OpenWhispr is a desktop Electron app and cannot be embedded in a web app. The browser API needs no extra dependency. Works in Chrome and Edge, with a note elsewhere.
- [118] Export | PDF library vs browser print dialog; Markdown via turndown | print dialog for PDF, turndown for Markdown (PR #9) | keeps the bundle small. Underline is dropped from Markdown because Markdown cannot show it.
- [123] Versions | full history table vs snapshot on save | snapshot on manual Save and before restore, one table, three endpoints (PR #10) | fits the time left. A restore can be undone, because the current state is saved first. Autosave does not add versions.
- [141] Cleanup | keep the assignment text and drafts in the repo vs remove | removed prompt and submission drafts, the unused VersionFull schema and dead ignore rules (PR #12) | the user asked for it. Working log and root docs stay.
- [142] Security | fix now vs document | no high-severity finding, so no code change. Limits written down: mock header is trusted, user list is public, print area uses sanitized editor output (PR #11).
- [148] Restore test | change the app vs fix the test | fix the test. It read the editor before the restore finished. The app was correct (PR #14).

## AI Usage Log
Format: `[min] tool | what I asked | what came back | kept / changed / rejected + why`

- [10] Claude | restate the prompt into must, should and cut | scope with stated assumptions | kept. Mock login, single share level and 2 MB upload limit came from it.
- [24] Claude Code | build the Supabase sign-in path | code merged, but the sandbox could not reach Supabase to test it | changed. Reverted to mock login at the user's request (PR #5).
- [84] Claude Code | fix the Render crash on a web URL in DATABASE_URL | added a startup guard and a CI boot check | kept.
- [50] Claude Code | Playwright suite run failed with "API did not start" | Python was not on PATH with the deps | changed. Used a venv and set PYTHON for the run.
- [115] Claude Code | build the dictation component | ESLint warned about exporting a non-component from the file | changed. Made the helper non-exported.
- [118] Claude Code | build export and print | print CSS and a Markdown download test | kept.
- [123] Claude Code | build version history | version test failed because Ben could not edit a doc he was not shared on | changed the test to share first. The feature was right.
- [141] Claude Code | cleanup of prompt, drafts and dead code | removed the unused schema and the evals ignore rules | kept. Tests stayed at 30.
- [142] Claude Code | security self-review of the repo | no high-severity issue | kept, no code change.
- [148] Claude Code | version restore test failing on a fresh setup | the test read the editor before the restore landed | changed. The test now waits for the restored text. Passed 11 of 11 twice on main.
- [91] Claude in Chrome | live check of the deployed site | the browser tab dropped once | kept. Recovered and finished the check.

## Commit log plan
Commit after every working step. Messages like:
- `scaffold: fastapi + vite starter`
- `feat: extraction endpoint with schema-validated output`
- `test: eval set with 8 cases incl. prompt injection`
- `docs: readme + run steps`

## Checkpoint notes
- 60 (18:48 UTC): PR #4 with Supabase sign-in merged, then reverted by PR #5 at 18:40 on request. Render deploy failing on the https DATABASE_URL, guard added. Playwright suite at 7 tests.
- 120 (19:48 UTC): PR #8 dictation merged with CI green. PR #9 export open with CI running. Delete, remove access, live check and import all passed on the live site.
- 170:
- 200:

## Prep-day entries (done before the timer, say so if you use them)
- `[prep] Structured JSON | forced tool_choice vs structured outputs | structured outputs (messages.parse + Pydantic) | the Claude model returns 400 on forced tool_choice, found while building the starter`
- `[prep] LLM in tests | real API vs fake client | fake client + LLM_MODE=mock | tests and CI run with no key and no cost`
- `[prep] Review gate | LLM decides vs rules decide | rules in app/rules.py | rules can only add review, never remove it`


## Start
- Start: 2026-11-24 17:48 UTC. Deadline: 21:48 UTC. Feature freeze: 21:08 UTC.

- 2026-11-24 20:10 UTC. Security self-review, about 10 minutes. Checked: sanitizer on import and every write, access checks on every doc, share and version route, upload size and type, CORS origins, secrets in the repo, and leftover LLM code. No high-severity issue found, so no code change. Known limits left in place: mock X-User-Id header, public user list, print area uses the editor's own output (already sanitized on save).
