import { Gift, Handshake, IndianRupee, Percent, Phone, Users } from 'lucide-react'
import { useMemo, useState } from 'react'

import { useCallStats } from '@hooks/useCalls'
import { useLeads } from '@hooks/useLeads'
import { usePerformance } from '@hooks/usePerformance'
import { useSession } from '@hooks/useSession'
import type { ClosedDeal } from '@logic/leads/leadTypes'
import { amountClosed, breakdown, isClosed, percent, type Period } from '@logic/rules/performance'
import { distinctValues } from '@logic/rules/requirements'
import { ChartCard, GrowthChart, LeadsVsClosedChart, type Month } from '@pages/performance/charts'
import { campaignOf, matchesCall, NO_FILTERS, sourceOf } from '@pages/performance/match'
import { PerformanceFilters } from '@pages/performance/PerformanceFilters'
import { breakdownColumns, callColumns } from '@pages/performance/tables'
import { toKey, todayKey } from '@shared/lib/date'
import { formatMoney } from '@shared/lib/format'
import { StatTile } from '@shared/ui/StatTile'
import { TableSection } from '@shared/ui/Table'

const INCENTIVE_RATE = 0.01
const MONTHS = 6
const monthName = new Intl.DateTimeFormat('en-IN', { month: 'short' })

function monthly(deals: ClosedDeal[]): Month[] {
  const keyOf = (deal: ClosedDeal) => todayKey(new Date(deal.closedAt)).slice(0, 7)
  const starts = Array.from({ length: MONTHS }, (_, index) => {
    const start = new Date()
    start.setDate(1)
    start.setMonth(start.getMonth() - (MONTHS - 1 - index))
    return start
  })
  const first = toKey(starts[0]!).slice(0, 7)
  let total = deals.filter((deal) => keyOf(deal) < first).reduce((sum, deal) => sum + deal.amount, 0)
  return starts.map((start) => {
    const key = toKey(start).slice(0, 7)
    const inMonth = deals.filter((deal) => keyOf(deal) === key)
    const amount = inMonth.reduce((sum, deal) => sum + deal.amount, 0)
    total += amount
    return { key, label: monthName.format(start), amount, deals: inMonth.length, total }
  })
}

export function PerformancePage() {
  const { session } = useSession()
  const [filters, setFilters] = useState(NO_FILTERS)
  const [period, setPeriod] = useState<Period>({ month: '', range: null })
  const leadFilters = useMemo(() => ({ search: filters.search, source: filters.source, campaign: filters.campaign }), [filters])
  const leads = useLeads('mine', leadFilters, period.range ?? (period.month ? { month: period.month } : {}))
  const stats = useCallStats()
  const performance = usePerformance()

  const mine = leads.leads
  const visible = leads.data?.leads ?? []
  const sources = distinctValues(visible, (lead) => lead.source)
  const campaigns = distinctValues(visible, (lead) => lead.campaign ?? null)
  const calls = (stats.data?.calls ?? []).filter(
    (call) => call.userId === session?.userId && matchesCall(call, filters, period, [call.leadName, call.leadPhone])
  )
  const closed = mine.filter(isClosed).length
  const amount = session ? amountClosed(mine, session.userId) : 0
  const bySource = breakdown(mine, sourceOf)
  const byCampaign = breakdown(mine, campaignOf)
  const months = useMemo(() => monthly(performance.data?.mine ?? []), [performance.data])
  const loading = leads.isPending

  return (
    <div className="space-y-5 sm:space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">My performance</h1>
      </header>

      <PerformanceFilters
        filters={filters}
        onChange={setFilters}
        period={period}
        onPeriodChange={setPeriod}
        sources={sources}
        campaigns={campaigns}
        placeholder="Search lead or number"
      />
      {(leads.error ?? stats.error ?? performance.error) && (
        <p className="text-sm text-red-600">{(leads.error ?? stats.error ?? performance.error)!.message}</p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-6">
        <StatTile label="Leads assigned" value={mine.length} loading={loading} tone="indigo" icon={Users} />
        <StatTile label="Closed" value={closed} loading={loading} tone="emerald" icon={Handshake} />
        <StatTile label="Conversion" value={percent({ leads: mine.length, closed })} loading={loading} tone="indigo" icon={Percent} />
        <StatTile label="Amount closed" value={formatMoney(amount)} loading={loading} tone="emerald" icon={IndianRupee} />
        <StatTile label="Incentive" value={formatMoney(amount * INCENTIVE_RATE)} loading={loading} tone="amber" icon={Gift} />
        <StatTile label="Calls made" value={calls.length} loading={stats.isPending} tone="rose" icon={Phone} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCard title="Leads vs closed by source" loading={loading}>
          <LeadsVsClosedChart rows={bySource} />
        </ChartCard>
        <ChartCard title="Growth" loading={performance.isPending}>
          <GrowthChart months={months} />
        </ChartCard>
      </div>

      <TableSection title="Sources" columns={breakdownColumns('Source')} rows={bySource} rowKey={(row) => row.name} isLoading={loading} emptyMessage="No leads in this period." />
      <TableSection title="Campaigns" columns={breakdownColumns('Campaign')} rows={byCampaign} rowKey={(row) => row.name} isLoading={loading} emptyMessage="No leads in this period." />
      <TableSection
        title="My call log"
        columns={callColumns}
        rows={calls}
        rowKey={(call) => `${call.at}-${call.leadId}`}
        isLoading={stats.isPending}
        pageSize={20}
        emptyMessage="No calls in this period."
      />
    </div>
  )
}
