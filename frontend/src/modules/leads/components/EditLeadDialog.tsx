import { Loader2 } from 'lucide-react'
import { useState } from 'react'

import type { Lead, LeadWriteInput } from '@modules/leads/api/leadTypes'
import { POSSESSION_BANDS } from '@modules/leads/domain/possession'
import { LEAD_PRIORITIES, priorityLabel } from '@modules/leads/domain/priority'
import { formatBudget, parseBudget } from '@modules/leads/domain/requirements'
import { LEAD_STATUSES, LOST_REASONS, statusLabel } from '@modules/leads/domain/statuses'
import { useWriteLead } from '@modules/leads/hooks/useLeadMutations'
import { useActiveProjectNames } from '@modules/leads/hooks/useProjects'
import { todayKey } from '@shared/lib/date'
import { Button } from '@shared/ui/Button'
import { DatePicker } from '@shared/ui/DatePicker'
import { Input } from '@shared/ui/Input'
import { Modal } from '@shared/ui/Modal'
import { Select, type SelectOption } from '@shared/ui/Select'

const statusOptions = LEAD_STATUSES.map((value) => ({ value, label: statusLabel(value) }))
const priorityOptions = LEAD_PRIORITIES.map((value) => ({ value, label: priorityLabel(value) }))
const lostReasonOptions = LOST_REASONS.map((value) => ({ value, label: value }))
const possessionOptions: SelectOption[] = POSSESSION_BANDS.map((band) => ({
  value: band.value,
  label: `${band.value} (${priorityLabel(band.priority)} priority)`,
  short: band.value
}))

type Changes = NonNullable<LeadWriteInput['changes']>

function toDateInput(iso: string | null): string {
  return iso ? todayKey(new Date(iso)) : ''
}

