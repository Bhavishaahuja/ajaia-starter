# Docs: a small collaborative document editor

A lightweight Google Docs style editor. Create and edit rich text documents, import a file, share a document with another user, and reopen everything after a refresh.

Built as an Ajaia take-home. Scope and tradeoffs are in [ARCHITECTURE.md](ARCHITECTURE.md). AI workflow notes are in [AI_WORKFLOW.md](AI_WORKFLOW.md). Full list of what is and is not done is in [SUBMISSION.md](SUBMISSION.md).

| Part | Stack |
|---|---|
| Backend | Python 3.12, FastAPI, Pydantic, SQLAlchemy (SQLite locally, Postgres via `DATABASE_URL`) |
| Import | mammoth (.docx), markdown (.md), plain text escaping (.txt), nh3 (HTML sanitizing) |
| Frontend | React 19, Vite, TypeScript, Tailwind 4, TipTap 3 editor |
| Tests | pytest, 18 tests, no network |
| Deploy | Render (backend, Docker, `render.yaml`), Vercel (frontend, `vercel.json`) |

## Features

- Create a document, rename it, edit it, and reopen it after a refresh
- Bold, italic, underline, headings (Text, H1, H2), bullet and numbered lists
- Autosave 2 seconds after you stop typing, plus a Save button and Ctrl+S
- Import a `.txt`, `.md` or `.docx` file. It opens as a new document. **Limit: 2 MB.**
- Share a document by email. The shared person can open and edit it.
- Two sections on the home screen: owned by you, and shared with you
- Switch between three seeded users with the "Signed in as" dropdown

## Mock login (read this first)

There is no real login. The dropdown picks one of three seeded users, and the frontend sends that user's id in an `X-User-Id` header. Anyone can send any id. This is only so reviewers can test sharing as different people.

Seeded users (no passwords):

| Name | Email |
|---|---|
| Ava Chen | ava@example.com |
| Ben Ortiz | ben@example.com |
| Cara Singh | cara@example.com |

Suggested test: sign in as Ava, create a document, share it with ben@example.com. Switch to Ben and see it under "Shared with you". Switch to Cara and see that she cannot open it.

## Run it locally (Windows cmd)

You need Python 3.12+ and Node 20+.

Backend, in one terminal:
```
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```
The API runs on http://localhost:8000. Interactive docs are at http://localhost:8000/docs. The first start creates `app.db` (SQLite) and the seed users.

Frontend, in a second terminal:
```
cd frontend
npm install
copy .env.example .env.local
npm run dev
```
Open http://localhost:5173.

## Tests

```
cd backend
.venv\Scripts\activate
pytest -q
```

Browser tests (Playwright) start the API and the frontend, then click through the whole flow with the seeded users:

```
cd frontend
npm install
npx playwright install chromium
set PYTHON=..\backend\.venv\Scripts\python.exe
npm run e2e
```

On Linux or Mac, use `PYTHON=../backend/.venv/bin/python npm run e2e`. Set `CHROME_PATH` to a Chromium binary if you do not want to install one with Playwright.

```
cd frontend
npm run lint
npm run build
```

The tests cover:
- No user header or unknown user gives 401
- Owner can create, rename and edit
- A stranger gets 404 on every document route, and does not see the document in their list
- A shared user can edit but cannot share or see the share list (403)
- Sharing with an unknown email, sharing with yourself, and sharing twice
- Saved HTML is sanitized (no scripts, no `onclick`, no `javascript:` links)
- Import of `.txt`, `.md` and a hand-built `.docx`, plus the 415, 413 and 422 error cases

## Deploy

**Backend (Render):** New > Blueprint > pick this repo. Render reads `render.yaml`. Set two env vars in the dashboard:
- `DATABASE_URL`: the Supabase Postgres pooler URI (`postgres://` or `postgresql://` both work)
- `CORS_ORIGINS`: the Vercel URL, no trailing slash

**Frontend (Vercel):** import the repo, set the root directory to `frontend`, and add `VITE_API_URL` pointing to the Render URL.

Without `DATABASE_URL`, the backend uses SQLite on the container disk. That resets on every deploy, so set it for anything you want to keep.

## Layout

```
backend/app/main.py       routes and mock auth header
backend/app/rules.py      access rules (owner, editor, nobody)
backend/app/importer.py   .txt, .md, .docx to sanitized HTML
backend/app/models.py     users, documents, shares
backend/app/seed.py       the three seeded users
backend/tests/            pytest
frontend/src/App.tsx      user switcher, open document in the URL hash
frontend/src/DocumentList.tsx   owned and shared lists, new, import
frontend/src/Editor.tsx   TipTap editor, toolbar, autosave, share panel
frontend/src/api.ts       every backend call
```
