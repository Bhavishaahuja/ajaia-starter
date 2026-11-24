import { useCallback, useEffect, useState } from 'react'
import { listDocuments, listUsers, setCurrentUser, type DocSummary, type User } from './api'
import DocumentList from './DocumentList'
import Editor from './Editor'

const USER_KEY = 'docEditorUserId'

// the open document lives in the URL hash, so a refresh stays on the same doc
function docIdFromHash(): number | null {
  const match = window.location.hash.match(/^#\/doc\/(\d+)$/)
  return match ? Number(match[1]) : null
}

function readSavedUserId(): number | null {
  try {
    const raw = window.localStorage.getItem(USER_KEY)
    return raw ? Number(raw) : null
  } catch {
    // private window or blocked storage, just start with the first user
    return null
  }
}

function saveUserId(id: number) {
  try {
    window.localStorage.setItem(USER_KEY, String(id))
  } catch {
    // ignore, the switcher still works for this page
  }
}

function App() {
  const [users, setUsers] = useState<User[]>([])
  const [userId, setUserId] = useState<number | null>(readSavedUserId)
  const [docs, setDocs] = useState<DocSummary[]>([])
  const [openId, setOpenId] = useState<number | null>(docIdFromHash)
  const [error, setError] = useState('')
  const [loadingDocs, setLoadingDocs] = useState(false)

  const currentUser = users.find((u) => u.id === userId) ?? null

  // users first, the switcher needs them
  useEffect(() => {
    listUsers()
      .then((list) => {
        setUsers(list)
        setUserId((prev) => (prev && list.some((u) => u.id === prev) ? prev : (list[0]?.id ?? null)))
      })
      .catch((e: Error) => setError(`Could not load users: ${e.message}`))
  }, [])

  // every API call sends the chosen user's id
  useEffect(() => {
    setCurrentUser(userId)
    if (userId !== null) saveUserId(userId)
  }, [userId])

  const refreshDocs = useCallback(async () => {
    if (userId === null) return
    setLoadingDocs(true)
    try {
      setDocs(await listDocuments())
      setError('')
    } catch (e) {
      setError(`Could not load documents: ${(e as Error).message}`)
    } finally {
      setLoadingDocs(false)
    }
  }, [userId])

  useEffect(() => {
    void refreshDocs()
  }, [refreshDocs])

  // back and forward buttons, and links that change the hash
  useEffect(() => {
    function onHash() {
      setOpenId(docIdFromHash())
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  function openDoc(id: number) {
    window.location.hash = `#/doc/${id}`
    setOpenId(id)
    void refreshDocs()
  }

  function closeDoc() {
    window.location.hash = ''
    setOpenId(null)
    void refreshDocs()
  }

  function switchUser(id: number) {
    // the list reloads by itself when userId changes, so no refresh here.
    // A refresh here would still send the old user's id.
    setUserId(id)
    window.location.hash = ''
    setOpenId(null)
  }

  return (
    <div className="min-h-screen bg-stone-100 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
              D
            </span>
            <div>
              <h1 className="text-base font-semibold leading-tight">Docs</h1>
              <p className="hidden text-xs text-slate-500 md:block">
                Mock login: pick a seeded user. There are no passwords, so this is not real auth.
              </p>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-slate-600">Signed in as</span>
            <select
              value={userId ?? ''}
              onChange={(e) => switchUser(Number(e.target.value))}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm shadow-sm"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
        )}

        <main>
          {!currentUser ? (
            <p className="text-sm text-slate-500">Loading users...</p>
          ) : openId !== null ? (
            <Editor key={`${currentUser.id}-${openId}`} docId={openId} user={currentUser} onBack={closeDoc} />
          ) : loadingDocs && docs.length === 0 ? (
            <p className="text-sm text-slate-500">Loading documents...</p>
          ) : (
            <DocumentList docs={docs} onOpen={openDoc} onChanged={refreshDocs} onError={setError} />
          )}
        </main>
      </div>
    </div>
  )
}

export default App
