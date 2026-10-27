const DAY = 86_400_000

export function ageInDays(createdAt: string | null, now: number): number {
  const created = new Date(createdAt ?? '').getTime()
  if (Number.isNaN(created)) return 0
  return Math.max(0, Math.floor((now - created) / DAY))
}
