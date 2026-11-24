import { useRef, useState } from 'react'
import { createDocument, importDocument, type DocSummary } from './api'

type Props = {
  docs: DocSummary[]
  onOpen: (id: number) => void
  onChanged: () => void
  onError: (message: string) => void
}

const MAX_UPLOAD_MB = 2

// each card gets one of these accent colors, picked by its id, so the grid feels lively
const ACCENTS = [
  { bar: 'bg-violet-500', soft: 'bg-violet-50 text-violet-700', glow: 'from-violet-500/20' },
  { bar: 'bg-amber-400', soft: 'bg-amber-50 text-amber-800', glow: 'from-amber-400/25' },
  { bar: 'bg-emerald-500', soft: 'bg-emerald-50 text-emerald-700', glow: 'from-emerald-500/20' },
  { bar: 'bg-rose-500', soft: 'bg-rose-50 text-rose-700', glow: 'from-rose-500/20' },
  { bar: 'bg-sky-500', soft: 'bg-sky-50 text-sky-700', glow: 'from-sky-500/20' },
  { bar: 'bg-indigo-500', soft: 'bg-indigo-50 text-indigo-700', glow: 'from-indigo-500/20' },
]

function accentFor(id: number) {
  return ACCENTS[id % ACCENTS.length]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

// small inline icons, so there is no icon package to add
function Icon({ path, className = 'h-4 w-4' }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={path} />
    </svg>
  )
}

const ICON_PLUS = 'M12 5v14M5 12h14'
const ICON_UPLOAD = 'M12 15V3m0 0 4 4m-4-4-4 4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2'
const ICON_DOC = 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5zM14 3v5h5'

function StatTile({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-slate-200 backdrop-blur">
      <span className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold ${tone}`}>{value}</span>
      <span className="text-sm text-slate-600">{label}</span>
    </div>
  )
}

function DocCard({ doc, onOpen }: { doc: DocSummary; onOpen: (id: number) => void }) {
  const isOwner = doc.role === 'owner'
  const accent = accentFor(doc.id)
  return (
    <li>
      <button
        onClick={() => onOpen(doc.id)}
        className="group relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
      >
        {/* soft glow in the corner, the accent color ties the card to its tag */}
        <span className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br ${accent.glow} to-transparent blur-xl`} />
        <span className={`h-1.5 w-full ${accent.bar}`} />
        <span className="relative flex flex-1 flex-col gap-4 p-5">
          <span className="flex items-start justify-between gap-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent.soft}`}>
              <Icon path={ICON_DOC} className="h-5 w-5" />
            </span>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                isOwner ? 'bg-slate-900 text-white' : 'bg-white text-sky-700 ring-1 ring-sky-200'
              }`}
            >
              {isOwner ? 'Owner' : 'Can edit'}
            </span>
          </span>
          <span className="line-clamp-2 text-base font-semibold leading-snug text-slate-900">{doc.title}</span>
          <span className="mt-auto space-y-0.5 text-xs text-slate-500">
            <span className="block">{isOwner ? 'You own this' : `Owner: ${doc.owner_name}`}</span>
            <span className="block">Updated {formatDate(doc.updated_at)}</span>
          </span>
        </span>
      </button>
    </li>
  )
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border-2 border-dashed border-slate-300 bg-white/60 p-8 text-center text-sm text-slate-500">
      {children}
    </p>
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
      {/* hero: a friendly line, quick stats and the two main actions */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-indigo-600 to-sky-500 p-6 text-white shadow-lg sm:p-8">
        <span className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-amber-300/30 blur-3xl" />
        <span className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="text-sm font-medium text-indigo-100">Welcome back</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Your documents, all in one place</h2>
            <p className="mt-2 text-sm text-indigo-100">
              Write, format and share. Import a .txt, .md or .docx file (up to {MAX_UPLOAD_MB} MB) and it opens as a new
              document.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label
              className={`inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/30 backdrop-blur transition hover:bg-white/25 ${
                busy ? 'pointer-events-none opacity-40' : ''
              }`}
            >
              <Icon path={ICON_UPLOAD} />
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
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-40"
            >
              <Icon path={ICON_PLUS} />
              New document
            </button>
          </div>
        </div>
        <div className="relative mt-6 grid grid-cols-3 gap-3 sm:max-w-md">
          <StatTile label="Total" value={docs.length} tone="bg-indigo-100 text-indigo-700" />
          <StatTile label="Yours" value={owned.length} tone="bg-violet-100 text-violet-700" />
          <StatTile label="Shared" value={shared.length} tone="bg-sky-100 text-sky-700" />
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-sm font-semibold text-slate-700">{`Owned by you (${owned.length})`}</h3>
        {owned.length === 0 ? (
          <EmptyNote>No documents yet. Create one or import a file.</EmptyNote>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {owned.map((doc) => (
              <DocCard key={doc.id} doc={doc} onOpen={onOpen} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-4 text-sm font-semibold text-slate-700">{`Shared with you (${shared.length})`}</h3>
        {shared.length === 0 ? (
          <EmptyNote>Nothing shared with this user yet.</EmptyNote>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {shared.map((doc) => (
              <DocCard key={doc.id} doc={doc} onOpen={onOpen} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
