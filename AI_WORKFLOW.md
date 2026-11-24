# AI workflow

## Tools

- **Claude Code** (CLI in the cloud session) for writing and running code, tests and the build
- **Claude project thread** for planning: scope, assumptions, the minute plan and the checkpoints
- **GitHub MCP** for the pull request and merge

## Where AI sped things up

- **Scope in the first 15 minutes.** Turning the prompt into must, should and cut lists with stated assumptions. This decided the mock login, the single share level and the 2 MB upload limit.
- **Backend in one pass.** Models, access rules, and routes with a test per rule. The first full test run passed (18 tests).
- **Library checks before use.** Confirmed the `nh3`, `mammoth` and `markdown` APIs in a venv, and TipTap 3's StarterKit (it already includes underline, so I did not add it twice).
- **Hand-built .docx in tests.** Avoided adding a docx writer as a test dependency.

## What I changed or rejected

- Rejected the starter's LLM triage feature. The brief did not need it, and deleted the LLM module, evals and CI env var.
- Rejected the idea of putting the LLM in the import step. Converting a file is deterministic, and the access checks must be exact.
- Changed the first version of the access check so a stranger gets 404 instead of 403. A 403 would tell them the document exists.
- Moved the user-switch refresh. My first version refreshed the document list before the new user id was set, so it would have sent the old id.

## How I verified

- **Correctness:** `pytest -q` covers each access rule, sharing, import errors and sanitizing (18 tests). Run in the cloud sandbox with Python 3.13 (the project targets 3.12 in the Dockerfile).
- **Frontend:** `npm run lint` and `npm run build` pass. I did not click through the UI in a browser in this session. That is the gap to check first.
- **Reliability:** every save and import goes through the sanitizer and the same access check, so a client bug cannot skip them.
- **Deploy:** see SUBMISSION.md for what I could and could not confirm.
