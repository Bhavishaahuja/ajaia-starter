// Talks to Supabase Auth directly with its REST API. No password ever goes to our backend.

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '')
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''

export type AuthResult = { token: string | null; message: string }

async function authCall(path: string, body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1${path}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    const message = (data.msg ?? data.error_description ?? data.message ?? 'Sign-in failed.') as string
    throw new Error(message)
  }
  return data
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const data = await authCall('/token?grant_type=password', { email, password })
  return { token: (data.access_token as string) ?? null, message: '' }
}

export async function signUp(name: string, email: string, password: string): Promise<AuthResult> {
  const data = await authCall('/signup', { email, password, data: { name } })
  // if email confirmation is on, Supabase sends no session yet
  const token = (data.access_token as string) ?? null
  return {
    token,
    message: token ? '' : 'Account created. Check your email to confirm, then sign in.',
  }
}

export const authConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY)
