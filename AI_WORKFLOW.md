# AI workflow

## Tools

- **Claude Code** (CLI in the cloud session) for writing and running code, tests and the build
- **Claude project thread** for planning: scope, assumptions, the minute plan and the checkpoints
- **GitHub MCP** for the pull requests and merges
- **Claude in Chrome** for the live check of the deployed site

## Where AI sped things up

- **Scope in the first 15 minutes.** Turning the prompt into must, should and cut lists with stated assumptions. This decided the mock login, the single share level and the 2 MB upload limit.
- **Backend in one pass.** Models, access rules, and routes with a test per rule. The first full test run passed (18 tests). It now has 30.
- **Library checks before use.** Confirmed the `nh3`, `mammoth` and `markdown` APIs in a venv, and TipTap 3's StarterKit (it already includes underline, so I did not add it twice).
- **Hand-built .docx in tests.** Avoided adding a docx writer as a test dependency.

## What I changed or rejected

- Rejected OpenWhispr for dictation. Its open-source repo is native-only (macOS and Android), so a web app cannot embed it. The browser speech API needs no extra dependency. Kept the browser API and added a small cleanup pass of our own.
- Rejected the starter's LLM triage feature. The brief did not need it, and deleted the LLM module, evals and CI env var.
- Rejected the idea of putting the LLM in the import step. Converting a file is deterministic, and the access checks must be exact.
- Chose 404 (not 403) for strangers from the first draft, so a stranger cannot tell that a document exists.
- Moved the user-switch refresh. My first version refreshed the document list before the new user id was set, so it would have sent the old id.

## How I verified

- **Correctness:** `pytest -q` covers each access rule, sharing, import errors and sanitizing (18 tests). Run in the cloud sandbox with Python 3.13 (the project targets 3.12 in the Dockerfile).
- **Frontend:** `npm run lint` and `npm run build` pass. The Playwright suite (11 tests) runs the full flow in a real browser against the API and the frontend. A live check of the deployed site covered sharing, removing access, delete, import and what other users see.
- **Test race found and fixed:** the version restore test read the editor before the restore finished, so it passed on old content. The fix waits for the restored text. It was a test bug, not an app bug.
- **Reliability:** every save and import goes through the sanitizer and the same access check, so a client bug cannot skip them.
- **Deploy:** Render and Vercel deploys were confirmed on the live URLs. The Render crash on a web URL in `DATABASE_URL` is now refused at startup, and a CI job checks that.
