import { useQueryClient } from '@tanstack/react-query'
import { Check, Loader2 } from 'lucide-react'
import { useState } from 'react'

import type { Lead, RosterMember } from '@modules/leads/api/leadTypes'
import { assigneeNames, canAssign } from '@modules/leads/domain/transfer'
import { useWriteLead } from '@modules/leads/hooks/useLeadMutations'
import { cn } from '@shared/lib/cn'
import { pluralize } from '@shared/lib/format'
import { queryKeys } from '@shared/lib/queryKeys'
import { toast } from '@shared/lib/toast'
import { Button } from '@shared/ui/Button'
import { Modal } from '@shared/ui/Modal'

export function AssignLeadDialog({
  leads,
  roster,
  onAssigned,
  onClose
}: {
  leads: Lead[]
  roster: RosterMember[]
  onAssigned: () => void
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const write = useWriteLead({ silent: true })

  const isBulk = leads.length > 1
  const single = leads[0]

  const [picked, setPicked] = useState<string[]>(() =>
    isBulk || !single
      ? []
      : single.assignees.map((person) => person.id).filter((id): id is string => id !== null)
  )
  const [failures, setFailures] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const toggle = (id: string) =>
    setPicked((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    )

  const checks = leads.map((lead) => ({
    lead,
    check: canAssign({ status: lead.status, assignees: lead.assignees, toUserIds: picked })
  }))
  const eligible = checks.filter((entry) => entry.check.ok).map((entry) => entry.lead)
  const ineligible = checks.flatMap((entry) =>
    entry.check.ok ? [] : [`${entry.lead.name}: ${entry.check.reason}`]
  )
  const firstRefusal = checks.find((entry) => !entry.check.ok)?.check
  const blocked = eligible.length === 0 && firstRefusal && !firstRefusal.ok ? firstRefusal : null

  const targets = roster.filter((owner) => picked.includes(owner.id))

  const submit = async () => {
    if (blocked || targets.length === 0 || eligible.length === 0 || busy) return
    setFailures([])
    setBusy(true)

    const byId = new Map(eligible.map((lead) => [lead.id, lead.name]))
    const refused = [...ineligible]
    let done = 0

    try {
      const result = await write.mutateAsync({
        action: 'assign',
        leadIds: eligible.map((lead) => lead.id),
        toUserIds: targets.map((owner) => owner.id),
        toUserNames: targets.map((owner) => owner.name)
      })
      const results = ('results' in result && result.results) || []
      if (results.length === 0) {
        done = eligible.length
      } else {
        for (const entry of results) {
          if (entry.ok && !entry.noop) done += 1
          else {
            refused.push(
              `${byId.get(entry.leadId) ?? entry.leadId}: ${entry.error ?? 'Nothing changed.'}`
            )
          }
        }
      }
    } catch (error) {
      for (const lead of eligible) refused.push(`${lead.name}: ${(error as Error).message}`)
    }

    void queryClient.invalidateQueries({ queryKey: queryKeys.leads.all })
    setBusy(false)

    if (refused.length === 0) {
      toast(`${pluralize(done, 'lead')} assigned`)
      onAssigned()
      onClose()
      return
    }

    setFailures(refused)
    if (done > 0) toast(`${done} of ${pluralize(leads.length, 'lead')} assigned`)
  }

  const anyOwned = leads.some((lead) => lead.assignees.length > 0)
  const verb = anyOwned ? 'Reassign' : 'Assign'

  return (
    <Modal
      open
      onClose={onClose}
      title={isBulk ? `${verb} ${pluralize(leads.length, 'lead')}` : `${verb} lead`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={Boolean(blocked) || targets.length === 0 || busy}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy
              ? isBulk
                ? `Assigning ${pluralize(eligible.length, 'lead')}…`
                : 'Assigning…'
              : verb}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {isBulk ? (
          <div>
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-ink">{pluralize(leads.length, 'lead')}</span>{' '}
              selected.
            </p>
            <ul className="scrollbar-thin mt-2 max-h-32 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              {leads.map((lead) => (
                <li key={lead.id} className="truncate py-0.5">
                  {lead.name}
                  {lead.assignees.length > 0 && (
                    <span className="text-slate-400"> · {assigneeNames(lead.assignees)}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          single && (
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-ink">{single.name}</span>
              {single.assignees.length > 0 ? (
                <> is currently with {assigneeNames(single.assignees)}.</>
              ) : (
                <> is unassigned.</>
              )}
            </p>
          )
        )}

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">
            Handled by <span className="text-xs font-normal text-slate-400">(pick one or more)</span>
          </span>
          {roster.length === 0 ? (
            <p className="text-sm text-slate-500">Nobody is active.</p>
          ) : (
            <ul className="scrollbar-thin max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-300">
              {roster.map((owner) => {
                const on = picked.includes(owner.id)
                return (
                  <li key={owner.id}>
                    <button
                      type="button"
                      onClick={() => toggle(owner.id)}
                      aria-pressed={on}
                      className={cn(
                        'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
                        on ? 'bg-brand-50 text-brand-800' : 'text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                          on ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300'
                        )}
                      >
                        {on && <Check className="h-3 w-3" />}
                      </span>
                      <span className="truncate">{owner.name}</span>
                      {owner.role === 'owner' && (
                        <span className="ml-auto text-2xs uppercase tracking-wide text-slate-400">
                          owner
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          {targets.length > 1 && (
            <p className="text-xs text-slate-500">
              All {targets.length} will see this lead under My leads and can work it.
            </p>
          )}
        </div>

        {picked.length > 0 && blocked && !blocked.ok && (
          <p className="text-sm text-red-600">{blocked.reason}</p>
        )}

        {picked.length > 0 && !blocked && ineligible.length > 0 && (
          <p className="text-sm text-amber-700">
            {pluralize(ineligible.length, 'lead')} will be skipped: {ineligible.join('; ')}
          </p>
        )}

        {busy && (
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
            Assigning to {targets.map((owner) => owner.name).join(', ')}…
          </p>
        )}

        {failures.length > 0 && (
          <div role="alert" className="rounded-xl bg-red-50 px-3 py-2 ring-1 ring-red-200">
            <p className="text-sm font-semibold text-red-800">
              {pluralize(failures.length, 'lead')} could not be assigned:
            </p>
            <ul className="mt-1 space-y-0.5 text-sm text-red-700">
              {failures.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  )
}
