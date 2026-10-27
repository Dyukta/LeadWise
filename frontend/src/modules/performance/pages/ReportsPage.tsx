import { ClipboardList, Flag, Loader2, Send, Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { CatalogueKpi, AttendanceStatus, GoalFiling } from '@modules/performance/api/performanceTypes'
import { useLogGoal, useProjectGoals } from '@modules/performance/hooks/useProjectGoals'
import { useKpiCatalogue, useSubmitReport } from '@modules/performance/hooks/useReport'
import { useSession } from '@platform/auth/hooks/useSession'
import { cn } from '@shared/lib/cn'
import { daysUntil, formatDate, todayKey } from '@shared/lib/date'
import { pluralize } from '@shared/lib/format'
import { Button } from '@shared/ui/Button'
import { Card } from '@shared/ui/Card'
import { DatePicker } from '@shared/ui/DatePicker'
import { EmptyState } from '@shared/ui/EmptyState'
import { Loading } from '@shared/ui/Loading'
import { Select } from '@shared/ui/Select'

const attendanceOptions = [
  { value: 'present', label: 'Present' },
  { value: 'half-day', label: 'Half day' },
  { value: 'absent', label: 'Absent' },
  { value: 'weekly-off', label: 'Weekly off' }
]

export function ReportsPage() {
  const { session } = useSession()
  const submit = useSubmitReport()
  const logGoal = useLogGoal()
  const { projects, goals } = useProjectGoals()

  const [date, setDate] = useState(() => todayKey())
  const [attendance, setAttendance] = useState<AttendanceStatus>('present')
  const [picked, setPicked] = useState<string[]>([])
  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [goalAmounts, setGoalAmounts] = useState<Record<string, string>>({})

  const clearForm = () => {
    setDate(todayKey())
    setAttendance('present')
    setPicked([])
    setAmounts({})
    setGoalAmounts({})
  }

  const catalogue = useKpiCatalogue(date.slice(0, 7))
  const kpis = useMemo(() => catalogue.data ?? [], [catalogue.data])

  const departments = useMemo(() => {
    const seen: string[] = []
    for (const kpi of kpis) if (!seen.includes(kpi.department)) seen.push(kpi.department)

    return seen.sort((a, b) => a.localeCompare(b))
  }, [kpis])

  const visible = kpis.filter((kpi) => picked.includes(kpi.department))

  const keyOf = (kpi: CatalogueKpi) => `${kpi.department}|${kpi.label}`

  const toggleDepartment = (name: string) => {
    setPicked((current) =>
      current.includes(name) ? current.filter((entry) => entry !== name) : [...current, name]
    )
  }

  const filled = visible
    .filter((kpi) => (amounts[keyOf(kpi)] ?? '').trim() !== '')
    .map((kpi) => ({
      department: kpi.department,
      task: kpi.label,
      achieved: Number(amounts[keyOf(kpi)])
    }))

  const deduped = [
    ...new Map(
      filled.map((entry) => [`${entry.department.toLowerCase()}|${entry.task.toLowerCase()}`, entry])
    ).values()
  ]

  const openGoals = useMemo(
    () => goals.filter((goal) => Boolean(goal.from) && Boolean(goal.to) &&
      date >= goal.from && date <= goal.to),
    [goals, date]
  )

  const justClosed = useMemo(
    () =>
      goals.filter((goal) => {
        if (!goal.to || (date >= goal.from && date <= goal.to)) return false
        const since = -daysUntil(goal.to)
        return since > 0 && since <= 7
      }),
    [goals, date]
  )
  const projectName = (projectId: string) =>
    projects.find((project) => project.id === projectId)?.name ?? ''

  const goalLines = openGoals
    .filter((goal) => (goalAmounts[goal.id] ?? '').trim() !== '')
    .map((goal) => ({ goalId: goal.id, achieved: Number(goalAmounts[goal.id]) }))

  const dayOnly = attendance === 'absent' || attendance === 'weekly-off'

  const blocked = dayOnly
    ? null
    : catalogue.isError
      ? ((catalogue.error as Error).message ?? 'The KPI list could not be loaded.')
      : picked.length === 0 && goalLines.length === 0
        ? 'Pick a department to see its KPIs, or fill in a project goal.'
        : deduped.length === 0 && goalLines.length === 0
          ? 'Enter a number against at least one KPI or project goal.'
          : null

  const busy = submit.isPending || logGoal.isPending

  const send = async () => {
    if (blocked || busy) return
    logGoal.reset()
    try {
      await submit.mutateAsync({ date, attendance, entries: dayOnly ? [] : deduped })
      for (const line of dayOnly ? [] : goalLines) {
        await logGoal.mutateAsync({ date, ...line })
        setGoalAmounts((current) => ({ ...current, [line.goalId]: '' }))
      }
      clearForm()
    } catch {
      return
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">Daily report</h1>
      </header>
      <Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DatePicker label="Date" value={date} onChange={setDate} max={todayKey()} />
          <Select
            label="Attendance"
            value={attendance}
            options={attendanceOptions}
            onChange={(value) => setAttendance(value as AttendanceStatus)}
          />
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-700">Filed as</span>
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {session?.fullName || session?.email}
            </p>
          </div>
        </div>
      </Card>
      {dayOnly ? (
        <Card>
          <p className="text-sm text-slate-600">
            {attendance === 'absent' ? 'Absent' : 'Weekly off'}: only your attendance is saved for
            this day. There&apos;s no work or goal progress to report.
          </p>
        </Card>
      ) : (
        <Card>
          <div className="flex flex-col gap-3">
            <div>
              <h2 className="text-sm font-semibold text-ink">Departments</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Pick every team you worked for today. You can file against more than one.
              </p>
            </div>

            {catalogue.isPending ? (
              <Loading className="py-6" />
            ) : (
              <div className="flex flex-wrap gap-2">
                {departments.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleDepartment(name)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                      picked.includes(name)
                        ? 'border-brand-600 bg-brand-600 text-white'
                        : 'border-slate-300 text-slate-700 hover:border-brand-300 hover:bg-brand-50'
                    )}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {!dayOnly && (visible.length > 0 || openGoals.length > 0) && (
        <Card>
          <div className="space-y-5">
            {picked.map((department) => {
              const group = kpis.filter((kpi) => kpi.department === department)
              if (group.length === 0) return null

              return (
                <section key={department} className="space-y-3">
                  <h3 className="text-sm font-semibold text-ink">{department}</h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {group.map((kpi) => (
                      <KpiField
                        key={keyOf(kpi)}
                        kpi={kpi}
                        value={amounts[keyOf(kpi)] ?? ''}
                        disabled={submit.isPending}
                        onChange={(next) =>
                          setAmounts((current) => ({ ...current, [keyOf(kpi)]: next }))
                        }
                      />
                    ))}
                  </div>
                </section>
              )
            })}

            {openGoals.length > 0 && (
              <section className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-ink">Project goals</h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Your share of a goal counts towards your performance for the day, the
                    same as a department KPI.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {openGoals.map((goal) => (
                    <GoalField
                      key={goal.id}
                      name={goal.name}
                      project={projectName(goal.projectId)}
                      target={goal.target}
                      achieved={goal.achieved}
                      reward={goal.reward}
                      from={goal.from}
                      to={goal.to}
                      filings={goal.filings}
                      meId={session?.userId ?? ''}
                      value={goalAmounts[goal.id] ?? ''}
                      disabled={busy}
                      onChange={(next) =>
                        setGoalAmounts((current) => ({ ...current, [goal.id]: next }))
                      }
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        </Card>
      )}

      {justClosed.length > 0 && (
        <Card>
          <div className="space-y-3">
            {justClosed.map((goal) => (
              <GoalResult
                key={goal.id}
                name={goal.name}
                project={projectName(goal.projectId)}
                target={goal.target}
                achieved={goal.achieved}
                reward={goal.reward}
                filings={goal.filings}
              />
            ))}
          </div>
        </Card>
      )}

      {!catalogue.isPending && catalogue.isError && (
        <EmptyState
          icon={ClipboardList}
          title="The KPI list could not be read"
          description={(catalogue.error as Error).message}
        />
      )}

      {!catalogue.isPending && !catalogue.isError && kpis.length === 0 && (
        <EmptyState
          icon={ClipboardList}
          title="No KPIs yet"
          description="The owner sets these on the KPIs & departments page."
        />
      )}

      <div className="flex flex-wrap items-center justify-end gap-3">
        {blocked && <p className="text-sm text-slate-500">{blocked}</p>}
        {(submit.error ?? logGoal.error) && (
          <p role="alert" className="text-sm text-red-600">
            {((submit.error ?? logGoal.error) as Error).message}
          </p>
        )}

        <Button onClick={send} disabled={Boolean(blocked) || busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {busy ? 'Filing…' : 'Submit report'}
        </Button>
      </div>
    </div>
  )
}

function countdown(to: string): string {
  const left = daysUntil(to)
  if (left < 0) return 'Closed'
  if (left === 0) return 'Last day'
  return `${pluralize(left, 'day')} left`
}

function Leaderboard({ filings, meId }: { filings: GoalFiling[]; meId: string }) {
  if (filings.length === 0) return null

  return (
    <div className="flex flex-col gap-1 border-t border-brand-200/70 pt-2">
      {filings.map((filing, index) => {
        const mine = filing.userId === meId
        return (
          <div
            key={filing.userId || filing.name}
            className={cn(
              'flex items-center gap-2 rounded-lg px-1.5 py-0.5 text-xs',
              mine && 'bg-brand-100/80'
            )}
          >
            <span className={cn('w-4 tabular-nums', mine ? 'text-brand-700' : 'text-slate-400')}>
              {index + 1}
            </span>
            <span className={cn('flex-1 truncate', mine ? 'font-semibold text-brand-900' : 'text-ink')}>
              {mine ? 'You' : filing.name}
            </span>
            <span className={cn('tabular-nums', mine ? 'font-semibold text-brand-700' : 'text-slate-500')}>
              {filing.achieved}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function GoalResult({
  name,
  project,
  target,
  achieved,
  reward,
  filings
}: {
  name: string
  project: string
  target: number
  achieved: number
  reward: string
  filings: GoalFiling[]
}) {
  const hit = achieved >= target
  const tone = hit
    ? 'border-emerald-300 bg-emerald-50'
    : 'border-amber-300 bg-amber-50'

  return (
    <div className={cn('rounded-xl border p-3', tone)}>
      <div className="flex items-center gap-2">
        {hit ? (
          <Trophy className="h-4 w-4 shrink-0 text-emerald-700" />
        ) : (
          <Flag className="h-4 w-4 shrink-0 text-amber-700" />
        )}
        <span className={cn('text-sm font-semibold', hit ? 'text-emerald-900' : 'text-amber-900')}>
          {hit ? 'Target reached' : 'Goal closed'}
        </span>
        <span className="ml-auto text-2xs font-semibold uppercase tracking-wide text-slate-500">
          {project}
        </span>
      </div>
      <p className={cn('mt-1 text-xs', hit ? 'text-emerald-800' : 'text-amber-800')}>
        {name} finished at {achieved} of {target}
        {hit && reward ? ` · ${reward}` : ''}
      </p>
      {filings.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {filings.map((filing) => (
            <span
              key={filing.userId || filing.name}
              className="rounded-full bg-white px-2 py-0.5 text-2xs font-semibold text-slate-600"
            >
              {filing.name} {filing.achieved}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function GoalField({
  name,
  project,
  target,
  achieved,
  reward,
  from,
  to,
  filings,
  meId,
  value,
  disabled,
  onChange
}: {
  name: string
  project: string
  target: number
  achieved: number
  reward: string
  from: string
  to: string
  filings: GoalFiling[]
  meId: string
  value: string
  disabled: boolean
  onChange: (value: string) => void
}) {
  const hit = achieved >= target
  const toGo = Math.max(target - achieved, 0)
  const lastDay = daysUntil(to) === 0
  const pct = Math.min(Math.round((achieved / Math.max(target, 1)) * 100), 100)

  return (
    <label className="flex flex-col gap-2 rounded-xl border border-brand-200 bg-brand-50/50 p-3">
      <div className="flex items-start justify-between gap-2">
        <span className="text-2xs font-semibold uppercase tracking-wide text-brand-700">
          {project}
        </span>
        {reward && (
          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-2xs font-semibold text-amber-800">
            {reward}
          </span>
        )}
      </div>

      <div>
        <span className="block text-sm font-semibold text-ink">{name}</span>
        <span className="block text-xs text-slate-500">
          {formatDate(from)} to {formatDate(to)}, ends 11:59 pm
        </span>
      </div>

      <div className="relative h-2.5 overflow-hidden rounded-full bg-brand-100">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-700',
            hit ? 'bg-emerald-500' : 'bg-brand-500'
          )}
          style={{ width: `${pct}%` }}
        />
        {[25, 50, 75].map((tick) => (
          <span
            key={tick}
            aria-hidden
            className="absolute top-0 h-full w-0.5 bg-white/80"
            style={{ left: `${tick}%` }}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 text-xs">
        <span className={cn('font-semibold', hit ? 'text-emerald-700' : 'text-ink')}>
          {hit ? `Target reached · ${achieved} of ${target}` : `${achieved} of ${target}`}
        </span>
        <span
          className={cn(
            lastDay && !hit
              ? 'rounded-full bg-rose-100 px-2 py-0.5 font-semibold text-rose-700'
              : 'text-slate-500'
          )}
        >
          {hit
            ? countdown(to)
            : toGo === 1
              ? `One more closes it · ${countdown(to)}`
              : `${toGo} to go · ${countdown(to)}`}
        </span>
      </div>

      <Leaderboard filings={filings} meId={meId} />

      <input
        inputMode="numeric"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, ''))}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 disabled:opacity-50"
        placeholder="Add today's count"
      />
    </label>
  )
}

function KpiField({
  kpi,
  value,
  disabled,
  onChange
}: {
  kpi: CatalogueKpi
  value: string
  disabled: boolean
  onChange: (value: string) => void
}) {
  return (
    <label className="flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <span className="text-sm font-semibold text-ink">{kpi.label}</span>
      <span className="text-xs text-slate-500">Target {kpi.target} this month</span>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value.replace(/\D/g, ''))}
          className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-100"
        />
      </div>
    </label>
  )
}
