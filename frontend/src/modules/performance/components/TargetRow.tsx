import type { Kpi } from '@modules/performance/api/performanceTypes'
import { pacingColor } from '@modules/performance/domain/kpis'
import { formatDate } from '@shared/lib/date'
import { formatPercent } from '@shared/lib/format'
import { Progress } from '@shared/ui/Progress'

export function TargetRow({ index, kpi }: { index: number; kpi: Kpi }) {
  const color = pacingColor(kpi.pacing)
  const isGoal = kpi.source === 'goal'

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6 sm:py-5">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white sm:h-10 sm:w-10 sm:text-base">
          {index}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="truncate text-sm font-semibold text-ink sm:text-base">
                  {kpi.label}
                </p>
                {isGoal && (
                  <span className="shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide text-brand-700">
                    Project goal
                  </span>
                )}
                {isGoal && kpi.reward && (
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-2xs font-semibold text-amber-800">
                    {kpi.reward}
                  </span>
                )}
              </div>
              <p className="truncate text-sm font-medium text-slate-600">
                {kpi.department}
                {isGoal && kpi.from && kpi.to && (
                  <span className="text-slate-400">
                    {' '}
                    · {formatDate(kpi.from)} to {formatDate(kpi.to)}
                  </span>
                )}
                {kpi.share > 0 && kpi.contributors > 1 && (
                  <span className="text-slate-400">
                    {' '}
                    · {kpi.target} shared by {kpi.contributors}
                  </span>
                )}
              </p>
            </div>
            <p className="shrink-0 text-base font-bold tabular-nums text-brand-600 sm:text-xl">
              {kpi.achieved}
              {kpi.share > 0 && <span className="text-slate-400">/{kpi.share}</span>}
            </p>
          </div>
          <Progress
            value={kpi.pct ?? 0}
            color={color}
            heightClassName="h-2"
            trackClassName="bg-slate-100"
            className="mt-2"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="min-w-0 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Remaining{' '}
              <span className="font-bold tabular-nums text-ink">{kpi.remaining}</span>
            </p>
            <p className="min-w-0 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
              Avg Performance{' '}
              <span className="font-bold tabular-nums" style={{ color }}>
                {kpi.pct === null ? 'N/A' : formatPercent(kpi.pct)}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
