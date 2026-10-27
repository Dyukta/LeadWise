import type { DepartmentTarget } from '@modules/performance/api/performanceTypes'
import { pacingColor, pacingLabel } from '@modules/performance/domain/kpis'
import { formatPercent } from '@shared/lib/format'
import { Card } from '@shared/ui/Card'
import { Progress } from '@shared/ui/Progress'

export function DepartmentTargetCard({ kpi }: { kpi: DepartmentTarget }) {
  const color = pacingColor(kpi.pacing)

  return (
    <Card
      padding="none"
      className="border border-blue-200 bg-blue-50 p-4"
    >
      <p className="truncate text-2xs font-semibold uppercase tracking-wide text-blue-900">
        {kpi.label}
      </p>
      <p className="mt-1.5 text-2xl font-bold leading-none tabular-nums text-ink sm:text-3xl">
        {kpi.achieved}
        {kpi.target > 0 && <span className="text-sm font-bold text-slate-500">/{kpi.target}</span>}
      </p>
      <Progress
        value={kpi.pct ?? 0}
        color={color}
        heightClassName="h-1.5"
        trackClassName="border border-blue-300 bg-white"
        className="mt-3"
      />
      <div className="mt-3 grid grid-cols-2 items-end gap-2">
        <div className="min-w-0">
          <p className="text-2xs font-semibold uppercase tracking-wide text-blue-800">
            Remaining
          </p>
          <p className="text-sm font-bold tabular-nums text-blue-900">{kpi.remaining}</p>
        </div>
        <div className="min-w-0 text-right">
          <p className="text-2xs font-semibold uppercase tracking-wide" style={{ color }}>
            {pacingLabel(kpi.pacing)}
          </p>
          <p className="text-sm font-bold tabular-nums" style={{ color }}>
            {kpi.pct === null ? 'N/A' : formatPercent(kpi.pct)}
          </p>
        </div>
      </div>
    </Card>
  )
}
