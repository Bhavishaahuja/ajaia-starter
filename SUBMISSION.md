# Submission

## Links

- Live app (Vercel): https://ajaia-starter-ywx4.vercel.app
- API (Render): https://ajaia-api-f05d.onrender.com
- Repo: https://github.com/Bhavishaahuja/ajaia-starter 
- Walkthrough video: [add link]

## Test accounts (mock login, no passwords)

| Name | Email | Use |
|---|---|---|
| Ava Chen | ava@example.com | Owner of the documents you create |
| Ben Ortiz | ben@example.com | Share target |
| Cara Singh | cara@example.com | Stranger, should see nothing |

Test flow: sign in as Ava, create a doc, share it with ben@example.com, switch to Ben and open it, switch to Cara and confirm it is not listed.

## Included

- `backend/`: FastAPI app, models, access rules, importer, seed users, pytest tests, Dockerfile
- `frontend/`: React + Vite + TipTap app
- `README.md`: local setup, test and deploy steps
- `ARCHITECTURE.md`: what was prioritized and why
- `AI_WORKFLOW.md`: AI tools, where they helped, what was changed or rejected
- `render.yaml`, `frontend/vercel.json`: deploy config

## Works

- Create, rename, edit and reopen documents. Content survives a refresh.
- Bold, italic, underline, H1, H2, bullet and numbered lists
- Autosave after 2 seconds, Save button, Ctrl+S
- Import `.txt`, `.md`, `.docx` as a new document (2 MB limit, shown in the UI)
- Share by email. Owned and shared sections are separate.
- Server-side access checks on every document route
- Sanitized HTML on save and import
- 23 pytest tests pass. Lint and production build pass.
- 7 Playwright browser tests cover the full flow with seeded users (`npm run e2e`).
- Owner can delete a document and remove a shared person's access.

## Partial

- **Deploy:** the code is merged to main, which triggers Render and Vercel. Confirming the live deploy and the Postgres connection is still open (see the checklist in the thread). Until that is confirmed, treat the live URLs as unverified.
- **Browser testing:** the UI was built and linted but not clicked through end to end in this session.

## Cut

- Real login. Mock login with seeded users only, as the brief allows.
- Real-time co-editing and presence
- Comments and suggestions
- Version history
- Delete document, read-only role, share removal
- Migrations (tables are created at startup)

## Next 2 to 4 hours

See the "Next 2 to 4 hours" section in ARCHITECTURE.md.

## Note on old files

`docs/` still has the triage-era submission and log templates from the starter. They are not part of this app.
