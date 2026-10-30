import type { CallLog } from '@logic/leads/leadTypes'
import { percent, type Breakdown } from '@logic/rules/performance'
import { cn } from '@shared/lib/cn'
import { formatDate, formatDateTime, formatTime } from '@shared/lib/date'
import { formatMoney } from '@shared/lib/format'
import { Badge } from '@shared/ui/Badge'
import type { Column } from '@shared/ui/Table'

const MEDALS = ['🥇', '🥈', '🥉']

const right = (text: string) => <span className="block text-right">{text}</span>
const number = (value: number) => <span className="block text-right tabular-nums text-slate-700">{value}</span>

export const breakdownColumns = (title: string): Column<Breakdown>[] => [
  { key: 'name', header: title, mobile: 'title', cell: (row) => <span className="font-semibold text-ink">{row.name}</span> },
  { key: 'leads', header: right('Leads'), cell: (row) => number(row.leads) },
  { key: 'closed', header: right('Closed'), cell: (row) => number(row.closed) },
  {
    key: 'conversion',
    header: right('Conversion'),
    cell: (row) => <span className="block text-right font-semibold tabular-nums text-ink">{percent(row)}</span>
  }
]

export const callColumns: Column<CallLog>[] = [
  { key: 'date', header: 'Date', className: 'whitespace-nowrap', cell: (call) => formatDate(call.at) },
  { key: 'time', header: 'Time', className: 'whitespace-nowrap', cell: (call) => formatTime(call.at) },
  { key: 'phone', header: 'Number', className: 'whitespace-nowrap tabular-nums', cell: (call) => call.leadPhone ?? 'N/A' },
  { key: 'lead', header: 'Name', cell: (call) => <span className="font-semibold text-ink">{call.leadName}</span> }
]

export const teamCallColumns: Column<CallLog>[] = [
  ...callColumns,
  { key: 'by', header: 'Called by', className: 'whitespace-nowrap', cell: (call) => call.userName ?? 'N/A' }
]

export type Employee = { id: string; name: string; leads: number; closed: number; calls: number; amount: number; lastCallAt: string | null }

export const employeeColumns: Column<Employee>[] = [
  { key: 'name', header: 'Person', mobile: 'title', cell: (row) => <span className="font-semibold text-ink">{row.name}</span> },
  { key: 'leads', header: right('Leads'), cell: (row) => number(row.leads) },
  { key: 'calls', header: right('Calls'), cell: (row) => number(row.calls) },
  { key: 'closed', header: right('Closed'), cell: (row) => number(row.closed) },
  {
    key: 'conversion',
    header: right('Conversion'),
    cell: (row) => <span className="block text-right font-semibold tabular-nums text-ink">{percent(row)}</span>
  }
]

export const callerColumns: Column<Employee>[] = [
  { key: 'name', header: 'Name', mobile: 'title', cell: (row) => <span className="font-semibold text-ink">{row.name}</span> },
  { key: 'calls', header: right('Calls'), cell: (row) => <span className="block text-right font-semibold tabular-nums text-ink">{row.calls}</span> },
  { key: 'last', header: 'Last call', className: 'whitespace-nowrap', cell: (row) => (row.lastCallAt ? formatDateTime(row.lastCallAt) : 'N/A') }
]

type BoardRow = { rank: number; name: string; amount: number; you: boolean }

export const boardColumns: Column<BoardRow>[] = [
  {
    key: 'rank',
    header: '#',
    mobile: 'title',
    className: 'w-14',
    cell: (row) =>
      row.rank <= MEDALS.length && row.amount > 0 ? (
        <span className="text-2xl leading-none" role="img" aria-label={`Rank ${row.rank}`}>
          {MEDALS[row.rank - 1]}
        </span>
      ) : (
        <span className="pl-2 tabular-nums text-slate-500">{row.rank}</span>
      )
  },
  {
    key: 'name',
    header: 'Name',
    mobile: 'title',
    cell: (row) => (
      <span className={cn('flex items-center gap-2', row.you ? 'font-semibold text-ink' : 'text-slate-700')}>
        {row.name}
        {row.you && (
          <Badge tone="neutral" size="sm">
            You
          </Badge>
        )}
      </span>
    )
  },
  {
    key: 'amount',
    header: right('Amount closed'),
    cell: (row) => <span className="block text-right font-semibold tabular-nums text-ink">{formatMoney(row.amount)}</span>
  }
]
