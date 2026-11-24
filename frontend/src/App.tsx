import { useEffect, useState } from 'react'
import { createItem, listItems, reviewItem, type Item } from './api'

const MAX_LENGTH = 5000

const priorityColors: Record<string, string> = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-amber-100 text-amber-800',
  low: 'bg-green-100 text-green-800',
}

function App() {
  const [text, setText] = useState('')
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    listItems()
      .then(setItems)
      .catch((e: Error) => setError(`Could not load items: ${e.message}`))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setLoading(true)
    setError('')
    try {
      const item = await createItem(text)
      setItems((prev) => [item, ...prev])
      setText('')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleReview(id: number, status: 'approved' | 'rejected') {
    try {
      const updated = await reviewItem(id, status)
      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Request triage</h1>
        <p className="mt-1 text-sm text-slate-600">
          Paste a request. The AI suggests a category and priority, rules decide if a person needs to check it.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <textarea
            className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            rows={4}
            maxLength={MAX_LENGTH}
            placeholder="e.g. The export button does nothing on Safari"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {text.length}/{MAX_LENGTH}
            </span>
            <button
              type="submit"
              disabled={loading || !text.trim()}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
        )}

        <ul className="mt-8 space-y-3">
          {items.length === 0 && <li className="text-sm text-slate-500">Nothing here yet.</li>}
          {items.map((item) => (
            <li key={item.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded bg-slate-100 px-2 py-0.5 font-medium">{item.category}</span>
                <span className={`rounded px-2 py-0.5 font-medium ${priorityColors[item.priority] ?? ''}`}>
                  {item.priority}
                </span>
                <span className="text-slate-500">confidence {Math.round(item.confidence * 100)}%</span>
                <span className="ml-auto text-slate-500">{item.review_status}</span>
              </div>
              <p className="mt-2 text-sm font-medium">{item.summary}</p>
              <p className="mt-1 text-xs text-slate-500">{item.reasons.join(' · ')}</p>

              {item.needs_review && item.review_status === 'pending' && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleReview(item.id, 'approved')}
                    className="rounded border border-green-300 px-3 py-1 text-xs text-green-800 hover:bg-green-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReview(item.id, 'rejected')}
                    className="rounded border border-red-300 px-3 py-1 text-xs text-red-800 hover:bg-red-50"
                  >
                    Reject
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default App
