import { AlertCircle, Calendar, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'

import { AttendanceCard } from '@modules/performance/components/AttendanceCard'
import { KpiProgressList } from '@modules/performance/components/KpiProgressList'
import { PerformanceCard } from '@modules/performance/components/PerformanceCard'
import { PerformanceSkeleton } from '@modules/performance/components/PerformanceSkeleton'
import { PerformanceTrendChart } from '@modules/performance/components/PerformanceTrendChart'
import { buildTrendPoints, monthBounds, monthsBetween } from '@modules/performance/domain/trend'
import { useMyPerformance, useMyPerformanceMonths, usePerformanceMonths } from '@modules/performance/hooks/usePerformance'
import { currentPeriod, periodLabel, periodOptions } from '@shared/lib/date'
import { Card } from '@shared/ui/Card'
import { Dropdown } from '@shared/ui/Dropdown'
import { EmptyState } from '@shared/ui/EmptyState'

export function MyPerformancePage() {
  const [period, setPeriod] = useState(currentPeriod())

  const availableMonths = usePerformanceMonths()
  const performance = useMyPerformance(period)

  const bounds = useMemo(() => monthBounds(period), [period])
  const months = useMemo(() => monthsBetween(bounds.from, bounds.to), [bounds])
  const monthly = useMyPerformanceMonths(months)
  const trendDays = useMemo(
    () =>
      buildTrendPoints(
        new Map(months.map((month, index) => [month, monthly[index]?.me?.dailyRecords ?? []])),
        bounds.from,
        bounds.to
      ),
    [months, monthly, bounds]
  )

  const monthOptions = useMemo(() => periodOptions(availableMonths.data), [availableMonths.data])

  const summary = performance.me

  return (
    <div className="space-y-5 sm:space-y-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">My Performance</h1>
        <Dropdown
          className="w-full sm:w-44"
          icon={Calendar}
          value={period}
          onChange={setPeriod}
          options={monthOptions}
        />
      </header>

      {performance.isPending ? (
        <PerformanceSkeleton />
      ) : performance.isError ? (
        <Card padding="lg">
          <EmptyState
            icon={AlertCircle}
            title="Could not load your performance"
            description={(performance.error as Error).message}
          />
        </Card>
      ) : !summary ? (
        <Card padding="lg">
          <EmptyState
            icon={AlertCircle}
            title="Nothing recorded for you this month"
            description={`You have not filed any reports for ${periodLabel(period)} yet.`}
          />
        </Card>
      ) : (
        <>
          {summary.score !== null ? (
            <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
              <PerformanceCard
                name={summary.userName}
                grade={summary.grade}
                performancePct={summary.score}
                weeklyAvg={summary.weeklyAvg}
              />
              {summary.attendance && <AttendanceCard attendance={summary.attendance} />}
            </div>
          ) : (
            <Card tone="brand" padding="lg">
              <EmptyState
                icon={AlertCircle}
                title="No target records this period"
                description="Nothing has been logged against your KPIs yet."
              />
            </Card>
          )}

          <section>
            <div className="mb-3 flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-brand-600" />
              <p className="text-2xs font-semibold uppercase tracking-wide text-brand-700">
                My Targets
              </p>
            </div>
            <KpiProgressList kpis={summary.kpis} name={summary.userName} />
          </section>
          <PerformanceTrendChart title="My Performance" days={trendDays} />
        </>
      )}
    </div>
  )
}
