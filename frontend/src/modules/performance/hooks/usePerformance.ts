import { useQueries, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { fetchPerformance, fetchPerformanceMonths } from '@modules/performance/api/performanceApi'
import type { PerformanceSummary, Period } from '@modules/performance/api/performanceTypes'
import { samePerson } from '@modules/performance/domain/people'
import { useSession } from '@platform/auth/hooks/useSession'
import { currentPeriod } from '@shared/lib/date'
import { queryKeys } from '@shared/lib/queryKeys'

const DAY = 24 * 60 * 60 * 1000

type DateRange = { from: string; to: string }

const monthQuery = (period: Period, enabled = true, range: DateRange | null = null) => {
  const closed = (range ? range.to.slice(0, 7) : period) < currentPeriod()

  return {
    queryKey: range
      ? queryKeys.performance.range(range.from, range.to)
      : queryKeys.performance.month(period),
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      fetchPerformance(range ? range.from.slice(0, 7) : period, signal, range),
    enabled,
    staleTime: closed ? 5 * 60_000 : 5_000,
    gcTime: closed ? DAY : undefined,
    refetchInterval: closed ? (false as const) : 5 * 60_000
  }
}

export function usePerformanceMonths() {
  return useQuery({
    queryKey: queryKeys.performance.months(),
    queryFn: ({ signal }) => fetchPerformanceMonths(signal),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000
  })
}

export function useTeamPerformance(period: Period, enabled = true, range: DateRange | null = null) {
  return useQuery(monthQuery(period, enabled, range))
}

export function useTeamPerformanceMonths(months: Period[], enabled = true) {
  return useQueries({ queries: months.map((period) => monthQuery(period, enabled)) })
}

type Me = { userId: string; fullName: string } | null

function mine(team: PerformanceSummary[] | undefined, me: Me) {
  if (!team || !me) return null
  return (
    team.find((person) => person.userId === me.userId) ??
    team.find((person) => samePerson(person.userName, me.fullName)) ??
    null
  )
}

function useMe(): Me {
  const { session } = useSession()
  const userId = session?.userId
  const fullName = session?.fullName ?? ''
  return useMemo(() => (userId ? { userId, fullName } : null), [userId, fullName])
}

export function useMyPerformance(period: Period) {
  const me = useMe()
  const team = useTeamPerformance(period)
  const employees = team.data?.employees

  const summary = useMemo(() => mine(employees, me), [employees, me])

  return { ...team, me: summary, team: employees ?? [] }
}

export function useMyPerformanceMonths(months: Period[]) {
  const me = useMe()
  const results = useTeamPerformanceMonths(months)

  return useMemo(
    () => results.map((result) => ({ ...result, me: mine(result.data?.employees, me) })),
    [results, me]
  )
}
