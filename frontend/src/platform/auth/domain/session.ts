export type Role = 'owner' | 'employee'

export type Session = {
  userId: string
  email: string
  fullName: string
  role: Role
}

type LeadsView = 'mine' | 'unassigned' | 'others' | 'all'

export function isOwner(session: Session | null): boolean {
  return session?.role === 'owner'
}

export function allowedLeadsViews(session: Session | null): LeadsView[] {
  if (!session) return []
  return isOwner(session)
    ? ['mine', 'unassigned', 'others', 'all']
    : ['mine', 'unassigned', 'all']
}

export type RedirectError = { code: string; description: string }

export function readRedirectError(): RedirectError | null {
  const search = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const read = (key: string) => search.get(key) ?? hash.get(key)

  const description = read('error_description') ?? read('error')
  if (!description) return null

  return { code: read('error_code') ?? read('error') ?? '', description }
}

export function isCancelledSignIn(error: RedirectError): boolean {
  return error.code === 'access_denied'
}

export function parseRole(value: unknown): Role {
  return value === 'owner' ? 'owner' : 'employee'
}

export class AccessDeniedError extends Error {
  readonly email: string

  constructor(email: string) {
    super('This account does not have access to this dashboard.')
    this.name = 'AccessDeniedError'
    this.email = email
  }
}
