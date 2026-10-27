import { parseRole, type Role } from '@platform/auth/domain/session'
import type { AppUser } from '@platform/users/api/userTypes'
import { endpoints, http, unwrap } from '@shared/lib/http'
import { getSupabase } from '@shared/lib/supabase'

export async function listUsers(): Promise<AppUser[]> {
  const { data, error } = await getSupabase()
    .from('users')
    .select('id, email, full_name, role, active')
    .order('full_name', { ascending: true })

  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => ({
    id: row.id as string,
    email: (row.email as string | null) ?? '',
    fullName: (row.full_name as string | null) ?? '',
    role: parseRole(row.role),
    active: (row.active as boolean | null) ?? true
  }))
}

async function manageUsers<T extends { ok: boolean; error?: string }>(
  body: Record<string, unknown>
): Promise<T> {
  return unwrap(await http.post<T>(endpoints.users, body))
}

export function createUser(input: {
  email: string
  fullName: string
  role: Role
  password: string
}): Promise<string> {
  return manageUsers<{ ok: boolean; id: string }>({ action: 'create', ...input }).then(
    (result) => result.id
  )
}

export function updateUser(input: {
  id: string
  fullName?: string
  role?: Role
  active?: boolean
  password?: string
}): Promise<void> {
  return manageUsers({ action: 'update', ...input }).then(() => undefined)
}

export function deleteUser(id: string): Promise<void> {
  return manageUsers({ action: 'delete', id }).then(() => undefined)
}
