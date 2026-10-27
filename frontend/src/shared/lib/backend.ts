import { env } from '@shared/lib/env'
import { writeCachedSession } from '@shared/lib/sessionCache'
import { supabase } from '@shared/lib/supabase'

const EMPTY: Record<string, unknown> = {
  currentSession: { userId: '', email: '', fullName: 'Preview', role: 'owner' },
  listLeads: { leads: [], roster: [], months: [], syncedAt: null },
  performance: { mine: [], board: [] },
  callStats: { calls: [], people: [] },
  listProjects: [],
  listUsers: [],
  listCampaigns: [],
  listSources: []
}

export async function call<T>(action: string, ...args: unknown[]): Promise<T> {
  if (!env.apiUrl) {
    if (action in EMPTY) return EMPTY[action] as T
    throw new Error('The backend is not connected yet.')
  }

  const token = (await supabase?.auth.getSession())?.data.session?.access_token ?? null
  const response = await fetch(env.apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, args, token })
  })
  if (!response.ok) throw new Error('Could not reach the server. Try again in a moment.')
  const body = (await response.json()) as { ok: boolean; data?: T; error?: string }
  if (!body.ok) {
    if (/session has expired/i.test(body.error ?? '') && window.location.pathname !== '/login') {
      writeCachedSession(null)
      await supabase?.auth.signOut()
      window.location.assign('/login')
    }
    throw new Error(body.error ?? 'Something went wrong.')
  }
  return body.data as T
}