export function EditLeadDialog({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const write = useWriteLead()
  const projectNames = useActiveProjectNames()

  const [name, setName] = useState(lead.name ?? '')
  const [source, setSource] = useState(lead.source ?? '')
  const [sourceName, setSourceName] = useState(lead.sourceName ?? '')
  const [project, setProject] = useState(lead.project ?? '')
  const [budget, setBudget] = useState(lead.budget === null ? '' : String(lead.budget))
  const [configuration, setConfiguration] = useState(lead.configuration ?? '')
  const [possession, setPossession] = useState(lead.possession ?? '')
  const [status, setStage] = useState(lead.status)
  const [priority, setPriority] = useState(lead.priority ?? '')
  const [followUp, setFollowUp] = useState(toDateInput(lead.nextFollowUpAt))
  const [notes, setNotes] = useState(lead.notes ?? '')
  const [lostReason, setLostReason] = useState(lead.lostReason ?? '')
  const [reason, setReason] = useState('')

  const projectOptions = projectNames.map((name) => ({ value: name, label: name }))

  const isLost = status === 'lost'
  const needsNote = isLost && lostReason === 'Other'
  const budgetValue = budget.trim() === '' ? null : parseBudget(budget)
  const budgetBroken = budget.trim() !== '' && budgetValue === null

  const changes: Changes = {}
  if (name.trim() !== (lead.name ?? '')) changes.name = name.trim()
  if (source.trim() !== (lead.source ?? '')) changes.source = source.trim()
  if (sourceName.trim() !== (lead.sourceName ?? '')) changes.sourceName = sourceName.trim()
  if (project.trim() !== (lead.project ?? '')) changes.project = project.trim()
  if (!budgetBroken && budgetValue !== lead.budget) changes.budget = budgetValue
  if (configuration.trim() !== (lead.configuration ?? '')) {
    changes.configuration = configuration.trim()
  }
  if (possession !== (lead.possession ?? '')) changes.possession = possession
  if (status !== lead.status) changes.status = status
  if (priority && priority !== lead.priority) {
    changes.priority = priority as Changes['priority']
  }
  if (followUp !== toDateInput(lead.nextFollowUpAt)) {
    changes.nextFollowUpAt = followUp ? new Date(`${followUp}T09:00:00`).toISOString() : null
  }
  if (notes.trim() !== (lead.notes ?? '')) changes.notes = notes.trim()
  if (isLost && (changes.status !== undefined || lostReason !== (lead.lostReason ?? ''))) {
    changes.lostReason = lostReason
  }

  const blocked = !name.trim() && (lead.name ?? '').trim() ? 'A lead needs a name.'
    : budgetBroken ? 'Budget cannot be read. Try 67 lakh, 1.5 cr or 6700000.'
    : isLost && !lostReason ? 'Choose an option under "Lost because".'
    : needsNote && !reason.trim() ? 'Say what the other reason was.'
    : Object.keys(changes).length === 0 ? 'Nothing has changed yet.'
    : null

  const submit = () => {
    if (blocked) return
    write.mutate(
      { action: 'update', leadId: lead.id, changes, ...(reason.trim() ? { reason: reason.trim() } : {}) },
      { onSuccess: onClose }
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit lead"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={blocked !== null || write.isPending}>
            {write.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {write.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <p className="text-xs text-slate-500">Phone</p>
          <p className="text-sm font-semibold text-ink">{lead.phone ?? 'No phone on record'}</p>
          <p className="mt-1 text-xs text-slate-500">
            The number identifies the lead. Everything else can be changed.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} />
          <Input label="Source" value={source} onChange={(event) => setSource(event.target.value)} />
          <Input
            label="Source name"
            value={sourceName}
            onChange={(event) => setSourceName(event.target.value)}
          />
          <Select
            label="Project"
            placeholder="Pick a project"
            options={projectOptions}
            value={project}
            searchable={projectOptions.length > 8}
            onChange={setProject}
          />
          <Input
            label="Budget"
            value={budget}
            onChange={(event) => setBudget(event.target.value)}
            error={budgetBroken ? 'Try 67 lakh, 1.5 cr or 6700000' : undefined}
            rightSlot={
              budgetValue !== null && (
                <span className="pointer-events-none pr-1 text-xs font-semibold text-slate-400">
                  {formatBudget(budgetValue)}
                </span>
              )
            }
          />
          <Input
            label="Configuration"
            value={configuration}
            onChange={(event) => setConfiguration(event.target.value)}
          />
          <Select
            label="Possession"
            placeholder="Not set"
            options={possessionOptions}
            value={possession}
            onChange={setPossession}
          />
          <Select
            label="Priority"
            placeholder="No priority"
            options={priorityOptions}
            value={priority}
            onChange={setPriority}
          />
          <div className="rounded-xl border border-brand-200 bg-brand-50 p-3 sm:col-span-2">
            <Select label="Status" options={statusOptions} value={status} onChange={setStage} />
          </div>
        </div>

        {isLost && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3">
            <Select
              label="Lost because"
              placeholder="Pick a reason"
              options={lostReasonOptions}
              value={lostReason}
              onChange={setLostReason}
              error={lostReason ? undefined : 'Required before you can save a lost lead.'}
            />
          </div>
        )}

        <DatePicker label="Next follow up" value={followUp} onChange={setFollowUp} />
        <div className="flex flex-col gap-1">
          <label htmlFor="lead-notes" className="text-sm font-medium text-slate-700">
            Notes
          </label>
          <textarea
            id="lead-notes"
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>

        {needsNote && (
          <div className="flex flex-col gap-1">
            <label htmlFor="lead-reason" className="text-sm font-medium text-slate-700">
              Reason for lost <span className="text-red-600">*</span>
            </label>
            <input
              id="lead-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>
        )}

        {blocked && <p className="text-sm text-slate-500">{blocked}</p>}
        {write.isError && <p className="text-sm text-red-600">{(write.error as Error).message}</p>}
      </div>
    </Modal>
  )
}
