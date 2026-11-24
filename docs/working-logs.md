# Working logs (keep this file open and fill it in as you go)

These feed sections 5 and 6 of the submission. One line per entry is plenty. Write it the moment it happens, not at the end.

## Decision Log
Format: `[min] Decision | options | picked | why`
- [ ] 
- [ ] 

Examples:
- `[25] Storage | Postgres on Supabase vs SQLite | SQLite | saves ~15 min setup, swap is one env var`
- `[90] Output parsing | regex on text vs forced tool use | tool use | schema-validated JSON, no parsing bugs`

## AI Usage Log
Format: `[min] tool | what I asked | what came back | kept / changed / rejected + why`
- 
- 

Examples:
- `[5] Claude | restate the prompt + Must/Should/Cut | good scope, but it put auth in Must | moved auth to Cut since prompt never mentions users`
- `[70] Claude | review my upload endpoint for security | flagged no file size limit, missing content-type check | added both`
- `[110] Claude Code | write the eval script | used an SDK method that doesn't exist | caught on first run, rewrote with the documented call`

## Commit log plan
Commit after every working step. Messages like:
- `scaffold: fastapi + vite starter`
- `feat: extraction endpoint with schema-validated output`
- `test: eval set with 8 cases incl. prompt injection`
- `docs: readme + run steps`

## Checkpoint notes
- 60:
- 120:
- 170:
- 200:

## Prep-day entries (done before the timer, say so if you use them)
- `[prep] Structured JSON | forced tool_choice vs structured outputs | structured outputs (messages.parse + Pydantic) | Claude Opus 5.5 returns 400 on forced tool_choice, found while building the starter`
- `[prep] LLM in tests | real API vs fake client | fake client + LLM_MODE=mock | tests and CI run with no key and no cost`
- `[prep] Review gate | LLM decides vs rules decide | rules in app/rules.py | rules can only add review, never remove it`


## Decision log

- **Auth: Supabase sign-in reverted to mock login with seeded users.** Supabase sign-in was built and merged in PR #4, then reverted at Bhavisha's request so the basics could be checked first. The app again uses seeded users (Ava, Ben, Cara) and an `X-User-Id` header. The Supabase code is gone. Still in place: Postgres via `DATABASE_URL`, owner delete, remove access, and the CI checks.

- 2026-11-24 19:45 UTC. Dictation: used the browser Web Speech API in a small hand-written component, not OpenWhispr (a desktop Electron app, not embeddable in a web app) and not react-speech-recognition (extra dependency, faster to write our own). Works in Chrome and Edge; hidden with a note elsewhere.

- 2026-11-24 19:55 UTC. Export: Markdown via turndown (underline is dropped, since Markdown has no underline). PDF uses the browser print dialog (Save as PDF), not a PDF library, to save time and keep the bundle small.
