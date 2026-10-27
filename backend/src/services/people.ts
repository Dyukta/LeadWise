import { db, must } from '../db.ts'

export type Person = {
  id: string
  email: string
  name: string
  role: 'owner' | 'employee'
  active: boolean
}

export async function listPeople(): Promise<Person[]> {
  const rows = must(
    await db.from('users').select('id, email, full_name, role, active').order('full_name')
  )

  return (rows ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    name: row.full_name || row.email,
    role: row.role === 'owner' ? 'owner' : 'employee',
    active: row.active !== false
  }))
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name
}
