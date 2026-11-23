// All backend calls live here so the real task only changes one file.

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/$/, '')

export type Item = {
  id: number
  text: string
  summary: string
  category: string
  priority: 'low' | 'medium' | 'high'
  confidence: number
  reasons: string[]
  needs_review: boolean
  review_status: string
  created_at: string
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
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
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

export function listItems() {
  return request<Item[]>('/api/items')
}

export function createItem(text: string) {
  return request<Item>('/api/items', { method: 'POST', body: JSON.stringify({ text }) })
}

export function reviewItem(id: number, status: 'approved' | 'rejected') {
  return request<Item>(`/api/items/${id}/review`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}
