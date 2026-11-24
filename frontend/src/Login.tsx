import { useState } from 'react'
import { authConfigured, signIn, signUp } from './auth'

type Props = {
  onSignedIn: (token: string) => void
}

export default function Login({ onSignedIn }: Props) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setInfo('')
    try {
      if (mode === 'signup') {
        const result = await signUp(name.trim() || email.split('@')[0], email.trim(), password)
        if (result.token) onSignedIn(result.token)
        else setInfo(result.message)
      } else {
        const result = await signIn(email.trim(), password)
        if (result.token) onSignedIn(result.token)
        else setError('Sign-in failed.')
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const input =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400'

  return (
    <div className="mx-auto max-w-sm rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => setMode('signin')}
          className={`flex-1 rounded-lg py-2 ${mode === 'signin' ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode('signup')}
          className={`flex-1 rounded-lg py-2 ${mode === 'signup' ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}
        >
          Create account
        </button>
      </div>

      {!authConfigured && (
        <p className="mb-3 rounded bg-amber-50 p-2 text-xs text-amber-800">
          Supabase is not configured in this build (VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY).
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'signup' && (
          <input className={input} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        )}
        <input
          className={input}
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className={input}
          type="password"
          required
          minLength={6}
          placeholder="Password (6+ characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="submit"
          disabled={busy || !authConfigured}
          className="w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {busy ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      {info && <p className="mt-3 text-sm text-green-700">{info}</p>}
    </div>
  )
}
