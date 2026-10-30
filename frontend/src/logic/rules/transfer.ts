import { isTerminalStatus } from './statuses.ts'

export type LeadAssignee = { id: string | null; name: string }

type AssignCheck = { ok: true } | { ok: false; reason: string }

export function assigneeNames(assignees: LeadAssignee[]): string {
  return assignees.map((person) => person.name).join(', ')
}

export function canAssign(params: {
  status: string
  assignees: LeadAssignee[]
  toUserId: string | null
}): AssignCheck {
  if (!params.toUserId) return { ok: false, reason: 'Pick the person to handle this lead.' }
  if (isTerminalStatus(params.status)) {
    return { ok: false, reason: 'Closed leads cannot be reassigned.' }
  }
  const current = params.assignees.map((person) => person.id)
  if (current.length === 1 && current[0] === params.toUserId) {
    return { ok: false, reason: 'This lead is already with that person.' }
  }
  return { ok: true }
}

type HandoverGroup = { leadIds: string[]; toUserIds: string[] }

const BATCH = 200

export function handoverPlan(
  leads: { id: string; status: string; assignees: LeadAssignee[] }[],
  fromUserId: string,
  toUserId: string
): HandoverGroup[] {
  const ids = leads
    .filter((lead) => !isTerminalStatus(lead.status) && lead.assignees.some((person) => person.id === fromUserId))
    .map((lead) => lead.id)
  const batched: HandoverGroup[] = []
  for (let i = 0; i < ids.length; i += BATCH) batched.push({ toUserIds: [toUserId], leadIds: ids.slice(i, i + BATCH) })
  return batched
}

export function splitByCounts(
  leadIds: string[],
  counts: { userId: string; count: number }[]
): { userId: string; leadIds: string[] }[] {
  let start = 0
  const groups = counts.map(({ userId, count }) => {
    const end = start + Math.max(0, count)
    const group = { userId, leadIds: leadIds.slice(start, end) }
    start = end
    return group
  })
  return groups.filter((group) => group.leadIds.length > 0)
}
