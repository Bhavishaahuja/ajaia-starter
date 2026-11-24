import { useCallback, useEffect, useState } from 'react'
import { ApiError, getMe, listDocuments, setAccessToken, type DocSummary, type User } from './api'
import DocumentList from './DocumentList'
import Editor from './Editor'
import Login from './Login'

const TOKEN_KEY = 'docEditorToken'

// the open document lives in the URL hash, so a refresh stays on the same doc
function docIdFromHash(): number | null {
  const match = window.location.hash.match(/^#\/doc\/(\d+)$/)
  return match ? Number(match[1]) : null
}

function readToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY)
  } catch {
    // private window or blocked storage, the user just signs in again
    return null
  }
}

function writeToken(token: string | null) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token)
    else window.localStorage.removeItem(TOKEN_KEY)
  } catch {
    // ignore, the login still works for this page
  }
}

function App() {
  const [token, setToken] = useState<string | null>(readToken)
  const [me, setMe] = useState<User | null>(null)
  const [docs, setDocs] = useState<DocSummary[]>([])
  const [openId, setOpenId] = useState<number | null>(docIdFromHash)
  const [error, setError] = useState('')
  const [loadingDocs, setLoadingDocs] = useState(false)

  function signOut() {
    writeToken(null)
    setAccessToken(null)
    setToken(null)
    setMe(null)
    setDocs([])
    window.location.hash = ''
    setOpenId(null)
  }

  // every API call sends the token. A bad or expired token signs the user out.
  useEffect(() => {
    setAccessToken(token)
    if (!token) return
    getMe()
      .then(setMe)
      .catch((e: Error) => {
        if (e instanceof ApiError && e.status === 401) signOut()
        else setError(`Could not reach the server: ${e.message}`)
      })
    // signOut is a plain function that only uses setters, so it is safe here
  }, [token])

  const refreshDocs = useCallback(async () => {
    if (!token) return
    setLoadingDocs(true)
    try {
      setDocs(await listDocuments())
      setError('')
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) signOut()
      else setError(`Could not load documents: ${(e as Error).message}`)
    } finally {
      setLoadingDocs(false)
    }
  }, [token])

  useEffect(() => {
    if (me) void refreshDocs()
  }, [me, refreshDocs])

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

  function handleSignedIn(newToken: string) {
    writeToken(newToken)
    setToken(newToken)
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-xl font-semibold">Docs</h1>
            {me && <p className="text-xs text-slate-500">Signed in as {me.email}</p>}
          </div>
          {me && (
            <button onClick={signOut} className="text-sm text-slate-600 underline hover:text-slate-900">
              Sign out
            </button>
          )}
        </header>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
        )}

        <main className="mt-6">
          {!token || !me ? (
            token ? (
              <p className="text-sm text-slate-500">Signing in...</p>
            ) : (
              <Login onSignedIn={handleSignedIn} />
            )
          ) : openId !== null ? (
            <Editor key={`${me.id}-${openId}`} docId={openId} user={me} onBack={closeDoc} />
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
