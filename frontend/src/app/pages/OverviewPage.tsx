import { ArrowRight, Building2, Calendar, CalendarClock, CheckCircle2, UserPlus, Users, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { LeadHandlerCard } from '@app/components/LeadHandlerCard'
import { TeamScoreTrend } from '@app/components/OverviewCharts'
import { ProjectGoalCards } from '@app/components/ProjectGoalCards'
import { ProjectRosterCard } from '@app/components/ProjectRosterCard'
import { TopPerformerCard } from '@app/components/TopPerformerCard'
import type { Lead } from '@modules/leads/api/leadTypes'
import { ageInDays } from '@modules/leads/domain/ageing'
import { sortByTiming } from '@modules/leads/domain/followUp'
import { sameProject } from '@modules/leads/domain/projects'
import { statusLabel } from '@modules/leads/domain/statuses'
import { leadsPerAssignee } from '@modules/leads/domain/workload'
import { useLeads } from '@modules/leads/hooks/useLeads'
import { useProjects } from '@modules/leads/hooks/useProjects'
import type { PerformanceSummary } from '@modules/performance/api/performanceTypes'
import { DepartmentPerformance } from '@modules/performance/components/DepartmentPerformance'
import { monthsBetween, type IsoDate } from '@modules/performance/domain/trend'
import { usePerformanceMonths, useTeamPerformance, useTeamPerformanceMonths } from '@modules/performance/hooks/usePerformance'
import { isOwner } from '@platform/auth/domain/session'
import { useSession } from '@platform/auth/hooks/useSession'
import { cn } from '@shared/lib/cn'
import { MONTH_NAMES, currentPeriod, daysUntil, formatDate, lastPeriods, parsePeriod, periodOptions } from '@shared/lib/date'
import { pluralize } from '@shared/lib/format'
import { Badge } from '@shared/ui/Badge'
import { DateRangePicker } from '@shared/ui/DateRangePicker'
import { Dropdown } from '@shared/ui/Dropdown'
import { Skeleton } from '@shared/ui/Skeleton'
import { StatTile } from '@shared/ui/StatTile'

function daysWaiting(lead: Lead): number {
  return ageInDays(lead.createdAt, Date.now())
}

function urgency(days: number): { row: string; text: string; label: string } {
  if (days > 7) {
    return {
      row: 'bg-red-50 [&>td:first-child]:border-l-red-500',
      text: 'text-red-700',
      label: 'text-red-700'
    }
  }
  if (days > 2) {
    return {
      row: 'bg-red-50/40 [&>td:first-child]:border-l-red-200',
      text: 'text-slate-700',
      label: 'text-red-600'
    }
  }
  return {
    row: '[&>td:first-child]:border-l-transparent',
    text: 'text-slate-700',
    label: 'text-red-500'
  }
}

function dueLabel(iso: string): { text: string; tone: string } {
  const days = daysUntil(iso)

  if (days < 0) return { text: `${pluralize(-days, 'day')} overdue`, tone: 'text-red-600' }
  if (days === 0) return { text: 'Today', tone: 'text-red-600' }
  if (days === 1) return { text: 'Tomorrow', tone: 'text-brand-700' }
  return { text: `In ${pluralize(days, 'day')}`, tone: 'text-slate-500' }
}

const TREND_MONTHS = 6

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function firstName(full: string | undefined): string {
  const name = (full ?? '').trim()
  return name ? name.split(' ')[0]! : 'there'
}

export function OverviewPage() {
  const { session } = useSession()
  const owner = isOwner(session)

  const months = usePerformanceMonths()
  const [period, setPeriod] = useState(currentPeriod())

  const [range, setRange] = useState<{ from: IsoDate; to: IsoDate } | null>(null)
  const monthOptions = periodOptions(months.data)

  const leads = useLeads('all')
  const projectList = useProjects()
  const team = useTeamPerformance(period, owner)

  const trendMonths = useMemo(
    () => (range ? monthsBetween(range.from, range.to) : lastPeriods(period, TREND_MONTHS)),
    [range, period]
  )
  const trendQueries = useTeamPerformanceMonths(trendMonths, owner)

  const [projectFilter, setProjectFilter] = useState('')

  const allLeads: Lead[] = useMemo(
    () =>
      projectFilter
        ? leads.leads.filter((lead) => sameProject(lead.project, projectFilter))
        : leads.leads,
    [leads.leads, projectFilter]
  )
  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const lead of allLeads) counts.set(lead.status, (counts.get(lead.status) ?? 0) + 1)
    return counts
  }, [allLeads])
  const countAt = (status: string) => statusCounts.get(status) ?? 0

  const scoredTeam = useMemo<PerformanceSummary[]>(
    () => (team.data?.employees ?? []).filter((person) => person.score !== null),
    [team.data]
  )

  const teamAverage =
    scoredTeam.length > 0
      ? scoredTeam.reduce((sum, person) => sum + (person.score ?? 0), 0) / scoredTeam.length
      : 0

  const ranked = useMemo(
    () => [...scoredTeam].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)),
    [scoredTeam]
  )
  const waiting = useMemo(
    () =>
      allLeads
        .filter((lead) => lead.view === 'unassigned')
        .sort((a, b) => Date.parse(a.createdAt ?? '') - Date.parse(b.createdAt ?? '')),
    [allLeads]
  )

  const leadsLoading = leads.isPending

  const failure = [months, leads, team].find((query) => query.isError)?.error as
    | Error
    | undefined

  const trendPoints = useMemo(
    () =>
      trendMonths.flatMap((month, index) => {
        const scores = (trendQueries[index]?.data?.employees ?? [])
          .map((person) => person.score)
          .filter((score): score is number => score !== null)

        if (scores.length === 0) return []

        return [
          {
            label: MONTH_NAMES[parsePeriod(month).month - 1]!.slice(0, 3),
            score: scores.reduce((sum, score) => sum + score, 0) / scores.length
          }
        ]
      }),
    [trendMonths, trendQueries]
  )

  const trendLoading = trendQueries.some((query) => query.isPending)
  const loads = useMemo(() => leadsPerAssignee(allLeads), [allLeads])
  const topPerformer = ranked[0] ?? null
  const myProjects = useMemo(() => {
    const active = projectList.projects.filter((project) => project.active)
    if (owner) return active
    const id = session?.userId
    return id ? active.filter((project) => project.memberIds.includes(id)) : []
  }, [projectList.projects, owner, session?.userId])

  const projectsOf = (userId: string) =>
    leads.roster.find((person) => person.id === userId)?.projects ?? 0

  const shownProjects = useMemo(
    () =>
      projectFilter
        ? myProjects.filter((project) => sameProject(project.name, projectFilter))
        : myProjects,
    [myProjects, projectFilter]
  )

  const hello = useMemo(
    () => `${greeting(new Date().getHours())}, ${firstName(session?.fullName)}`,
    [session?.fullName]
  )

  const upcoming = useMemo(
    () =>
      sortByTiming(
        allLeads.filter((lead) => lead.nextFollowUpAt !== null),
        'upcoming'
      ).slice(0, 6),
    [allLeads]
  )

  return (
    <div className="space-y-5 sm:space-y-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink sm:text-3xl">{hello}</h1>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
          <Dropdown
            className="min-w-0 sm:w-44"
            icon={Calendar}
            value={period}
            onChange={setPeriod}
            options={monthOptions}
          />
          {myProjects.length > 0 && (
            <Dropdown
              className="order-last col-span-2 sm:order-none sm:col-span-1 sm:w-44"
              icon={Building2}
              tone="brand"
              active={Boolean(projectFilter)}
              value={projectFilter}
              onChange={setProjectFilter}
              options={[
                { value: '', label: 'All projects' },
                ...myProjects.map((project) => ({ value: project.name, label: project.name }))
              ]}
            />
          )}
          <DateRangePicker
            className="min-w-0 sm:w-44"
            value={range}
            onChange={setRange}
            onClear={() => setRange(null)}
          />
        </div>
      </header>

      {failure && (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {failure.message}
        </p>
      )}

      <ProjectGoalCards
        goals={
          projectFilter
            ? projectList.goals.filter((goal) =>
                sameProject(
                  projectList.projects.find((project) => project.id === goal.projectId)?.name ??
                    null,
                  projectFilter
                )
              )
            : projectList.goals
        }
        projects={projectList.projects}
      />

      <div className="grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <StatTile
          label="Total leads"
          value={allLeads.length}
          loading={leadsLoading}
          tone="indigo"
          icon={Users}
        />
        <StatTile
          label="Active projects"
          value={projectList.isPending ? undefined : shownProjects.length}
          loading={projectList.isPending}
          tone="violet"
          icon={Building2}
        />
        <StatTile
          label="Unassigned"
          value={leadsLoading ? undefined : waiting.length}
          loading={leadsLoading}
          tone="amber"
          icon={UserPlus}
        />
        <StatTile
          label="Lost"
          value={leadsLoading ? undefined : countAt('lost')}
          loading={leadsLoading}
          tone="rose"
          icon={XCircle}
        />
        <StatTile
          label="Closed"
          value={leadsLoading ? undefined : countAt('closed')}
          loading={leadsLoading}
          tone="emerald"
          icon={CheckCircle2}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
        <Panel
          title="Follow ups"
          action={upcoming.length > 0 ? { to: '/leads?view=mine', label: 'All leads' } : undefined}
        >
          {leadsLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : upcoming.length === 0 ? (
            <p className="flex flex-1 items-center justify-center py-8 text-center text-sm text-slate-400">
              Nothing scheduled. No follow up dates set.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {upcoming.map((lead) => {
                const due = dueLabel(lead.nextFollowUpAt!)

                return (
                  <li key={lead.id} className="flex items-center gap-3 py-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <CalendarClock className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{lead.name}</p>
                      <p className="truncate text-xs text-slate-600">
                        {formatDate(lead.nextFollowUpAt)} · {statusLabel(lead.status)}
                      </p>
                    </div>
                    <span className={cn('shrink-0 text-xs font-semibold', due.tone)}>
                      {due.text}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
        <Panel
          title="Needs attention"
          action={
            waiting.length > 0
              ? { to: '/leads?view=unassigned', label: 'Assign leads' }
              : undefined
          }
        >
          {leadsLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : waiting.length === 0 ? (
            <p className="flex flex-1 items-center justify-center py-8 text-center text-sm text-slate-400">
              Nothing waiting. Every lead is assigned.
            </p>
          ) : (
            <div className="scrollbar-thin -mx-1 max-h-[19rem] overflow-auto px-1">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-white text-left text-2xs font-semibold uppercase tracking-wide text-slate-400">
                    <th scope="col" className="py-2 pl-3 pr-2">
                      Lead
                    </th>
                    <th scope="col" className="px-2 py-2">
                      Project
                    </th>
                    <th scope="col" className="px-2 py-2">
                      Stage
                    </th>
                    <th scope="col" className="px-2 py-2 text-right">
                      Waiting
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {waiting.map((lead) => {
                    const days = daysWaiting(lead)
                    const tone = urgency(days)

                    return (
                      <tr
                        key={lead.id}
                        className={cn(
                          'border-t border-slate-100 [&>td:first-child]:border-l-[3px]',
                          tone.row
                        )}
                      >
                        <td className="py-3 pl-3 pr-2">
                          <p className={cn('truncate font-semibold', tone.text)}>{lead.name}</p>
                          <p className="truncate text-xs tabular-nums text-slate-600">
                            {lead.phone ?? 'N/A'}
                          </p>
                        </td>
                        <td className="px-2 py-3 text-slate-700">{lead.project ?? 'N/A'}</td>
                        <td className="px-2 py-3">
                          <Badge tone="neutral" size="sm">
                            {statusLabel(lead.status)}
                          </Badge>
                        </td>
                        <td
                          className={cn(
                            'whitespace-nowrap px-2 py-3 text-right text-xs font-semibold tabular-nums',
                            tone.label
                          )}
                        >
                          {days === 0 ? 'Today' : `${days} days`}
                          <span className="block text-2xs font-normal text-slate-600">
                            {formatDate(lead.createdAt)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
        {owner && (
          <Panel title="Department Performance">
            {team.isPending ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" rounded="rounded-2xl" />
                <Skeleton className="h-16 w-full" rounded="rounded-2xl" />
              </div>
            ) : (
              <DepartmentPerformance
                departments={team.data?.departments ?? []}
                team={team.data?.employees ?? []}
              />
            )}
          </Panel>
        )}

        <Panel
          className={owner ? undefined : 'lg:col-span-2'}
          title="Your projects"
          action={owner ? { to: '/projects', label: 'Manage' } : undefined}
        >
          <ProjectRosterCard
            projects={shownProjects}
            leads={allLeads}
            loading={projectList.isPending || leadsLoading}
            owner={owner}
          />
        </Panel>
      </div>

      {owner && (
        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
          <Panel title="Team score trend">
            {trendLoading ? (
              <Skeleton className="h-[220px] w-full" rounded="rounded-xl" />
            ) : trendPoints.length === 0 ? (
              <p className="flex flex-1 items-center justify-center py-8 text-center text-sm text-slate-400">
                No months logged yet.
              </p>
            ) : (
              <TeamScoreTrend points={trendPoints} />
            )}
          </Panel>

          {team.isPending ? (
            <Skeleton className="h-[300px] w-full" rounded="rounded-2xl" />
          ) : !topPerformer ? (
            <Panel title="Top performer">
              <p className="flex flex-1 items-center justify-center py-8 text-center text-sm text-slate-400">No data this period.</p>
            </Panel>
          ) : (
            <TopPerformerCard
              name={topPerformer.userName}
              department={topPerformer.departments.join(', ') || null}
              score={topPerformer.score ?? 0}
              grade={topPerformer.grade ?? 'N/A'}
              teamAverage={teamAverage}
              runnerUp={
                ranked[1]
                  ? { name: ranked[1].userName, score: ranked[1].score ?? 0 }
                  : null
              }
            />
          )}
        </div>
      )}

      {owner && (
        <Panel title="Leads per person" action={{ to: '/leads?view=all', label: 'All leads' }}>
          {leadsLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : loads.length === 0 ? (
            <p className="flex flex-1 items-center justify-center py-8 text-center text-sm text-slate-400">Nobody is handling leads yet.</p>
          ) : (
            <div className="space-y-3">
              {loads.map((row) => (
                <LeadHandlerCard
                  key={row.assigneeId}
                  name={row.assigneeName}
                  leads={row.leads}
                  projects={projectsOf(row.assigneeId)}
                />
              ))}
            </div>
          )}
        </Panel>
      )}
    </div>
  )
}

function Panel({
  title,
  action,
  className,
  children
}: {
  title: string
  action?: { to: string; label: string }
  className?: string
  children: React.ReactNode
}) {
  return (
    <section
      className={cn('flex flex-col rounded-2xl border border-slate-200 bg-white p-4 sm:p-6', className)}
    >
      <div className="mb-4 flex items-start justify-between gap-3 sm:mb-5">
        <h2 className="text-lg font-bold text-ink">{title}</h2>
        {action && (
          <Link
            to={action.to}
            className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
          >
            {action.label}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      <div className="flex flex-1 flex-col">{children}</div>
    </section>
  )
}
