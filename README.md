# Ajaia starter

A small full-stack starter: FastAPI backend, React frontend, one Claude call that returns schema-validated JSON, and a human review step. The example feature is request triage (paste text, get category and priority, rules decide if a person checks it). It is meant to be renamed and reshaped for the real task.

| Part | Stack |
|---|---|
| Backend | Python 3.12, FastAPI, Pydantic, SQLAlchemy (SQLite locally, Postgres via `DATABASE_URL`) |
| LLM | Anthropic Python SDK, structured outputs (`messages.parse` + Pydantic), one retry on bad output |
| Frontend | React 19, Vite, TypeScript, Tailwind 4 |
| Quality | pytest (12 tests, no network), eval runner with 8 labeled cases |
| Ship | Dockerfile, GitHub Actions CI, `render.yaml` (backend), `vercel.json` (frontend) |

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
API runs on http://localhost:8000 and docs are at http://localhost:8000/docs.
It starts in `LLM_MODE=mock`, so no API key is needed. To call Claude, set `LLM_MODE=live` and `ANTHROPIC_API_KEY` in `backend\.env`.

Frontend, in a second terminal:
```
cd frontend
npm install
copy .env.example .env.local
npm run dev
```
Open http://localhost:5173.

## Tests and evals

```
cd backend
.venv\Scripts\activate
pytest -q
python -m evals.run_evals
python -m evals.run_evals --live
```
- `pytest` never calls the network. The live code path is tested with a fake client (retry, refusal, cut-off output).
- `run_evals` prints a pass/fail table and writes `backend\evals\results.md`. In mock mode it scores 6/8 on purpose: the keyword mock misses the prompt injection and the Spanish input, which is the baseline the real model should beat.

## How the LLM step works

1. User text is wrapped in `<user_input>` tags and the system prompt says to treat it as data.
2. `client.beta.messages.parse(..., output_format=Analysis)` asks for JSON matching the Pydantic model. The SDK validates it.
3. Bad or cut-off output gets one retry. Timeouts, rate limits and API errors become a clear `502` with a readable message.
4. Deterministic rules in `app/rules.py` decide `needs_review`. Rules can only add review, never remove it.
5. A person approves or rejects flagged items in the UI.

Why not forced tool use: Claude Opus 5.5 returns a 400 for `tool_choice` of type `any` or `tool`. Structured outputs give the same schema guarantee.

Refusal fallback: requests send `fallbacks="default"` (beta `server-side-fallback-2026-07-01`), so if a safety classifier declines, the API retries on a fallback model in the same call. Remove both lines in `app/llm.py` to turn it off.

## Project layout

```
backend/
  app/main.py        routes
  app/llm.py         Claude call, validation, retry, mock mode
  app/rules.py       deterministic review rules
  app/schemas.py     Pydantic models (API + LLM output)
  app/models.py      SQLAlchemy table
  app/db.py          engine + session (sqlite or postgres)
  app/config.py      env settings
  tests/             pytest
  evals/             cases.json + run_evals.py
frontend/
  src/api.ts         every backend call
  src/App.tsx        the one screen
docs/
  submission.md      fill this in during the timer
  working-logs.md    decision log + AI usage log
  test-day.md        runbook for the 240 minutes
```

## Security notes

- Secrets only in env vars. `.env` is gitignored, `.env.example` is committed.
- Input length is capped (`MAX_TEXT_LENGTH`), Pydantic validates every request body.
- ORM queries only, no string-built SQL.
- LLM output is validated against a schema before it is stored.
- CORS is limited to `CORS_ORIGINS`.
- No auth yet. Add it only if the task asks for users.
