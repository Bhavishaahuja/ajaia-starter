# Architecture

## What I prioritized

Access control and persistence first, then the editing flow, then import. The core question for this app is "who can see and change this document," and the server answers it on every route. Version history, dictation and export came after the core path was solid. Real login and real-time co-editing were cut. Each cut item is hours of work and none of them touches the core path.

## Shape of the system

```
Browser (Vercel)                       API (Render, Docker)               Postgres (Supabase)
React + Vite + TipTap  --- JSON --->   FastAPI + SQLAlchemy  ---------->  users, documents, shares
  X-User-Id header (mock auth)         rules.py decides access
  autosave every 2 s after idle        importer.py: docx, md, txt -> sanitized HTML
```

## Data model

| Table | Columns | Notes |
|---|---|---|
| `users` | id, email, name | Three seeded rows, added on startup if missing |
| `documents` | id, owner_id, title, html, created_at, updated_at | `html` is sanitized TipTap output |
| `shares` | id, doc_id, user_id | One row per shared person, unique per (doc, user) |

Documents store HTML, not a custom JSON format. TipTap produces HTML, the importer produces HTML, and the sanitizer treats both the same way. It also keeps the stored content readable in any database viewer.

## Access rules

Every document route goes through `load_doc_for` in `main.py`, which calls `role_for` in `rules.py`:

- Owner: read, edit, rename, see and change sharing
- Shared user: read and edit, cannot share or see the share list (403)
- Anyone else: 404, the same response as a missing document, so ids cannot be probed

Access is decided in plain Python, with no LLM involved. Tests cover each rule.

## Import

| Type | How it becomes HTML |
|---|---|
| `.txt` | Escape the text, blank line starts a paragraph, single newline is a line break |
| `.md` | `markdown` library, then sanitize |
| `.docx` | `mammoth` converts it to HTML, then sanitize. Formatting that mammoth drops is dropped. |

The 2 MB limit is checked while reading the upload (413). Unsupported extensions get 415. Files that cannot be parsed get 422.

## Sanitizing

`nh3.clean` runs on every import and on every saved document. It keeps a short list of tags the editor can produce and the links in that list (http, https, mailto). Scripts, event handlers and `javascript:` links are removed. Sanitizing on save means the server does not trust the client.

## Persistence and environments

- Local and tests: SQLite file
- Production: Postgres from `DATABASE_URL`. `postgres://` is rewritten to `postgresql+psycopg://` so SQLAlchemy uses the psycopg 3 driver.
- Tables are created with `create_all` at startup. There are no migrations. Fine for a take-home. With more time: Alembic.

## Frontend decisions

- The open document is stored in the URL hash (`#/doc/12`), so a refresh stays on the same document.
- The selected user is in localStorage. Storage is wrapped in try/catch, so private windows still work.
- Autosave is a 2 second debounce. A Save button and Ctrl+S save immediately. Leaving the editor with unsaved changes saves before it closes.
- The share panel is shown to owners only. Shared users see a line saying who shared it.

## Known limits

- Mock auth. Any client can claim to be any seeded user.
- Last write wins. Two people editing the same document at once will overwrite each other.
- No read-only role. Shared users can edit.
- Version history only snapshots on manual Save and before a restore. Autosave does not add a version.
- The whole HTML body is sent on each save. Fine at this size, not for large documents.
- No migrations, no rate limiting, no file storage. Imported files are converted and discarded, not kept.

## Next 2 to 4 hours

1. Real login (magic link or OAuth) so the user id comes from a session, not a header
2. Viewer role, so a shared person can read without editing
3. Real-time presence with a websocket (show who is in the doc)
4. Alembic migrations, and a compare view between two version snapshots
