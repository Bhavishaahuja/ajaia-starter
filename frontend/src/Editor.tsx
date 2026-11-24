import { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent, type Editor as TiptapEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  getDocument,
  listShares,
  shareDocument,
  updateDocument,
  type DocFull,
  type Share,
  type User,
} from './api'

type Props = {
  docId: number
  user: User
  onBack: () => void
}

type SaveState = 'loading' | 'saved' | 'unsaved' | 'saving' | 'error'

const AUTOSAVE_MS = 2000

const statusText: Record<SaveState, string> = {
  loading: 'Loading...',
  saved: 'All changes saved',
  unsaved: 'Unsaved changes',
  saving: 'Saving...',
  error: 'Save failed. Your edits are still here, try Save again.',
}

function ToolButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()} // keep the text selection
      onClick={onClick}
      className={`rounded px-2 py-1 text-sm ${
        active ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
      }`}
    >
      {label}
    </button>
  )
}

function Toolbar({ editor }: { editor: TiptapEditor }) {
  // the editor rerenders on each change, so these active states stay current
  return (
    <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-2">
      <ToolButton label="B" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} />
      <ToolButton label="I" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <ToolButton label="U" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} />
      <span className="mx-1 w-px bg-slate-200" />
      <ToolButton label="Text" active={editor.isActive('paragraph')} onClick={() => editor.chain().focus().setParagraph().run()} />
      <ToolButton label="H1" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} />
      <ToolButton label="H2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
      <span className="mx-1 w-px bg-slate-200" />
      <ToolButton label="Bullets" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} />
      <ToolButton label="Numbers" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
    </div>
  )
}

function SharePanel({ doc, user }: { doc: DocFull; user: User }) {
  const isOwner = doc.role === 'owner'
  const [shares, setShares] = useState<Share[]>([])
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!isOwner) return
    listShares(doc.id)
      .then(setShares)
      .catch((e: Error) => setError(e.message))
  }, [doc.id, isOwner])

  async function handleShare(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setNote('')
    try {
      const share = await shareDocument(doc.id, email)
      setShares((prev) => (prev.some((s) => s.user_id === share.user_id) ? prev : [...prev, share]))
      setNote(`Shared with ${share.name}. They can edit now.`)
      setEmail('')
    } catch (e) {
      setError((e as Error).message)
    }
  }

  if (!isOwner) {
    return (
      <p className="text-xs text-slate-500">
        {user.name} can edit this. It was shared by {doc.owner_name}.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <form onSubmit={handleShare} className="flex gap-2">
        <input
          type="email"
          required
          placeholder="colleague@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
        <button type="submit" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50">
          Share
        </button>
      </form>
      <p className="text-xs text-slate-500">
        Shared people can open and edit. They need an account first.
      </p>
      {error && <p className="text-xs text-red-700">{error}</p>}
      {note && <p className="text-xs text-green-700">{note}</p>}
      {shares.length > 0 && (
        <ul className="text-xs text-slate-600">
          {shares.map((s) => (
            <li key={s.user_id}>
              {s.name} ({s.email}) can edit
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function Editor({ docId, user, onBack }: Props) {
  const [doc, setDoc] = useState<DocFull | null>(null)
  const [title, setTitle] = useState('')
  const [saveState, setSaveState] = useState<SaveState>('loading')
  const [loadError, setLoadError] = useState('')

  // refs so the timer and save function always see the newest values
  const latest = useRef({ title: '', html: '' })
  const dirty = useRef(false)
  const loaded = useRef(false)
  const timer = useRef<number | undefined>(undefined)

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: { class: 'doc-body-content' },
    },
    onUpdate: ({ editor }) => {
      if (!loaded.current) return
      latest.current.html = editor.getHTML()
      markDirty()
    },
  })

  // save is kept in a ref so the editor callbacks always call the latest version
  const saveRef = useRef<() => Promise<void>>(async () => {})

  function markDirty() {
    dirty.current = true
    setSaveState('unsaved')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => void saveRef.current(), AUTOSAVE_MS)
  }

  saveRef.current = async () => {
    window.clearTimeout(timer.current)
    if (!dirty.current) return
    dirty.current = false
    setSaveState('saving')
    try {
      await updateDocument(docId, { title: latest.current.title, html: latest.current.html })
      setSaveState(dirty.current ? 'unsaved' : 'saved')
    } catch {
      dirty.current = true
      setSaveState('error')
    }
  }

  // load the doc once the editor exists
  useEffect(() => {
    getDocument(docId)
      .then((d) => {
        setDoc(d)
        setTitle(d.title)
        latest.current = { title: d.title, html: d.html }
      })
      .catch((e: Error) => {
        setLoadError(e.message)
      })
  }, [docId])

  useEffect(() => {
    if (!editor || !doc || loaded.current) return
    editor.commands.setContent(doc.html, { emitUpdate: false })
    loaded.current = true
    setSaveState('saved')
  }, [editor, doc])

  // ctrl+s and cmd+s save right away
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void saveRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // leaving the screen with unsaved edits saves them first
  useEffect(() => {
    return () => {
      window.clearTimeout(timer.current)
      if (dirty.current) void saveRef.current()
    }
  }, [])

  function handleTitle(value: string) {
    setTitle(value)
    latest.current.title = value
    markDirty()
  }

  if (loadError) {
    return (
      <div className="space-y-3">
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{loadError}</p>
        <button onClick={onBack} className="text-sm text-slate-700 underline">
          Back to documents
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={onBack} className="text-sm text-slate-600 hover:text-slate-900">
          ← All documents
        </button>
        <span className="ml-auto text-xs text-slate-500" role="status">
          {statusText[saveState]}
        </span>
        <button
          onClick={() => void saveRef.current()}
          disabled={!doc || saveState === 'saving' || saveState === 'saved'}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Save
        </button>
      </div>

      <input
        aria-label="Document title"
        value={title}
        disabled={!doc}
        onChange={(e) => handleTitle(e.target.value)}
        onBlur={() => void saveRef.current()}
        maxLength={200}
        className="w-full bg-transparent text-2xl font-semibold focus:outline-none"
      />

      {doc && <SharePanel doc={doc} user={user} />}

      {editor && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <Toolbar editor={editor} />
          <div className="mt-3">
            <EditorContent editor={editor} />
          </div>
        </div>
      )}
    </div>
  )
}
