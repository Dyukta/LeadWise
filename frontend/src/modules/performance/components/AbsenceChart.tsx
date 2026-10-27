import { AlertCircle } from 'lucide-react'

import type { PerformanceSummary } from '@modules/performance/api/performanceTypes'
import { ChartCard } from '@modules/performance/components/ChartCard'
import { HorizontalBars, type BarRow } from '@modules/performance/components/HorizontalBars'
import { EmptyState } from '@shared/ui/EmptyState'

export function AbsenceChart({ team }: { team: PerformanceSummary[] }) {
  const data: BarRow[] = team
    .filter((person) => person.score !== null)
    .map((person) => ({
      name: person.shortName,
      value: person.attendance?.absences ?? 0,
      color: 'var(--color-red-500)'
    }))
    .sort((a, b) => b.value - a.value)

  const axisMax = Math.max(1, ...data.map((row) => row.value))
  const step = Math.max(1, Math.ceil(axisMax / 4))
  const ticks: number[] = []
  for (let value = 0; value <= axisMax; value += step) ticks.push(value)

  return (
    <ChartCard title="Absence Tracking" icon={AlertCircle} iconClassName="text-red-500" heightClassName="">
      {data.length === 0 ? (
        <EmptyState icon={AlertCircle} title="No attendance data" />
      ) : (
        <HorizontalBars
          rows={data}
          axisMax={axisMax}
          ticks={ticks}
          format={(value) => String(value)}
        />
      )}
    </ChartCard>
  )
}
