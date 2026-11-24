// All backend calls live here. Screens import from this file only.

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/$/, '')

export type User = { id: number; email: string; name: string }

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export type DocSummary = {
  id: number
  title: string
  owner_id: number
  owner_name: string
  role: 'owner' | 'editor'
  updated_at: string
}

export type DocFull = DocSummary & { html: string }

export type Share = { user_id: number; email: string; name: string }

// Supabase access token from the login. Sent as a Bearer token on every call.
let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {}
  // FormData sets its own content type, so only send JSON when it is not FormData
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string> | undefined) },
  })
  if (!res.ok) {
    // FastAPI puts the message in detail (string, or a list for 422s)
    let message = `Request failed (${res.status})`
    try {
      const body = await res.json()
      if (typeof body.detail === 'string') message = body.detail
      else if (Array.isArray(body.detail) && body.detail[0]?.msg) message = body.detail[0].msg
    } catch {
      // not JSON, keep the default message
    }
    throw new ApiError(message, res.status)
  }
  return res.json() as Promise<T>
}

export function getMe() {
  return request<User>('/api/me')
}

export function listDocuments() {
  return request<DocSummary[]>('/api/documents')
}

export function createDocument(title: string) {
  return request<DocFull>('/api/documents', { method: 'POST', body: JSON.stringify({ title }) })
}

export function getDocument(id: number) {
  return request<DocFull>(`/api/documents/${id}`)
}

export function updateDocument(id: number, changes: { title?: string; html?: string }) {
  return request<DocFull>(`/api/documents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  })
}

export function importDocument(file: File) {
  const form = new FormData()
  form.append('file', file)
  return request<DocFull>('/api/documents/import', { method: 'POST', body: form })
}

export function listShares(id: number) {
  return request<Share[]>(`/api/documents/${id}/shares`)
}

export function shareDocument(id: number, email: string) {
  return request<Share>(`/api/documents/${id}/shares`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}
