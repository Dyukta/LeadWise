import { Loader2, Pencil, UserPlus } from 'lucide-react'

import type { Lead } from '@modules/leads/api/leadTypes'
import { priorityLabel } from '@modules/leads/domain/priority'
import { formatBudget } from '@modules/leads/domain/requirements'
import { statusLabel } from '@modules/leads/domain/statuses'
import { assigneeNames } from '@modules/leads/domain/transfer'
import { cn } from '@shared/lib/cn'
import { formatDate } from '@shared/lib/date'
import { Badge, type BadgeTone } from '@shared/ui/Badge'
import { Table, type Column } from '@shared/ui/Table'

const priorityTones: Record<string, BadgeTone> = {
  high: 'danger',
  medium: 'warning',
  low: 'neutral'
}

const priorityDots: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-slate-400'
}

const statusTones: Record<string, BadgeTone> = {
  new: 'info',
  contacted: 'info',
  ringing: 'info',
  site_visit_scheduled: 'warning',
  site_visit_done: 'success',
  revisit_scheduled: 'warning',
  booked: 'success',
  documentation: 'warning',
  agreement_done: 'success',
  disbursement_done: 'success',
  closed: 'success',
  lost: 'danger'
}

function isOverdue(iso: string): boolean {
  return new Date(iso).getTime() < Date.now()
}

const baseColumns: Column<Lead>[] = [
  {
    key: 'name',
    header: 'Lead',
    cell: (lead) => (
      <div className="min-w-0">
        <p className="font-semibold text-ink">{lead.name}</p>
        <p className="text-xs text-slate-500">{lead.phone ?? 'N/A'}</p>
      </div>
    )
  },
  {
    key: 'source',
    header: 'Source',
    className: 'whitespace-nowrap',
    cell: (lead) => (
      <div>
        <p>{lead.source ?? 'N/A'}</p>
        {lead.sourceName && <p className="text-xs text-slate-400">{lead.sourceName}</p>}
      </div>
    )
  },
  {
    key: 'configuration',
    header: 'Requirement',
    className: 'whitespace-nowrap',
    cell: (lead) => lead.configuration ?? 'N/A'
  },
  {
    key: 'budget',
    header: 'Budget',
    className: 'whitespace-nowrap tabular-nums font-semibold text-ink',
    cell: (lead) => formatBudget(lead.budget)
  },
  {
    key: 'project',
    header: 'Project',
    className: 'whitespace-nowrap',
    cell: (lead) => lead.project ?? 'N/A'
  },
  {
    key: 'priority',
    header: 'Priority',
    className: 'whitespace-nowrap',
    cell: (lead) =>
      lead.priority ? (
        <Badge tone={priorityTones[lead.priority] ?? 'neutral'}>
          <span className={cn('h-1.5 w-1.5 rounded-full', priorityDots[lead.priority] ?? 'bg-slate-400')} />
          {priorityLabel(lead.priority)}
        </Badge>
      ) : (
        'N/A'
      )
  },
  {
    key: 'status',
    header: 'Status',
    className: 'whitespace-nowrap',
    cell: (lead) => <Badge tone={statusTones[lead.status] ?? 'neutral'}>{statusLabel(lead.status)}</Badge>
  },
  {
    key: 'nextFollowUp',
    header: 'Next Follow Up',
    className: 'whitespace-nowrap',
    cell: (lead) => (
      <div>
        <p className={cn(lead.nextFollowUpAt && isOverdue(lead.nextFollowUpAt) && 'font-semibold text-red-600')}>
          {lead.nextFollowUpAt ? formatDate(lead.nextFollowUpAt) : 'N/A'}
        </p>
        <p className="text-xs text-slate-400">updated {formatDate(lead.updatedAt)}</p>
      </div>
    )
  },
  {
    key: 'owner',
    header: 'Assigned To',
    cell: (lead) => (lead.assignees.length === 0 ? 'Unassigned' : assigneeNames(lead.assignees))
  }
]

export function LeadTable({
  leads,
  isLoading,
  selectedIds,
  onSelectionChange,
  onSelect,
  onAssign,
  onEdit
}: {
  leads: Lead[]
  isLoading: boolean
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  onSelect: (lead: Lead) => void
  onAssign: (lead: Lead) => void
  onEdit: (lead: Lead) => void
}) {
  const columns: Column<Lead>[] = [
    ...baseColumns,
    {
      key: 'assign',
      header: 'Action',
      className: 'w-44 whitespace-nowrap text-right',
      cell: (lead) =>
        lead.pending ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Syncing…
          </span>
        ) : (
          <div className="flex items-center justify-end gap-2">
            {lead.canEdit && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onEdit(lead)
                }}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 border border-brand-200 bg-brand-50 text-brand-700 hover:border-brand-300 hover:bg-brand-100"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
            )}
            {lead.canAssign && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onAssign(lead)
                }}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 bg-brand-600 text-white shadow-sm hover:bg-brand-700"
              >
                <UserPlus className="h-3.5 w-3.5" />
                {lead.assignees.length > 0 ? 'Reassign' : 'Assign'}
              </button>
            )}
          </div>
        )
    }
  ]

  return (
    <Table
      columns={columns}
      rows={leads}
      rowKey={(lead) => lead.id}
      selection={{
        selectedKeys: selectedIds,
        onChange: onSelectionChange,
        isSelectable: (lead) => !lead.pending && lead.canAssign
      }}
      onRowClick={(lead) => {
        if (!lead.pending) onSelect(lead)
      }}
      isLoading={isLoading}
      emptyMessage="No leads in this view."
      pageSize={20}
    />
  )
}
