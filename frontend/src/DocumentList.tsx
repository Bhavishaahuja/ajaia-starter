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

function DocRow({ doc, onOpen }: { doc: DocSummary; onOpen: (id: number) => void }) {
  return (
    <li>
      <button
        onClick={() => onOpen(doc.id)}
        className="flex w-full items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-left hover:border-slate-400"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{doc.title}</span>
          <span className="block text-xs text-slate-500">
            {doc.role === 'owner' ? 'You own this' : `Owner: ${doc.owner_name}`} · updated{' '}
            {formatDate(doc.updated_at)}
          </span>
        </span>
        <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
          {doc.role === 'owner' ? 'Owner' : 'Can edit'}
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
      onOpen(doc.id)
    } catch (e) {
      onError((e as Error).message)
    } finally {
      setBusy(false)
      if (fileInput.current) fileInput.current.value = ''
      onChanged()
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Your documents</h2>
          <p className="mt-1 text-xs text-slate-500">
            Import a .txt, .md or .docx file (up to {MAX_UPLOAD_MB} MB). It opens as a new document.
          </p>
        </div>
        <div className="flex gap-2">
          <label
            className={`cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 ${
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
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            New document
          </button>
        </div>
      </div>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Owned by you ({owned.length})
        </h3>
        {owned.length === 0 ? (
          <p className="text-sm text-slate-500">No documents yet. Create one or import a file.</p>
        ) : (
          <ul className="space-y-2">
            {owned.map((doc) => (
              <DocRow key={doc.id} doc={doc} onOpen={onOpen} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Shared with you ({shared.length})
        </h3>
        {shared.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing shared with this user yet.</p>
        ) : (
          <ul className="space-y-2">
            {shared.map((doc) => (
              <DocRow key={doc.id} doc={doc} onOpen={onOpen} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
