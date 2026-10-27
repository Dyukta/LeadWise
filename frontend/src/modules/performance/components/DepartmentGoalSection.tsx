import { Zap } from 'lucide-react'

import type { DepartmentTarget } from '@modules/performance/api/performanceTypes'
import { DepartmentTargetCard } from '@modules/performance/components/DepartmentTargetCard'

function gridCols(count: number): string {
  const capped = Math.min(count, 5)
  if (capped <= 1) return 'grid-cols-1'
  if (capped === 2) return 'grid-cols-1 sm:grid-cols-2'
  if (capped === 3) return 'grid-cols-1 sm:grid-cols-3'
  if (capped === 4) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
  return 'grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
}

export function DepartmentGoalSection({
  department,
  targets
}: {
  department: string
  targets: DepartmentTarget[]
}) {
  if (targets.length === 0) return null

  return (
    <section>
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-200 bg-brand-50">
          <Zap className="h-5 w-5 text-brand-600" />
        </div>
        <h2 className="text-lg font-bold text-ink">{department} Department</h2>
      </div>
      <div className={`grid gap-4 sm:gap-5 ${gridCols(targets.length)}`}>
        {targets.map((kpi) => (
          <DepartmentTargetCard key={kpi.label} kpi={kpi} />
        ))}
      </div>
    </section>
  )
}
