# Submission

## Links

- Live app (Vercel): https://ajaia-starter-ywx4.vercel.app
- API (Render): https://ajaia-api-f05d.onrender.com
- Repo: https://github.com/Bhavishaahuja/ajaia-starter
- Walkthrough video: see [video-url.txt](video-url.txt)

## Seeded users (mock login, no passwords)

Pick a user in the "Signed in as" dropdown. The app sends that user's id in an `X-User-Id` header. This is mock login, not real auth.

| Name | Email | Role in the demo |
|---|---|---|
| Ava Chen | ava@example.com | Owner of the documents you create |
| Ben Ortiz | ben@example.com | Share target, can edit what Ava shares |
| Cara Singh | cara@example.com | Stranger, sees nothing she is not part of |

Suggested test: sign in as Ava, create a document, share it with ben@example.com. Switch to Ben and open it from "Shared with you". Switch to Cara and confirm the document is not listed.

## What is included

- `backend/`: FastAPI app, SQLAlchemy models, access rules, importer, seed users, pytest tests, Dockerfile
- `frontend/`: React, Vite and TipTap app, Playwright browser tests in `frontend/e2e/`
- `README.md`: local run steps, tests and deploy steps
- `ARCHITECTURE.md`: what was prioritized, the data model and known limits
- `AI_WORKFLOW.md`: how AI tools were used, what was changed or rejected, how it was checked
- `render.yaml` and `frontend/vercel.json`: deploy config
- `docs/working-logs.md`: decision log, AI usage log and checkpoint notes

## Run it locally

Full steps (Windows cmd and Linux/Mac) are in [README.md](README.md).

1. Start the API: `cd backend`, create a venv, `pip install -r requirements.txt`, then `uvicorn app.main:app --reload`. It runs on http://localhost:8000.
2. Start the frontend: `cd frontend`, `npm install`, then `npm run dev`. Open http://localhost:5173.
3. Tests: `pytest -q` in `backend`, and `npm run e2e` in `frontend`.

## What works

- Create, rename, edit and reopen documents. Content survives a refresh.
- Bold, italic, underline, H1, H2, bullet and numbered lists.
- Autosave 2 seconds after you stop typing, plus a Save button and Ctrl+S.
- Import `.txt`, `.md` and `.docx` as a new document. 2 MB limit, shown in the UI.
- Share a document by email. Owned and shared lists are separate.
- Owner can remove a shared person's access.
- Owner can delete a document (two clicks).
- Version history: each manual Save keeps a snapshot, skipped if nothing changed. Owners and editors can see the list, with author and time, and restore an older version. The current state is saved before a restore, so the restore can be undone.
- Dictation: a mic button in the editor inserts speech as text. Uses the browser speech API, so it needs Chrome or Edge.
- Export: Markdown download, and PDF through the browser print dialog (choose "Save as PDF").
- Server-side access checks on every document route. Strangers get 404.
- HTML is sanitized with nh3 on every save and on import.
- Tests: 30 pytest tests pass. 11 Playwright browser tests pass. Lint and production build pass.
- Deployed: the live app and API were checked by hand on the deployed site. That covered sharing, removing access, delete, import, and what other users see.

## What is partial

- **Dictation** works only in Chrome and Edge. Other browsers show a note instead. It still mishears some words. Cleanup is rule-based, not a language model.
- OpenWispr was considered, but it is native-only (macOS and Android apps), so it cannot be embedded in a web app.
- **Markdown export** has no underline, since Markdown cannot show it. Underlined text exports as plain text.
- **PDF export** depends on the browser print dialog, so the output looks slightly different in each browser.
- **Version history** snapshots only on manual Save and before a restore. Autosave does not add versions.
- **Import** converts formatting that `.docx` or Markdown does not map to the editor. Some styling is dropped.
- **Mock login** works for review, but any client can claim to be any seeded user. Treat the access checks as tested for the mock header, not for a real login.

## What is cut

- Real login. Mock login with seeded users only, as the brief allows.
- Real-time co-editing and presence. Last write wins.
- Comments and suggestions.
- Read-only (viewer) role. Shared users can edit.
- Migrations. Tables are created at startup.
- File storage. Imported files are converted and discarded.

## Next 2 to 4 hours

1. Real login (magic link or OAuth), so the user id comes from a session, not a header.
2. Viewer role, so a shared person can read without editing.
3. Real-time presence (show who is in the document), then real-time co-editing if time allows.
4. Better dictation: on-device Whisper in the browser via transformers.js, so accuracy does not depend on the browser's speech service.
5. Alembic migrations, and a version compare view that shows what changed between two snapshots.
