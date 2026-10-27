import type { NextFunction, Request, Response } from 'express'

import { config } from './config.ts'
import { db } from './db.ts'
import { ApiError, forbidden } from './lib/errors.ts'

export type Role = 'owner' | 'employee'

export type Viewer = {
  id: string
  email: string
  name: string
  role: Role
}

function bearer(req: Request): string | null {
  const match = /^Bearer\s+(.+)$/i.exec(req.headers.authorization ?? '')
  return match?.[1]?.trim() || null
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const token = bearer(req)
    if (!token) throw new ApiError(401, 'Sign in again.')

    const { data, error } = await db.auth.getClaims(token)
    const userId = data?.claims?.sub
    if (error || !userId) throw new ApiError(401, 'Your session has expired. Sign in again.')

    const { data: profile, error: profileError } = await db
      .from('users')
      .select('id, email, full_name, role, active')
      .eq('id', userId)
      .maybeSingle()

    if (profileError) throw new Error(profileError.message)
    if (!profile || profile.active !== true) {
      throw new ApiError(403, `This account does not have access to ${config.appName}.`)
    }

    res.locals.viewer = {
      id: profile.id,
      email: profile.email,
      name: profile.full_name || profile.email,
      role: profile.role === 'owner' ? 'owner' : 'employee'
    } satisfies Viewer

    next()
  } catch (error) {
    next(error)
  }
}

export function viewerOf(res: Response): Viewer {
  return res.locals.viewer as Viewer
}

export function requireOwner(viewer: Viewer): void {
  if (viewer.role !== 'owner') throw forbidden()
}
