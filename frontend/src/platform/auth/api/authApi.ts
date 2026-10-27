import { normalizeEmail } from '@platform/auth/domain/credentials'
import { AccessDeniedError, parseRole, type Session } from '@platform/auth/domain/session'
import { requireEnv } from '@shared/lib/env'
import { getSupabase } from '@shared/lib/supabase'

export async function fetchGoogleSignInEnabled(): Promise<boolean> {
  const response = await fetch(`${requireEnv('VITE_SUPABASE_URL')}/auth/v1/settings`, {
    headers: { apikey: requireEnv('VITE_SUPABASE_PUBLISHABLE_KEY') }
  })
  if (!response.ok) return false
  const settings = (await response.json()) as { external?: Record<string, boolean> }
  return settings.external?.google === true
}

type Claims = {
  sub: string
  email: string | null
}

export async function fetchClaims(): Promise<Claims | null> {
  const { data, error } = await getSupabase().auth.getClaims()

  if (error) throw new Error(humanize(error.message))
  if (!data) return null

  return {
    sub: data.claims.sub,
    email: data.claims.email ?? null
  }
}

function humanize(message: string): string {
  const normalized = message.toLowerCase()

  if (normalized.includes('invalid login credentials')) {
    return 'Email or password is invalid.'
  }
  if (normalized.includes('email not confirmed')) {
    return 'This email has not been confirmed yet. Ask the owner to resend the invite.'
  }
  if (normalized.includes('too many requests') || normalized.includes('rate limit')) {
    return 'Too many attempts. Wait a minute and try again.'
  }
  if (normalized.includes('failed to fetch')) {
    return 'Could not reach the server. Check your connection.'
  }

  return message
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await getSupabase().auth.signInWithPassword({
    email: normalizeEmail(email),
    password
  })
  if (error) throw new Error(humanize(error.message))
}

export async function signInWithGoogle(): Promise<void> {
  const { error } = await getSupabase().auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/login`
    }
  })
  if (error) throw new Error(humanize(error.message))
}

export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await getSupabase().auth.resetPasswordForEmail(normalizeEmail(email), {
    redirectTo: `${window.location.origin}/reset-password`
  })
  if (error) throw new Error(humanize(error.message))
}

function isSamePassword(error: { code?: string; message: string }): boolean {
  return error.code === 'same_password' || /different from the old password/i.test(error.message)
}

export async function updateOwnPassword(password: string): Promise<void> {
  const { error } = await getSupabase().auth.updateUser({ password })
  if (error && !isSamePassword(error)) throw new Error(humanize(error.message))
}

export async function signOut(): Promise<void> {
  const { error } = await getSupabase().auth.signOut()
  if (error) await getSupabase().auth.signOut({ scope: 'local' })
}

export async function fetchProfile(claims: Claims): Promise<Session> {
  const { data, error } = await getSupabase()
    .from('users')
    .select('id, email, full_name, role, active')
    .eq('id', claims.sub)
    .maybeSingle()

  if (error) throw new Error(humanize(error.message))

  if (!data || data.active === false) {
    throw new AccessDeniedError(claims.email ?? '')
  }

  return {
    userId: claims.sub,
    email: (data.email as string | null) ?? claims.email ?? '',
    fullName: (data.full_name as string | null) ?? '',
    role: parseRole(data.role)
  }
}

const authListeners = new Set<() => void>()
let unsubscribeAuth: (() => void) | null = null

export function onAuthChange(callback: () => void): () => void {
  authListeners.add(callback)

  if (!unsubscribeAuth) {
    const {
      data: { subscription }
    } = getSupabase().auth.onAuthStateChange(() => {
      for (const listener of [...authListeners]) listener()
    })

    unsubscribeAuth = () => subscription.unsubscribe()
  }

  return () => {
    authListeners.delete(callback)

    if (authListeners.size === 0) {
      unsubscribeAuth?.()
      unsubscribeAuth = null
    }
  }
}
