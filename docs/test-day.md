# Test day runbook

## Before pressing Start (10 min, not on the clock)
- [ ] `git pull`, then backend: `.venv\Scripts\activate` and `pytest -q` passes
- [ ] `backend\.env` has `LLM_MODE=live` and a working `ANTHROPIC_API_KEY`. Check with `python -m evals.run_evals --live`
- [ ] Render service is up: open `https://<your-api>.onrender.com/health` (free tier sleeps, first hit takes ~50s)
- [ ] Vercel site loads and can create an item
- [ ] Resume link ready (public PDF or Google Drive link set to "anyone with the link")
- [ ] Claude project open with the kit, this repo open in the editor, a timer running

## First 40 minutes
1. Paste the prompt into the Claude project. Get the breakdown (restatement, requirements, assumptions, scope, architecture, plan).
2. Paste the assumptions and scope table into `docs/submission.md`.
3. `git checkout -b task` and make the starter yours (map below).

## What to change for the real task
| If the task needs | Change |
|---|---|
| Different fields from the LLM | `Analysis` in `app/schemas.py` + `SYSTEM_PROMPT` in `app/llm.py` |
| Different record | `Item` in `app/models.py` + `ItemOut` in `app/schemas.py`. Delete `backend\app.db` locally so the table is recreated |
| Different review rules | `app/rules.py` |
| New endpoint | `app/main.py`, plus one test in `tests/test_api.py` |
| New screen fields | `src/api.ts` type + `src/App.tsx` |
| Mock answers | `mock_analyze` in `app/llm.py` (keeps tests and CI keyless) |
| Eval cases | `evals/cases.json` (5 to 10, include one injection and one garbage input) |
| Postgres (Supabase) | Set `DATABASE_URL` to the Supabase connection string. Tables are created on startup |
| Long documents / RAG | Out of the starter. Decide at minute 20 if it is Must or Cut |

## Checkpoints
Type `checkpoint 60`, `120`, `170`, `200` in the Claude project. At 200, stop features.

## Finish (200 to 230)
- [ ] Push, CI green, Render redeployed, Vercel redeployed
- [ ] `python -m evals.run_evals --live` and paste `evals/results.md` into section 7
- [ ] README run steps still true
- [ ] `submission.md` complete, TL;DR at top, no em dashes (search for the character before pasting)

## One-time deploy setup (do on prep day)

### Backend on Render
1. render.com > New > Blueprint > connect GitHub > pick `ajaia-starter`. It reads `render.yaml`.
2. Fill the secret env vars it asks for:
   - `ANTHROPIC_API_KEY`: your key
   - `CORS_ORIGINS`: your Vercel URL, e.g. `https://ajaia-starter.vercel.app` (no trailing slash)
   - `DATABASE_URL`: leave as `sqlite:///./app.db` for now (data resets on each deploy on the free tier), or paste a Supabase Postgres URL to keep data
3. Deploy, then open `https://<service>.onrender.com/health`.

### Frontend on Vercel
1. vercel.com > Add New > Project > import `ajaia-starter`.
2. Root Directory: `frontend`. Framework preset: Vite (auto).
3. Environment variable `VITE_API_URL` = your Render URL (no trailing slash).
4. Deploy. If you change `VITE_API_URL` later, redeploy (it is baked in at build time).
5. Put the Vercel URL into Render's `CORS_ORIGINS` and let Render redeploy.

### Rollback
- Render: Events > pick the last good deploy > Rollback.
- Vercel: Deployments > last good one > Promote to Production.
