import { useRef, useState } from 'react'
import { createDocument, importDocument, type DocSummary } from './api'

type Props = {
  docs: DocSummary[]
  onOpen: (id: number) => void
  onChanged: () => void
  onError: (message: string) => void
}

const MAX_UPLOAD_MB = 2

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

// one card per document. The top strip is a little colored bar so the list scans faster.
function DocCard({ doc, onOpen }: { doc: DocSummary; onOpen: (id: number) => void }) {
  const isOwner = doc.role === 'owner'
  return (
    <li>
      <button
        onClick={() => onOpen(doc.id)}
        className="group flex h-full w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
      >
        <span className={`h-1.5 w-full ${isOwner ? 'bg-slate-800' : 'bg-sky-500'}`} />
        <span className="flex flex-1 flex-col gap-3 p-4">
          <span className="flex items-start justify-between gap-3">
            <span className="line-clamp-2 min-w-0 text-sm font-semibold text-slate-900">{doc.title}</span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                isOwner ? 'bg-slate-100 text-slate-700' : 'bg-sky-50 text-sky-700'
              }`}
            >
              {isOwner ? 'Owner' : 'Can edit'}
            </span>
          </span>
          <span className="mt-auto block text-xs text-slate-500">
            {isOwner ? 'You own this' : `Owner: ${doc.owner_name}`}
            <span className="block">Updated {formatDate(doc.updated_at)}</span>
          </span>
        </span>
      </button>
    </li>
  )
}

export default function DocumentList({ docs, onOpen, onChanged, onError }: Props) {
  const [busy, setBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const owned = docs.filter((d) => d.role === 'owner')
  const shared = docs.filter((d) => d.role === 'editor')

  async function handleNew() {
    setBusy(true)
    try {
      const doc = await createDocument('Untitled document')
      onOpen(doc.id)
    } catch (e) {
      onError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function handleImport(file: File | undefined) {
    if (!file) return
    setBusy(true)
    try {
      const doc = await importDocument(file)
      onChanged()
      onOpen(doc.id)
    } catch (e) {
      // keep the error on screen. A refresh here would clear it.
      onError((e as Error).message)
    } finally {
      setBusy(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div>
          <h2 className="text-xl font-semibold">Your documents</h2>
          <p className="mt-1 text-sm text-slate-500">
            Import a .txt, .md or .docx file (up to {MAX_UPLOAD_MB} MB). It opens as a new document.
          </p>
        </div>
        <div className="flex gap-2">
          <label
            className={`cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50 ${
              busy ? 'pointer-events-none opacity-40' : ''
            }`}
          >
            Import file
            <input
              ref={fileInput}
              type="file"
              accept=".txt,.md,.docx"
              className="hidden"
              onChange={(e) => handleImport(e.target.files?.[0])}
            />
          </label>
          <button
            onClick={handleNew}
            disabled={busy}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-40"
          >
            New document
          </button>
        </div>
      </div>

      <section>
        <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Owned by you
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] text-slate-700">{owned.length}</span>
        </h3>
        {owned.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            No documents yet. Create one or import a file.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {owned.map((doc) => (
              <DocCard key={doc.id} doc={doc} onOpen={onOpen} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Shared with you
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] text-slate-700">{shared.length}</span>
        </h3>
        {shared.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            Nothing shared with this user yet.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shared.map((doc) => (
              <DocCard key={doc.id} doc={doc} onOpen={onOpen} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
