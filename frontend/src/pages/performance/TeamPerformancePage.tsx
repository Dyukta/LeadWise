import { Phone, Share2, Target, Trophy, UserRound } from 'lucide-react'
import { useMemo, useState } from 'react'

import { useCallStats } from '@hooks/useCalls'
import { useLeads } from '@hooks/useLeads'
import { useSession } from '@hooks/useSession'
import { amountClosed, bestConversion, breakdown, chartDays, isClosed, percent, type Period } from '@logic/rules/performance'
import { distinctValues } from '@logic/rules/requirements'
import { CallsChart, ChartCard, LeadsVsClosedChart, LostReasonsChart } from '@pages/performance/charts'
import { campaignOf, dayOf, isLost, lostReasonOf, matchesCall, NO_FILTERS, sourceOf } from '@pages/performance/match'
import { PerformanceFilters } from '@pages/performance/PerformanceFilters'
import {
  boardColumns,
  breakdownColumns,
  callerColumns,
  employeeColumns,
  teamCallColumns,
  type Employee
} from '@pages/performance/tables'
import { todayKey } from '@shared/lib/date'
import { compactMoney, pluralize } from '@shared/lib/format'
import { StatTile } from '@shared/ui/StatTile'
import { TableSection } from '@shared/ui/Table'

export function TeamPerformancePage() {
  const { session } = useSession()
  const [filters, setFilters] = useState(NO_FILTERS)
  const [period, setPeriod] = useState<Period>({ month: '', range: null })
  const leadFilters = useMemo(() => ({ search: filters.search, source: filters.source, campaign: filters.campaign }), [filters])
  const leads = useLeads('all', leadFilters, period.range ?? (period.month ? { month: period.month } : {}))
  const stats = useCallStats()

  const all = leads.data?.leads ?? []
  const people = leads.roster.filter((person) => !filters.person || person.id === filters.person)
  const rows = filters.person ? leads.leads.filter((lead) => lead.assignees.some((person) => person.id === filters.person)) : leads.leads
  const calls = (stats.data?.calls ?? []).filter((call) =>
    matchesCall(call, filters, period, [call.leadName, call.leadPhone, call.userName])
  )

  const bySource = breakdown(rows, sourceOf)
  const byCampaign = breakdown(rows, campaignOf)
  const lostReasons = breakdown(rows.filter(isLost), lostReasonOf)
  const highest = bySource[0] ?? null
  const best = bestConversion(bySource)

  const employees: Employee[] = people.map((person) => {
    const theirs = rows.filter((lead) => lead.assignees.some((assignee) => assignee.id === person.id))
    const made = calls.filter((call) => call.userId === person.id)
    return {
      id: person.id,
      name: person.name,
      leads: theirs.length,
      closed: theirs.filter(isClosed).length,
      calls: made.length,
      amount: amountClosed(theirs, person.id),
      lastCallAt: made[0]?.at ?? null
    }
  })
  const byAmount = [...employees].sort((a, b) => b.amount - a.amount)
  const callers = [...employees].sort((a, b) => b.calls - a.calls)
  const topPerformer = byAmount[0]?.amount ? byAmount[0] : null
  const topCaller = callers[0]?.calls ? callers[0] : null
  const board = byAmount.map((row, index) => ({ rank: index + 1, name: row.name, amount: row.amount, you: row.id === session?.userId }))

  const days = chartDays(period, todayKey())
  const counts = new Map<string, number>()
  for (const call of calls) counts.set(`${call.userId}|${dayOf(call)}`, (counts.get(`${call.userId}|${dayOf(call)}`) ?? 0) + 1)
  const series = people.map((person) => ({ name: person.name, counts: days.map((day) => counts.get(`${person.id}|${day}`) ?? 0) }))

  const loading = leads.isPending
  const error = leads.error ?? stats.error

  return (
    <div className="space-y-5 sm:space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">Team performance</h1>
      </header>

      <PerformanceFilters
        filters={filters}
        onChange={setFilters}
        period={period}
        onPeriodChange={setPeriod}
        sources={distinctValues(all, (lead) => lead.source)}
        campaigns={distinctValues(all, (lead) => lead.campaign ?? null)}
        people={leads.roster.map((person) => ({ value: person.id, label: person.name }))}
        placeholder="Search lead, number or caller"
      />
      {error && <p className="text-sm text-red-600">{error.message}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-5">
        <StatTile
          label="Source with highest leads"
          value={highest?.name ?? 'N/A'}
          detail={highest ? pluralize(highest.leads, 'lead') : undefined}
          loading={loading}
          tone="indigo"
          icon={Share2}
        />
        <StatTile
          label="Source with best conversion"
          value={best?.name ?? 'N/A'}
          detail={best ? `${percent(best)} · ${best.closed} of ${best.leads}` : undefined}
          loading={loading}
          tone="emerald"
          icon={Target}
        />
        <StatTile
          label="Top performer"
          value={topPerformer?.name ?? 'N/A'}
          detail={topPerformer ? `${compactMoney(topPerformer.amount)} closed` : undefined}
          loading={loading}
          tone="amber"
          icon={Trophy}
        />
        <StatTile label="Calls made" value={calls.length} loading={stats.isPending} tone="rose" icon={Phone} />
        <StatTile
          label="Top caller"
          value={topCaller?.name ?? 'N/A'}
          detail={topCaller ? pluralize(topCaller.calls, 'call') : undefined}
          loading={stats.isPending}
          tone="indigo"
          icon={UserRound}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCard title="Leads vs closed by source" loading={loading}>
          <LeadsVsClosedChart rows={bySource} />
        </ChartCard>
        <ChartCard title="Leads vs closed by campaign" loading={loading}>
          <LeadsVsClosedChart rows={byCampaign} />
        </ChartCard>
      </div>
      <ChartCard title="Lost reasons" loading={loading}>
        <LostReasonsChart rows={lostReasons} />
      </ChartCard>
      <ChartCard title="Calls per day" loading={stats.isPending}>
        <CallsChart days={days} series={series} />
      </ChartCard>

      <TableSection title="Employees" columns={employeeColumns} rows={employees} rowKey={(row) => row.id} isLoading={loading} emptyMessage="No one here yet." />
      <TableSection title="Leaderboard" columns={boardColumns} rows={board} rowKey={(row) => `${row.rank}-${row.name}`} isLoading={loading} emptyMessage="No one has closed a deal yet." />
      <TableSection title="Sources" columns={breakdownColumns('Source')} rows={bySource} rowKey={(row) => row.name} isLoading={loading} emptyMessage="No leads in this period." />
      <TableSection title="Campaigns" columns={breakdownColumns('Campaign')} rows={byCampaign} rowKey={(row) => row.name} isLoading={loading} emptyMessage="No leads in this period." />
      <TableSection title="Calls by person" columns={callerColumns} rows={callers} rowKey={(row) => row.id} isLoading={stats.isPending} emptyMessage="No one here yet." />
      <TableSection
        title="Team call log"
        columns={teamCallColumns}
        rows={calls}
        rowKey={(call) => `${call.at}-${call.leadId}-${call.userId}`}
        isLoading={stats.isPending}
        pageSize={20}
        emptyMessage="No calls match these filters."
      />
    </div>
  )
}
