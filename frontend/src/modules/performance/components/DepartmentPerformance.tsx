import { ChevronDown, Users } from 'lucide-react'
import { useState } from 'react'

import type { PerformanceSummary, WireDepartment } from '@modules/performance/api/performanceTypes'
import { normalizeDepartment } from '@modules/performance/domain/departments'
import { gradeColor } from '@modules/performance/domain/grading'
import { cn } from '@shared/lib/cn'
import { formatPercent, pluralize } from '@shared/lib/format'
import { Progress } from '@shared/ui/Progress'

function worked(departments: string[]): string[] {
  return departments.length ? departments : [normalizeDepartment(null)]
}

export function DepartmentPerformance({
  departments,
  team
}: {
  departments: WireDepartment[]
  team: PerformanceSummary[]
}) {
  const [openName, setOpenName] = useState<string | null>(null)

  const scored = departments.filter((department) => department.score !== null)

  if (scored.length === 0) {
    return <p className="flex flex-1 items-center justify-center py-8 text-center text-sm text-slate-400">No scored people this period.</p>
  }

  return (
    <ul className="space-y-3">
      {scored.map((department) => {
        const isOpen = openName === department.name
        const color = gradeColor(department.grade)
        const members = team.filter(
          (person) => worked(person.departments).includes(department.name) && person.score !== null
        )

        return (
          <li key={department.name} className="rounded-2xl border border-slate-200">
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpenName(isOpen ? null : department.name)}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-left transition-colors hover:bg-slate-50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Users className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm font-semibold text-ink">{department.name}</span>
                  <span
                    className="shrink-0 text-sm font-bold tabular-nums"
                    style={{ color }}
                  >
                    {formatPercent(department.score ?? 0)}
                  </span>
                </span>
                <Progress
                  value={department.score ?? 0}
                  color={color}
                  heightClassName="h-1.5"
                  trackClassName="bg-slate-100"
                  className="mt-2"
                />
                <span className="mt-1.5 block text-xs text-slate-500">
                  {pluralize(department.headcount, 'employee')}
                </span>
              </span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 shrink-0 text-slate-400 transition-transform',
                  isOpen && 'rotate-180'
                )}
              />
            </button>

            {isOpen && (
              <div className="border-t border-slate-100">
                <div className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-2 text-2xs font-semibold uppercase tracking-wide text-slate-400">
                  <span>Employee</span>
                  <span>Performance</span>
                </div>
                <ul className="divide-y divide-slate-100">
                  {[...members]
                    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
                    .map((person) => (
                      <li
                        key={person.userId}
                        className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                      >
                        <span className="min-w-0 truncate text-slate-700">{person.userName}</span>
                        <span
                          className="shrink-0 font-bold tabular-nums"
                          style={{ color: gradeColor(person.grade) }}
                        >
                          {formatPercent(person.score ?? 0)}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
