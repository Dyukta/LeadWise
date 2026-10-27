import { Router } from 'express'

import { requireOwner, viewerOf } from '../auth.ts'
import { db, must } from '../db.ts'
import { badRequest, requireId, route } from '../lib/errors.ts'

type Body = {
  action?: 'create' | 'update' | 'delete'
  email?: unknown
  fullName?: unknown
  role?: 'owner' | 'employee'
  id?: unknown
  active?: boolean
  password?: unknown
}

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const MIN_PASSWORD = 8

function checkedPassword(value: unknown): string {
  const password = typeof value === 'string' ? value : ''
  if (password.length < MIN_PASSWORD) {
    throw badRequest(`The password must be at least ${MIN_PASSWORD} characters.`)
  }
  return password
}

export const usersRouter = Router()

usersRouter.post(
  '/',
  route(async (req, res) => {
    const viewer = viewerOf(res)
    requireOwner(viewer)

    const body = (req.body ?? {}) as Body
    if (body.action === 'create') return create(body)
    if (body.action === 'update') return update(body, viewer.id)
    if (body.action === 'delete') return remove(body, viewer.id)
    throw badRequest('Unknown action.')
  })
)

async function findAuthId(email: string): Promise<string | null> {
  for (let page = 1; ; page += 1) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(error.message)
    const match = data.users.find((user) => user.email?.toLowerCase() === email)
    if (match) return match.id
    if (data.users.length < 1000) return null
  }
}

async function create(body: Body) {
  const email = text(body.email).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw badRequest('Enter a valid email address.')

  const role = body.role === 'owner' ? 'owner' : 'employee'
  const fullName = text(body.fullName)
  const password = checkedPassword(body.password)

  must(await db.from('allowed_emails').upsert({ email }))

  const created = await db.auth.admin.createUser({ email, password, email_confirm: true })
  let authId = created.data?.user?.id ?? null

  if (!authId) {
    if (!/already|registered|exists/i.test(created.error?.message ?? '')) {
      throw badRequest(created.error?.message ?? 'Could not create the account.')
    }
    authId = await findAuthId(email)
    if (!authId) throw badRequest('That address already exists but could not be found.')

    const { error } = await db.auth.admin.updateUserById(authId, { password, email_confirm: true })
    if (error) throw badRequest(error.message)
  }

  must(
    await db
      .from('users')
      .upsert({ id: authId, email, full_name: fullName, role, active: true })
  )

  return { ok: true, id: authId }
}

async function update(body: Body, callerId: string) {
  const id = requireId(body.id)
  if (id === callerId && (body.role === 'employee' || body.active === false)) {
    throw badRequest('You cannot remove your own access.')
  }

  const patch: Record<string, unknown> = {}
  if (typeof body.fullName === 'string') patch.full_name = body.fullName.trim()
  if (body.role) patch.role = body.role === 'owner' ? 'owner' : 'employee'
  if (typeof body.active === 'boolean') patch.active = body.active

  const password = body.password ? checkedPassword(body.password) : null
  if (Object.keys(patch).length === 0 && !password) throw badRequest('Nothing to change.')

  if (password) {
    const { error } = await db.auth.admin.updateUserById(id, { password })
    if (error) throw badRequest(error.message)
  }
  if (Object.keys(patch).length > 0) must(await db.from('users').update(patch).eq('id', id))
  return { ok: true }
}

async function remove(body: Body, callerId: string) {
  const id = requireId(body.id)
  if (id === callerId) throw badRequest('You cannot delete your own account.')

  const doomed = must(await db.from('users').select('email').eq('id', id).maybeSingle())

  const { error } = await db.auth.admin.deleteUser(id)
  if (error) throw badRequest(error.message)

  if (doomed?.email) {
    must(await db.from('allowed_emails').delete().eq('email', doomed.email.toLowerCase()))
  }

  return { ok: true }
}
