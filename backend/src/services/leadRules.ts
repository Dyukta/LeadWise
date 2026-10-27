export const LEAD_STATUSES = ['new', 'contacted', 'ringing','site_visit_scheduled','site_visit_done','revisit_scheduled','booked', 'documentation','agreement_done','disbursement_done','closed','lost'] as const

const LEAD_PRIORITIES = ['high', 'medium', 'low'] as const

type Priority = (typeof LEAD_PRIORITIES)[number]

const POSSESSION_PRIORITY: Record<string, Priority> = {
  'under 6 months': 'high',
  '6 months to 1 year': 'medium',
  'more than 1 year': 'low'
}

export function isTerminalStatus(status: string): boolean {
  return status === 'closed' || status === 'lost'
}

export function isLeadStatus(value: unknown): value is (typeof LEAD_STATUSES)[number] {
  return typeof value === 'string' && (LEAD_STATUSES as readonly string[]).includes(value)
}

export function isPriority(value: unknown): value is Priority {
  return typeof value === 'string' && (LEAD_PRIORITIES as readonly string[]).includes(value)
}

export function priorityForPossession(possession: string | null): Priority | null {
  return POSSESSION_PRIORITY[(possession ?? '').trim().toLowerCase()] ?? null
}

export function phoneKey(phone: unknown): string {
  const digits = String(phone ?? '').replace(/\D/g, '')
  return digits.length > 10 ? digits.slice(-10) : digits
}

export function sameText(a: string | null | undefined, b: string | null | undefined): boolean {
  return (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase()
}
