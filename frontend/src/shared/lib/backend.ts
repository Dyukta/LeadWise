import { env } from '@shared/lib/env'
import { writeCachedSession } from '@shared/lib/sessionCache'
import { supabase } from '@shared/lib/supabase'

const EMPTY: Record<string, unknown> = {
  currentSession: { userId: '', email: '', fullName: 'Preview', role: 'owner' },
  listLeads: { leads: [], roster: [], months: [], syncedAt: null },
  performance: { mine: [] },
  callStats: { calls: [], people: [] },
  listUsers: [],
  listCampaigns: [],
  listSources: []
}

export type BackendError = Error & { retry: boolean }

const failure = (message: string, retry: boolean): BackendError => Object.assign(new Error(message), { retry })

export const call = <T>(action: string, ...args: unknown[]) => send<T>(action, args)

export async function send<T>(action: string, args: unknown[], id?: string): Promise<T> {
  if (!env.apiUrl) {
    if (action in EMPTY) return EMPTY[action] as T
    throw failure('The backend is not connected yet.', false)
  }

  const token = (await supabase?.auth.getSession())?.data.session?.access_token ?? null
  const response = await fetch(env.apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, args, token, id })
  }).catch(() => null)
  const body = response?.ok
    ? ((await response.json().catch(() => null)) as { ok: boolean; data?: T; error?: string; retry?: boolean } | null)
    : null
  if (!body) throw failure('Could not reach the server. Try again in a moment.', true)
  if (!body.ok) {
    const expired = /session has expired/i.test(body.error ?? '')
    if (expired && window.location.pathname !== '/login') {
      writeCachedSession(null)
      await supabase?.auth.signOut()
      window.location.assign('/login')
    }
    throw failure(body.error ?? 'Something went wrong.', expired || body.retry === true)
  }
  return body.data as T
}
