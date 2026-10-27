import { AlertCircle } from 'lucide-react'

import type { Kpi } from '@modules/performance/api/performanceTypes'
import { TargetRow } from '@modules/performance/components/TargetRow'
import { EmptyState } from '@shared/ui/EmptyState'

export function KpiProgressList({ kpis, name }: { kpis: Kpi[]; name: string }) {
  if (kpis.length === 0) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="No Target Records Yet"
        description={`${name} has not logged any work items for this period.`}
      />
    )
  }

  return (
    <div className="scrollbar-thin space-y-3 sm:max-h-[28rem] sm:overflow-y-auto sm:pr-2">
      {kpis.map((kpi, index) => (
        <TargetRow key={kpi.id} index={index + 1} kpi={kpi} />
      ))}
    </div>
  )
}
