import { getAccessToken, getSupabase } from '@shared/lib/supabase'

const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

export const endpoints = {
  leads: '/leads/list',
  leadWrite: '/leads/write',
  leadsSync: '/leads/import',
  leadCall: '/leads/call',
  calls: '/leads/calls',
  campaigns: '/campaigns/list',
  campaignWrite: '/campaigns/write',
  projects: '/projects/list',
  projectWrite: '/projects/write',
  performance: '/performance/summary',
  performanceMonths: '/performance/months',
  reportWrite: '/performance/reports',
  masterWrite: '/performance/kpis',
  users: '/users'
}

export class HttpError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, body: unknown, message: string) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.body = body
  }
}

async function bearer(): Promise<Record<string, string>> {
  let token = getAccessToken()

  if (!token) {
    const { data } = await getSupabase().auth.getSession()
    token = data.session?.access_token ?? null
  }

  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request<T>(
  path: string,
  options: { method: 'GET' | 'POST'; body?: unknown; signal?: AbortSignal } = { method: 'GET' }
): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE}${path}`, {
      method: options.method,
      signal: options.signal,
      headers: {
        ...(await bearer()),
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' })
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    })
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
    throw new Error('Could not reach the server. Check your connection.', { cause })
  }

  const text = await response.text()
  let payload: unknown
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    payload = text
  }

  if (!response.ok) {
    throw new HttpError(response.status, payload, failureMessage(response.status, payload))
  }

  return payload as T
}

function readable(message: string): string {
  if (message.length <= 300 && !/<[a-z!]/i.test(message)) return message
  return 'The server hit an unexpected error. Try again in a moment.'
}

function failureMessage(status: number, payload: unknown): string {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    return readable(String((payload as { error: unknown }).error))
  }
  if (status === 401) return 'Your session has expired. Sign in again.'
  if (status === 403) return 'You do not have access to that.'
  if (status === 404 || status === 502 || status === 504) {
    return 'The API is not reachable. Check that the backend is running.'
  }
  return `Request failed (${status}).`
}

export class ApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

export function unwrap<T extends { ok: boolean; error?: string | null }>(payload: T): T {
  if (payload?.ok) return payload

  throw new ApiError(
    payload?.error
      ? readable(payload.error)
      : `The server replied without a result: ${readable(JSON.stringify(payload))}`
  )
}

export const http = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { method: 'GET', signal }),
  post: <T>(path: string, body: unknown, signal?: AbortSignal) =>
    request<T>(path, { method: 'POST', body, signal })
}
