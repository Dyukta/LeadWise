import { NEUTRAL_COLOR } from './grading.ts'

type TargetStatus = 'on target' | 'on track' | 'at risk' | 'behind'

const STATUS_LABELS: Record<TargetStatus, string> = {
  'on target': 'On Target',
  'on track': 'On Track',
  'at risk': 'At Risk',
  behind: 'Behind'
}

const STATUS_COLORS: Record<TargetStatus, string> = {
  'on target': 'var(--color-grade-a)',
  'on track': 'var(--color-grade-b)',
  'at risk': 'var(--color-grade-b)',
  behind: 'var(--color-grade-c)'
}

function asStatus(pacing: string | null): TargetStatus | null {
  return pacing !== null && pacing in STATUS_LABELS ? (pacing as TargetStatus) : null
}

export function pacingLabel(pacing: string | null): string {
  const status = asStatus(pacing)
  return status ? STATUS_LABELS[status] : 'N/A'
}

export function pacingColor(pacing: string | null): string {
  const status = asStatus(pacing)
  return status ? STATUS_COLORS[status] : NEUTRAL_COLOR
}
