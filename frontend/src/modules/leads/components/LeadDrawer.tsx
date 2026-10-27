import { Phone } from 'lucide-react'

import type { Lead, LeadHandover } from '@modules/leads/api/leadTypes'
import { priorityLabel } from '@modules/leads/domain/priority'
import { formatBudget } from '@modules/leads/domain/requirements'
import { statusLabel } from '@modules/leads/domain/statuses'
import { assigneeNames } from '@modules/leads/domain/transfer'
import { useLogCall } from '@modules/leads/hooks/useLeadMutations'
import { cn } from '@shared/lib/cn'
import { formatDateTime } from '@shared/lib/date'
import { Button } from '@shared/ui/Button'
import { Modal } from '@shared/ui/Modal'

export function LeadDrawer({
  lead,
  canAssignLead,
  onAssign,
  onClose
}: {
  lead: Lead | null
  canAssignLead: boolean
  onAssign: (lead: Lead) => void
  onClose: () => void
}) {
  const logCall = useLogCall()
  if (!lead) return null

  const call = () => {
    logCall.mutate(lead.id)
    window.location.href = `tel:${lead.phone}`
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={lead.name}
      footer={
        <div className="flex w-full gap-2">
          {lead.phone && !lead.pending && (
            <Button variant="secondary" className="flex-1" onClick={call}>
              <Phone className="h-4 w-4" />
              Call
            </Button>
          )}
          {canAssignLead && (
            <Button className="flex-1" onClick={() => onAssign(lead)}>
              {lead.assignees.length > 0 ? 'Reassign lead' : 'Assign lead'}
            </Button>
          )}
        </div>
      }
    >
      <p className="text-sm font-medium text-slate-500">{statusLabel(lead.status)}</p>
      <dl className="mt-4 space-y-3 text-sm">
        <Row label="Phone" value={lead.phone ?? 'N/A'} />
        <Row label="Budget" value={formatBudget(lead.budget)} />
        <Row label="Config" value={lead.configuration ?? 'N/A'} />
        <Row label="Project" value={lead.project ?? 'N/A'} />
        <Row label="Possession" value={lead.possession ?? 'N/A'} />
        <Row label="Priority" value={lead.priority ? priorityLabel(lead.priority) : 'N/A'} />
        <Row label="Follow up" value={lead.nextFollowUpAt ? formatDateTime(lead.nextFollowUpAt) : 'N/A'} />
        <Row
          label={lead.assignees.length > 1 ? 'Handled by' : 'Owner'}
          value={lead.assignees.length === 0 ? 'Unassigned' : assigneeNames(lead.assignees)}
        />
        <Row label="Source" value={lead.source ?? 'N/A'} />
        <Row label="Source name" value={lead.sourceName ?? 'N/A'} />
        {lead.campaign && <Row label="Campaign" value={lead.campaign} />}
        <Row label="Created" value={formatDateTime(lead.createdAt)} />
        <Row
          label="Untouched"
          value={lead.untouchedDays === null ? 'N/A' : `${lead.untouchedDays} days`}
        />
        {lead.status === 'lost' && <Row label="Lost because" value={lead.lostReason ?? 'N/A'} />}
        <Row label="Notes" value={lead.notes ?? 'N/A'} />
      </dl>
      <Timeline entries={lead.history ?? []} />
    </Modal>
  )
}

function Timeline({ entries }: { entries: LeadHandover[] }) {
  if (entries.length === 0) return null

  return (
    <section className="mt-6">
      <h3 className="text-sm font-semibold text-ink">Handling history</h3>
      <ol className="mt-3 space-y-4 border-l border-slate-200 pl-4">
        {entries.map((entry, index) => (
          <li key={`${entry.at}-${index}`} className="relative">
            <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5">
              {index === entries.length - 1 && (
                <>
                  <span className="pulse-ring absolute inset-0 rounded-full bg-brand-500" />
                  <span
                    className="pulse-ring absolute inset-0 rounded-full bg-brand-500"
                    style={{ animationDelay: '0.8s' }}
                  />
                </>
              )}
              <span
                className={cn(
                  'absolute inset-0 rounded-full ring-2 ring-white',
                  index === entries.length - 1 ? 'bg-brand-600' : 'bg-brand-200'
                )}
              />
            </span>
            <p className="text-sm font-medium text-ink">{entry.assigneeName ?? 'Unassigned'}</p>
            <p className="text-xs text-slate-500">{formatDateTime(entry.at)}</p>
            {(entry.reason || entry.byName) && (
              <p className="mt-0.5 text-xs text-slate-400">
                {entry.reason ?? (index === 0 ? 'Assigned' : 'Reassigned')}
                {entry.byName && ` · by ${entry.byName}`}
              </p>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-28 shrink-0 text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-slate-800">{value}</dd>
    </div>
  )
}
