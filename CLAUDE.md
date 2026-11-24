# Notes for AI coding tools in this repo

- Backend: FastAPI + Pydantic + SQLAlchemy in `backend/app`. Frontend: React + Vite + TS + Tailwind in `frontend/src`.
- Run `pytest -q` in `backend` after backend changes. Run `npm run build` in `frontend` after frontend changes.
- Keep the LLM out of anything exact (math, money, IDs, permissions). Put that in deterministic code like `app/rules.py`.
- LLM output must be validated against a Pydantic model before use. Do not parse free text.
- Model is `claude-opus-5-5`. It rejects forced `tool_choice`, so use structured outputs (`messages.parse` with `output_format`).
- Secrets only in env vars. Never commit `.env`.
- The user is on Windows cmd. Give cmd commands (`copy`, `.venv\Scripts\activate`).
- Writing style: no em dashes, no buzzwords, short sentences, outcome first. Natural variable names, short casual comments.
- Keep `tests/` keyless: new LLM paths get a fake client test, not a real call.
