export type Breakdown = { name: string; leads: number; closed: number }

export type Period = { month: string; range: { from: string; to: string } | null }

type Scored = { status: string; amount?: number | null; assignees: { id: string | null }[] }

export const isClosed = (lead: { status: string }) => lead.status === 'closed'

export const conversion = (row: { leads: number; closed: number }) => (row.leads ? row.closed / row.leads : 0)

export const percent = (row: { leads: number; closed: number }) => `${Math.round(conversion(row) * 1000) / 10}%`

export function breakdown<T extends { status: string }>(leads: T[], keyOf: (lead: T) => string): Breakdown[] {
  const rows = new Map<string, Breakdown>()
  for (const lead of leads) {
    const name = keyOf(lead)
    const row = rows.get(name) ?? { name, leads: 0, closed: 0 }
    row.leads += 1
    if (isClosed(lead)) row.closed += 1
    rows.set(name, row)
  }
  return [...rows.values()].sort((a, b) => b.leads - a.leads || a.name.localeCompare(b.name))
}

export const bestConversion = (rows: Breakdown[]) =>
  rows.filter((row) => row.closed > 0).sort((a, b) => conversion(b) - conversion(a) || b.leads - a.leads)[0] ?? null

export function amountClosed(leads: Scored[], personId: string): number {
  return leads.reduce((sum, lead) => {
    if (!isClosed(lead) || !lead.assignees.some((person) => person.id === personId)) return sum
    return sum + (Number(lead.amount) || 0) / lead.assignees.length
  }, 0)
}

export const inPeriod = (day: string, period: Period) =>
  period.range ? day >= period.range.from && day <= period.range.to : !period.month || day.startsWith(period.month)

const addDays = (key: string, days: number) =>
  new Date(Date.parse(`${key}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)

export function chartDays(period: Period, today: string, max = 62): string[] {
  const month = period.month || today.slice(0, 7)
  const from = period.range?.from ?? `${month}-01`
  const to = period.range?.to ?? addDays(`${addDays(`${month}-28`, 4).slice(0, 7)}-01`, -1)
  const days: string[] = []
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day)
  return days.slice(-max)
}
