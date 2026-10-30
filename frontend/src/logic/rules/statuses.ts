export const LEAD_STATUSES = [
  'new',
  'not_answered',
  'call_after_some_time',
  'sent_details',
  'lost',
  'not_reachable',
  'switched_off',
  'reg_done',
  'closed'
] as const

const labels: Record<string, string> = {
  new: 'New',
  not_answered: 'Not answered',
  call_after_some_time: 'Call after some time',
  sent_details: 'Details shared',
  lost: 'Lost',
  not_reachable: 'Not reachable',
  switched_off: 'Switched Off',
  reg_done: 'Registration Done/Token amt taken',
  closed: 'Investment Done/Closed',
  call_back_later: 'Call back later',
  interested: 'Interested',
  invalid_number: 'Invalid Number',
  not_interested: 'Not Interested'
}

export function statusLabel(status: string): string {
  return labels[status] ?? status
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
