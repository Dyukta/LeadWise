import { Users } from 'lucide-react'

import type { PerformanceSummary } from '@modules/performance/api/performanceTypes'
import { ChartCard } from '@modules/performance/components/ChartCard'
import { HorizontalBars, type BarRow } from '@modules/performance/components/HorizontalBars'
import { gradeColor } from '@modules/performance/domain/grading'
import { EmptyState } from '@shared/ui/EmptyState'

export function PeerPerformanceChart({ team }: { team: PerformanceSummary[] }) {
  const data: BarRow[] = team
    .filter((person) => person.score !== null)
    .map((person) => ({
      name: person.shortName,
      value: person.score ?? 0,
      color: gradeColor(person.grade)
    }))

  const axisMax = Math.max(
    100,
    Math.ceil(Math.max(0, ...data.map((point) => point.value)) / 25) * 25
  )
  const ticks = Array.from({ length: axisMax / 25 + 1 }, (_, index) => index * 25)

  return (
    <ChartCard title="Peer Performance" icon={Users} heightClassName="">
      {data.length === 0 ? (
        <EmptyState icon={Users} title="No peers to compare" />
      ) : (
        <HorizontalBars
          rows={data}
          axisMax={axisMax}
          ticks={ticks}
          format={(value) => `${value.toFixed(1)}%`}
        />
      )}
    </ChartCard>
  )
}
