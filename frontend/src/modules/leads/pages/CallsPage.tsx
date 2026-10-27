import { Phone, UserRound, Users } from 'lucide-react'
import { useState } from 'react'

import type { CallLog } from '@modules/leads/api/leadTypes'
import { useCalls } from '@modules/leads/hooks/useLeads'
import { isOwner } from '@platform/auth/domain/session'
import { useSession } from '@platform/auth/hooks/useSession'
import { formatDateTime, todayKey } from '@shared/lib/date'
import { DateRangePicker } from '@shared/ui/DateRangePicker'
import { Dropdown } from '@shared/ui/Dropdown'
import { StatTile } from '@shared/ui/StatTile'
import { Table, type Column } from '@shared/ui/Table'

type Range = { from: string; to: string }
type PersonRow = { id: string; name: string; calls: number; leads: number }

const callColumns = (team: boolean): Column<CallLog>[] => [
  { key: 'at', header: 'When', className: 'whitespace-nowrap', cell: (call) => formatDateTime(call.at) },
  { key: 'lead', header: 'Lead', cell: (call) => <span className="font-semibold text-ink">{call.leadName}</span> },
  { key: 'phone', header: 'Number', className: 'whitespace-nowrap tabular-nums', cell: (call) => call.leadPhone ?? 'N/A' },
  { key: 'project', header: 'Project', cell: (call) => call.project ?? 'N/A' },
  ...(team ? [{ key: 'by', header: 'Called by', cell: (call: CallLog) => call.userName ?? 'N/A' }] : [])
]

const personColumns: Column<PersonRow>[] = [
  { key: 'name', header: 'Name', cell: (row) => <span className="font-semibold text-ink">{row.name}</span> },
  { key: 'calls', header: 'Calls', className: 'tabular-nums', cell: (row) => row.calls },
  { key: 'leads', header: 'Leads called', className: 'tabular-nums', cell: (row) => row.leads }
]

export function CallsPage() {
  const { session } = useSession()
  const team = isOwner(session)
  const stats = useCalls()
  const today = todayKey()
  const [range, setRange] = useState<Range | null>(null)
  const [caller, setCaller] = useState('')

  const shown = range ?? { from: `${today.slice(0, 7)}-01`, to: today }
  const calls = (stats.data?.calls ?? []).filter((call) => {
    const day = todayKey(new Date(call.at))
    return day >= shown.from && day <= shown.to && (!caller || call.userId === caller)
  })

  const people: PersonRow[] = (stats.data?.people ?? [])
    .filter((person) => !caller || person.id === caller)
    .map((person) => {
      const mine = calls.filter((call) => call.userId === person.id)
      return { ...person, calls: mine.length, leads: new Set(mine.map((call) => call.leadId)).size }
    })
    .sort((a, b) => b.calls - a.calls)

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">{team ? 'Team calls' : 'My calls'}</h1>
        <div className="flex flex-wrap gap-2">
          {team && (
            <Dropdown
              className="w-44"
              icon={UserRound}
              tone="brand"
              active={Boolean(caller)}
              value={caller}
              onChange={setCaller}
              options={[
                { value: '', label: 'All callers' },
                ...(stats.data?.people ?? []).map((person) => ({ value: person.id, label: person.name }))
              ]}
            />
          )}
          <DateRangePicker className="w-44" label="This month" value={range} onChange={setRange} onClear={() => setRange(null)} />
        </div>
      </header>

      {stats.isError && <p className="text-sm text-red-600">{stats.error.message}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
        <StatTile label="Calls made" value={calls.length} loading={stats.isPending} tone="indigo" icon={Phone} />
        <StatTile
          label="Leads called"
          value={new Set(calls.map((call) => call.leadId)).size}
          loading={stats.isPending}
          tone="emerald"
          icon={Users}
        />
      </div>

      {team && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-ink">Calls by person</h2>
          <Table columns={personColumns} rows={people} rowKey={(row) => row.id} isLoading={stats.isPending} />
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-ink">Call log</h2>
        <Table
          columns={callColumns(team)}
          rows={calls}
          rowKey={(call) => `${call.at}-${call.leadId}-${call.userId}`}
          isLoading={stats.isPending}
          pageSize={20}
          emptyMessage="No calls in this period."
        />
      </section>
    </div>
  )
}
