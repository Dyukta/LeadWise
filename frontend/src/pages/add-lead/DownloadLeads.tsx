import { Download, Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import { useLeads } from '@hooks/useLeads'
import { campaignOf, downloadLeads } from '@logic/leads/exportLeads'
import { distinctValues } from '@logic/rules/requirements'
import { LEAD_STATUSES, statusLabel } from '@logic/rules/statuses'
import { pluralize } from '@shared/lib/format'
import { toast } from '@shared/lib/toast'
import { Button } from '@shared/ui/Button'
import { DateRangePicker } from '@shared/ui/DateRangePicker'
import { Select } from '@shared/ui/Select'
import { Table, type Column } from '@shared/ui/Table'

const statusOptions = LEAD_STATUSES.map((value) => ({ value, label: statusLabel(value) }))

type Range ={ from: string; to: string }
type CampaignRow = { name: string; leads: number }

const columns: Column<CampaignRow>[] = [
  { key: 'name', header: 'Campaign', cell: (row) => <span className="font-medium text-ink">{row.name}</span> },
  {
    key: 'leads',
    header: 'Leads',
    cell: (row) => <span className="tabular-nums text-slate-600">{row.leads}</span>
  }
]

export function DownloadLeads() {
  const [range, setRange] = useState<Range | null>(null)
  const [month, setMonth] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const filters = useMemo(() => ({ status }), [status])

  const leads = useLeads('all', filters, range ?? (month ? { month } : {}))
  const campaigns = useMemo(() => distinctValues(leads.leads, campaignOf), [leads.leads])
  const campaignRows = useMemo(() => {
    const counts = new Map<string, number>()
    for (const lead of leads.leads) counts.set(campaignOf(lead), (counts.get(campaignOf(lead)) ?? 0) + 1)
    return campaigns.map((name) => ({ name, leads: counts.get(name) ?? 0 }))
  }, [campaigns, leads.leads])
  const rows = picked.length ? leads.leads.filter((lead) => picked.includes(campaignOf(lead))) : leads.leads

  const toggle = (name: string, on: boolean) =>
    setPicked((current) => (on ? [...current, name] : current.filter((value) => value !== name)))

  const download = () => {
    setBusy(true)
    downloadLeads(rows)
      .catch((error: Error) => toast(error.message))
      .finally(() => setBusy(false))
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:max-w-xl sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">Date</span>
          <DateRangePicker
            className="w-full"
            label="All months"
            value={range}
            onChange={(next) => {
              setRange(next)
              setMonth('')
            }}
            onClear={() => setRange(null)}
            period={month}
            onPeriodChange={(next) => {
              setMonth(next)
              setRange(null)
            }}
          />
        </div>
        <Select label="Status" placeholder="Any status" options={statusOptions} value={status} onChange={setStatus} />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-slate-700">
            Campaigns {picked.length ? `(${picked.length} selected)` : '(all)'}
          </span>
          {campaigns.length > 0 &&
            (picked.length === campaigns.length ? (
              <button
                type="button"
                onClick={() => setPicked([])}
                className="text-sm font-semibold text-brand-700 hover:text-brand-800"
              >
                Clear all
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setPicked(campaigns)}
                className="text-sm font-semibold text-brand-700 hover:text-brand-800"
              >
                Select all
              </button>
            ))}
        </div>
        <Table
          columns={columns}
          rows={campaignRows}
          rowKey={(row) => row.name}
          isLoading={leads.isPending}
          emptyMessage="No campaigns in this date range."
          selection={{ selectedKeys: picked, onChange: setPicked }}
          onRowClick={(row) => toggle(row.name, !picked.includes(row.name))}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
        <p className="text-sm text-slate-600">
          {leads.isPending ? 'Counting leads…' : `${pluralize(rows.length, 'lead')} will be downloaded`}
        </p>
        <Button onClick={download} disabled={busy || leads.isPending || rows.length === 0}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {busy ? 'Preparing…' : 'Download Excel'}
        </Button>
      </div>
    </div>
  )
}
