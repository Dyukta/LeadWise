export const LEAD_STATUSES = [
  'new',
  'contacted',
  'ringing',
  'site_visit_scheduled',
  'site_visit_done',
  'revisit_scheduled',
  'booked',
  'documentation',
  'agreement_done',
  'disbursement_done',
  'closed',
  'lost'
] as const

type LeadStatus = (typeof LEAD_STATUSES)[number]

const labels: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  ringing: 'Ringing',
  site_visit_scheduled: 'Site visit scheduled',
  site_visit_done: 'Site visit done',
  revisit_scheduled: 'Revisit scheduled',
  booked: 'Booked',
  documentation: 'Documentation',
  agreement_done: 'Agreement done',
  disbursement_done: 'Disbursement done',
  closed: 'Closed',
  lost: 'Lost'
}

export function statusLabel(status: string): string {
  return labels[status as LeadStatus] ?? status
}

export function isTerminalStatus(status: string): boolean {
  return status === 'closed' || status === 'lost'
}

export const LOST_REASONS = [
  'Price too high',
  'Location did not suit',
  'Loan not approved',
  'Bought elsewhere',
  'Not responding',
  'Not a serious buyer',
  'Other'
] as const
