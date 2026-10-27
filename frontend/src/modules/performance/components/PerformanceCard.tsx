import { Award, User, type LucideIcon } from 'lucide-react'

import { gradeLabel, type GradeLetter } from '@modules/performance/domain/grading'
import { formatPercent } from '@shared/lib/format'
import { Card } from '@shared/ui/Card'
import { Progress } from '@shared/ui/Progress'

const GRADE_TONE = {
  A: 'gradeA',
  B: 'gradeB',
  C: 'gradeC'
} as const

export function PerformanceCard({
  name,
  grade,
  performancePct,
  weeklyAvg
}: {
  name: string
  grade: GradeLetter | null
  performancePct: number | null
  weeklyAvg: number | null
}) {
  return (
    <Card
      tone={grade ? GRADE_TONE[grade] : 'brandGlow'}
      hoverLift
      className="flex flex-col"
    >
      <div className="pointer-events-none absolute right-0 top-0 p-4 opacity-20 sm:p-5">
        <User className="h-14 w-14" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col gap-4 sm:gap-5">
        <div className="pr-16">
          <p className="text-2xs font-semibold uppercase tracking-wide text-white/80">
            Performance
          </p>
          <h2 className="mt-1.5 text-2xl font-bold leading-tight sm:text-3xl">{name}</h2>
        </div>

        <div className="my-auto">
          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
            <span className="text-5xl font-bold leading-none tabular-nums sm:text-6xl">
              {performancePct === null ? 'N/A' : formatPercent(performancePct, { withSymbol: false })}
            </span>
            <span className="text-xl font-bold sm:text-2xl">%</span>
            <span className="ml-2 text-3xl font-bold leading-none sm:ml-3 sm:text-4xl">
              {grade ?? 'N/A'}
            </span>
          </div>
          <Progress
            value={performancePct ?? 0}
            color="#ffffff"
            heightClassName="h-2.5"
            trackClassName="bg-white/25"
            className="mt-5"
          />
          <div className="mt-2.5 flex items-center justify-between gap-3 text-2xs font-semibold uppercase tracking-wide text-white/70">
            <span className="truncate">{gradeLabel(grade)}</span>
            <span className="shrink-0">Target: 100%</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Tile label="Weekly Avg" value={weeklyAvg === null ? 'N/A' : formatPercent(weeklyAvg)} />
          <Tile label="Grade" value={grade ?? 'N/A'} icon={Award} />
        </div>
      </div>
    </Card>
  )
}

function Tile({ label, value, icon: Icon }: { label: string; value: string; icon?: LucideIcon }) {
  return (
    <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3.5">
      <p className="text-2xs font-semibold uppercase tracking-wide text-white/60">{label}</p>
      <p className="mt-1 flex items-center gap-2 text-xl font-bold leading-7">
        {Icon && <Icon className="h-5 w-5 shrink-0" />}
        <span className="truncate">{value}</span>
      </p>
    </div>
  )
}
