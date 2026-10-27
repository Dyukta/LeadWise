import { Award, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'

import { cn } from '@shared/lib/cn'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}

export function TopPerformerCard({
  name,
  department,
  score,
  grade,
  teamAverage,
  runnerUp
}: {
  name: string
  department: string | null
  score: number
  grade: string
  teamAverage: number
  runnerUp: { name: string; score: number } | null
}) {
  const lead = Math.round(score - teamAverage)

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <Trophy
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 text-slate-100 sm:h-40 sm:w-40"
      />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <p className="text-2xs font-semibold uppercase tracking-wide text-slate-400">
            Top performer
          </p>
          <Link
            to="/performance/team"
            className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100"
          >
            Team
          </Link>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
            {initials(name)}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-xl font-bold leading-tight text-ink sm:text-2xl">{name}</h3>
            <p className="truncate text-sm text-slate-500">{department ?? 'No department'}</p>
          </div>
        </div>
        <div className="mt-5 flex items-end gap-3">
          <span className="text-5xl font-bold leading-none tabular-nums text-ink">{Math.round(score)}</span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-sm font-semibold text-brand-700">
            <Award className="h-4 w-4" />
            Grade {grade}
          </span>
          {lead > 0 && (
            <span className="ml-auto text-xs font-semibold text-emerald-700">
              +{lead} vs team avg
            </span>
          )}
        </div>
        <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-brand-500 transition-[width] duration-700"
            style={{ width: `${Math.min(Math.max(score, 0), 100)}%` }}
          />
          <span
            aria-hidden
            className="absolute top-0 h-full w-0.5 bg-slate-400"
            style={{ left: `${Math.min(Math.max(teamAverage, 0), 100)}%` }}
          />
        </div>
        <div
          className={cn(
            'mt-2 flex items-baseline justify-between text-2xs font-semibold uppercase tracking-wide text-slate-400',
            !runnerUp && 'mb-1'
          )}
        >
          <span>Team average {Math.round(teamAverage)}</span>
          {runnerUp && (
            <span className="truncate">
              Next · {runnerUp.name} {Math.round(runnerUp.score)}
            </span>
          )}
        </div>
      </div>
    </section>
  )
}
