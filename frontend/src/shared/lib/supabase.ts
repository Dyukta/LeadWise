import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { requireEnv } from '@shared/lib/env'

let client: SupabaseClient | null = null

let accessToken: string | null = null

export function getSupabase(): SupabaseClient {
  if (client) return client

  client = createClient(
    requireEnv('VITE_SUPABASE_URL'),
    requireEnv('VITE_SUPABASE_PUBLISHABLE_KEY')
  )

  client.auth.onAuthStateChange((_event, session) => {
    accessToken = session?.access_token ?? null
  })
  return client
}

export function getAccessToken(): string | null {
  getSupabase()
  return accessToken
}
