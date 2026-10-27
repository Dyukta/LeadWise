import { Gift, Target } from 'lucide-react'

import type { Project, ProjectGoal } from '@modules/leads/domain/projects'
import { cn } from '@shared/lib/cn'
import { daysUntil, formatDate, fromKey, toKey, todayKey } from '@shared/lib/date'
import { pluralize } from '@shared/lib/format'
import { GoalCelebration } from '@shared/ui/Celebration'

const palette = [
  'bg-indigo-600',
  'bg-blue-600',
  'bg-sky-600',
  'bg-teal-600',
  'bg-violet-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-purple-600'
]

function hueFor(id: string): string {
  let sum = 0
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i)
  return palette[sum % palette.length]!
}

const columns: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
}

function celebratingUntil(goal: ProjectGoal): string | null {
  if (goal.pct < 100) return null
  if (!goal.completedOn) return goal.running ? goal.to : null
  const end = fromKey(goal.completedOn)
  if (!end) return null
  end.setDate(end.getDate() + 1)
  return toKey(end)
}

export function ProjectGoalCards({
  goals,
  projects
}: {
  goals: ProjectGoal[]
  projects: Project[]
}) {
  const today = todayKey()
  const celebrating = (goal: ProjectGoal) => {
    const until = celebratingUntil(goal)
    return until !== null && today <= until
  }

  const shown = goals.filter((goal) => goal.running || celebrating(goal))
  if (shown.length === 0) return null

  const nameOf = (projectId: string) =>
    projects.find((project) => project.id === projectId)?.name ?? ''

  return (
    <div className={cn('grid gap-4 sm:gap-5', columns[Math.min(shown.length, 4)])}>
      {shown.map((goal) => {
        const hit = goal.pct >= 100
        const party = celebrating(goal)
        const left = Math.max(daysUntil(goal.to), 0)

        return (
          <section
            key={goal.id}
            className={cn(
              'relative overflow-hidden rounded-2xl p-4 text-white shadow-sm sm:p-5',
              hit ? 'bg-emerald-600' : hueFor(goal.id)
            )}
          >
            <Target
              aria-hidden
              className="pointer-events-none absolute -bottom-8 -right-8 h-32 w-32 text-white/10"
            />
            {party && <GoalCelebration id={goal.id} title={goal.name} />}

            <div className="relative z-10">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 truncate text-2xs font-semibold uppercase tracking-wide text-white/70">
                  {nameOf(goal.projectId)}
                </p>
                {goal.reward && (
                  <span className="flex max-w-[55%] shrink-0 items-center gap-1 rounded-full bg-white px-2 py-0.5 text-2xs font-bold text-slate-900">
                    <Gift className="h-3 w-3 shrink-0 text-amber-600" />
                    <span className="truncate">{goal.reward}</span>
                  </span>
                )}
              </div>
              <h3 className="mt-1 truncate text-lg font-bold leading-tight">{goal.name}</h3>

              <div className="mt-4 flex items-end gap-2">
                <span className="text-4xl font-bold leading-none tabular-nums">
                  {goal.achieved}
                </span>
                <span className="pb-0.5 text-lg font-semibold text-white/70">
                  / {goal.target}
                </span>
                <span className="ml-auto pb-0.5 text-sm font-bold tabular-nums">
                  {goal.pct}%
                </span>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/25">
                <div
                  className="h-full rounded-full bg-white transition-[width] duration-700"
                  style={{ width: `${goal.pct}%` }}
                />
              </div>

              <p className="mt-2.5 text-2xs font-semibold uppercase tracking-wide text-white/70">
                {party && goal.completedOn
                  ? `Completed ${formatDate(goal.completedOn)}`
                  : hit
                    ? 'Target met'
                    : left === 0
                      ? 'Last day'
                      : `${pluralize(left, 'day')} left`}{' '}
                · ends {formatDate(goal.to)}
              </p>
            </div>
          </section>
        )
      })}
    </div>
  )
}
