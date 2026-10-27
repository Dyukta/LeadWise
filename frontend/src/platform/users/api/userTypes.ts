import type { Role } from '@platform/auth/domain/session'

export type AppUser = {
  id: string
  email: string
  fullName: string
  role: Role
  active: boolean
}

export type MoveLeads = (
  fromUserId: string,
  toUserId: string,
  toUserName: string,
  keepFrom?: boolean
) => Promise<number>
