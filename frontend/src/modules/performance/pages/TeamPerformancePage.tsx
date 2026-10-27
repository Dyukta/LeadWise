import { AlertCircle } from 'lucide-react'
import { useMemo, useState } from 'react'

import { AbsenceChart } from '@modules/performance/components/AbsenceChart'
import { AttendanceCard } from '@modules/performance/components/AttendanceCard'
import { DepartmentGoalSection } from '@modules/performance/components/DepartmentGoalSection'
import { PeerPerformanceChart } from '@modules/performance/components/PeerPerformanceChart'
import { PerformanceCard } from '@modules/performance/components/PerformanceCard'
import { PerformanceFilterBar } from '@modules/performance/components/PerformanceFilterBar'
import { PerformanceSkeleton } from '@modules/performance/components/PerformanceSkeleton'
import { PerformanceTrendChart } from '@modules/performance/components/PerformanceTrendChart'
import { TeamOverviewTable } from '@modules/performance/components/TeamOverviewTable'
import { ALL_DEPARTMENTS, departmentsEqual } from '@modules/performance/domain/departments'
import { filterByDepartment, filterByQuery, resolveFocused, scopeToDepartment, type PerformanceFilters } from '@modules/performance/domain/filters'
import { buildTrendPoints, monthBounds, monthsBetween, type IsoDate } from '@modules/performance/domain/trend'
import { usePerformanceMonths, useTeamPerformance, useTeamPerformanceMonths } from '@modules/performance/hooks/usePerformance'
import { currentPeriod, periodLabel } from '@shared/lib/date'
import { Card } from '@shared/ui/Card'
import { DateRangePicker } from '@shared/ui/DateRangePicker'
import { EmptyState } from '@shared/ui/EmptyState'

export function TeamPerformancePage() {
  const [filters, setFilters] = useState<PerformanceFilters>({
    period: currentPeriod(),
    department: ALL_DEPARTMENTS,
    focusedUserId: null,
    query: ''
  })

  const [range, setRange] = useState<{ from: IsoDate; to: IsoDate } | null>(null)
  const availableMonths = usePerformanceMonths()
  const team = useTeamPerformance(filters.period, true, range)
  const scopeLabel = range ? 'this date range' : periodLabel(filters.period)
  const all = useMemo(() => team.data?.employees ?? [], [team.data])

  const departments = useMemo(() => {
    const every = team.data?.departments ?? []
    return filters.department === ALL_DEPARTMENTS
      ? every
      : every.filter((department) => departmentsEqual(department.name, filters.department))
  }, [team.data, filters.department])

  const baseline = useMemo(
    () =>
      filterByDepartment(all, filters.department).map((person) =>
        scopeToDepartment(person, filters.department)
      ),
    [all, filters.department]
  )
  const listed = useMemo(() => filterByQuery(baseline, filters.query), [baseline, filters.query])
  const focused = useMemo(
    () => resolveFocused(listed, filters.focusedUserId),
    [listed, filters.focusedUserId]
  )

  const bounds = useMemo(
    () => range ?? monthBounds(filters.period),
    [range, filters.period]
  )
  const months = useMemo(() => monthsBetween(bounds.from, bounds.to), [bounds])
  const monthly = useTeamPerformanceMonths(months)

  const focusedId = focused?.userId
  const trendDays = useMemo(
    () =>
      buildTrendPoints(
        new Map(
          months.map((month, index) => [
            month,
            monthly[index]?.data?.employees.find((person) => person.userId === focusedId)
              ?.dailyRecords ?? []
          ])
        ),
        bounds.from,
        bounds.to
      ),
    [months, monthly, focusedId, bounds]
  )

  return (
    <div className="space-y-5 sm:space-y-8">
      <PerformanceFilterBar
        filters={filters}
        onChange={(next) => {
          if (next.period !== filters.period) setRange(null)
          setFilters(next)
        }}
        team={all}
        months={availableMonths.data ?? []}
        focusedName={focused?.userName ?? null}
        extra={
          <DateRangePicker
            className="w-full sm:w-44"
            value={range}
            onChange={setRange}
            onClear={() => setRange(null)}
          />
        }
      />

      {team.isPending ? (
        <PerformanceSkeleton full />
      ) : team.isError ? (
        <Card padding="lg">
          <EmptyState
            icon={AlertCircle}
            title="Could not load team performance"
            description={(team.error as Error).message}
          />
        </Card>
      ) : !focused ? (
        <Card padding="lg">
          <EmptyState
            icon={AlertCircle}
            title="No employees match this filter"
            description={`Nothing recorded for ${scopeLabel}.`}
          />
        </Card>
      ) : (
        <>
          {focused.score !== null ? (
            <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
              <PerformanceCard
                name={focused.userName}
                grade={focused.grade}
                performancePct={focused.score}
                weeklyAvg={focused.weeklyAvg}
              />
              {focused.attendance && <AttendanceCard attendance={focused.attendance} />}
            </div>
          ) : (
            <Card tone="brand" padding="lg">
              <EmptyState
                icon={AlertCircle}
                title="No target records this period"
                description={`${focused.userName} has not logged any work items for ${scopeLabel}.`}
              />
            </Card>
          )}

          {departments.map((department) => (
            <DepartmentGoalSection
              key={department.name}
              department={department.name}
              targets={department.kpis}
            />
          ))}
          <PerformanceTrendChart title="Team Performance" days={trendDays} />
          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
            <PeerPerformanceChart team={baseline} />
            <AbsenceChart team={baseline} />
          </div>
          <TeamOverviewTable team={listed} />
        </>
      )}
    </div>
  )
}
