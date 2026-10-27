export type AuditSortKey =
  | 'name'
  | 'performancePct'
  | 'weeklyAvg'
  | 'absences'

export type SortDirection = 'asc' | 'desc'

export type AuditSortState = {
  key: AuditSortKey
  direction: SortDirection
}

export type AuditPerson = {
  score: number | null
  weeklyAvg: number | null
  attendance: { absences: number } | null
}

export type AuditRow<T extends AuditPerson = AuditPerson> = {
  userId: string
  name: string
  person: T
}

function sortValue(row: AuditRow, key: AuditSortKey): string | number {
  if (key === 'name') return row.name
  if (key === 'absences') return row.person.attendance?.absences ?? 0
  if (key === 'weeklyAvg') return row.person.weeklyAvg ?? 0
  return row.person.score ?? 0
}

export function sortAuditRows<T extends AuditPerson>(
  rows: Array<AuditRow<T>>,
  sort: AuditSortState
): Array<AuditRow<T>> {
  const sorted = [...rows].sort((a, b) => {
    const left = sortValue(a, sort.key)
    const right = sortValue(b, sort.key)

    if (typeof left === 'string' || typeof right === 'string') {
      return String(left).localeCompare(String(right))
    }
    return left - right
  })

  return sort.direction === 'asc' ? sorted : sorted.reverse()
}
