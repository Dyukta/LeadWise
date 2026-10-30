import { Check, Loader2 } from 'lucide-react'
import { useState } from 'react'

import { useAssignLeads } from '@hooks/useLeadMutations'
import { useSession } from '@hooks/useSession'
import { useTeamSplit } from '@hooks/useTeamSplit'
import type { Lead, RosterMember } from '@logic/leads/leadTypes'
import { isOwner } from '@logic/rules/session'
import { isTerminalStatus } from '@logic/rules/statuses'
import { assigneeNames, canAssign } from '@logic/rules/transfer'
import { TeamSplitPicker } from '@pages/leads/TeamSplit'
import { cn } from '@shared/lib/cn'
import { pluralize } from '@shared/lib/format'
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
  const assign = useAssignLeads()
  const { session } = useSession()
  const people = isOwner(session) ? roster : roster.filter((person) => person.id === session?.userId)

  const isBulk = leads.length > 1
  const single = leads[0]

  const [picked, setPicked] = useState<string[]>(() => {
    const current = single?.assignees[0]?.id
    return !isBulk && current && people.some((person) => person.id === current) ? [current] : []
  })
  const [failures, setFailures] = useState<string[]>([])
  const busy = assign.isPending


  const open = leads.filter((lead) => !isTerminalStatus(lead.status))
  const split = useTeamSplit(open.map((lead) => lead.id))
  const plan = isBulk ? split.plan : picked.length ? [{ userId: picked[0]!, leadIds: open.map((lead) => lead.id) }] : []
  const targetOf = new Map(plan.flatMap((group) => group.leadIds.map((id) => [id, group.userId] as const)))
  const checks = leads.map((lead) => ({
    lead,
    check: canAssign({ status: lead.status, assignees: lead.assignees, toUserId: targetOf.get(lead.id) ?? (isBulk ? split.picked[0] : picked[0]) ?? null })
  }))
  const ineligible = checks.flatMap((entry) => (entry.check.ok ? [] : [`${entry.lead.name}: ${entry.check.reason}`]))
  const skip = new Set(checks.filter((entry) => !entry.check.ok).map((entry) => entry.lead.id))
  const groups = plan
    .map((group) => ({ ...group, leadIds: group.leadIds.filter((id) => !skip.has(id)) }))
    .filter((group) => group.leadIds.length > 0)
  const firstRefusal = checks.find((entry) => !entry.check.ok)?.check
  const blocked = groups.length === 0 && firstRefusal && !firstRefusal.ok ? firstRefusal : null
  const nameOf = (id: string) => roster.find((person) => person.id === id)?.name ?? 'Someone'

  const submit = () => {
    if (blocked || groups.length === 0 || busy) return
    setFailures([])
    assign.mutate(
      { groups, names: new Map(leads.map((lead) => [lead.id, lead.name])) },
      {
        onSuccess: ({ done, refused }) => {
          const skipped = [...ineligible, ...refused]
          if (skipped.length === 0) {
            toast(`${pluralize(done, 'lead')} assigned`)
            onAssigned()
            onClose()
            return
          }
          setFailures(skipped)
          if (done > 0) toast(`${done} of ${pluralize(leads.length, 'lead')} assigned`)
        }
      }
    )
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
            onClick={submit}
            disabled={Boolean(blocked) || groups.length === 0 || busy || (isBulk && split.over > 0)}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy
              ? isBulk
                ? `Assigning ${pluralize(groups.reduce((sum, group) => sum + group.leadIds.length, 0), 'lead')}…`
                : 'Assigning…'
              : verb}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {!isBulk && single && (
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-ink">{single.name}</span>
            {single.assignees.length > 0 ? <> is currently with {assigneeNames(single.assignees)}.</> : <> is unassigned.</>}
          </p>
        )}

        {isBulk ? (
          <TeamSplitPicker
            split={split}
            team={people}
            heading="Pick who gets these leads"
            noun="selected"
            rest="stay as they are"
            busy={busy}
          />
        ) : (
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">
            Handled by
          </span>
          {people.length === 0 ? (
            <p className="text-sm text-slate-500">Nobody is active.</p>
          ) : (
            <ul className="scrollbar-thin max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-300">
              {people.map((owner) => {
                const on = picked.includes(owner.id)
                return (
                  <li key={owner.id}>
                    <button
                      type="button"
                      onClick={() => setPicked([owner.id])}
                      aria-pressed={on}
                      className={cn(
                        'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
                        on ? 'bg-brand-50 text-brand-800' : 'text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center border',
                          isBulk ? 'rounded' : 'rounded-full',
                          on ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300'
                        )}
                      >
                        {on && <Check className="h-3 w-3" />}
                      </span>
                      <span className="truncate">{owner.name}</span>
                      {isBulk && on && (
                        <span className="text-xs font-semibold text-brand-700">
                          {pluralize(groups.find((group) => group.userId === owner.id)?.leadIds.length ?? 0, 'lead')}
                        </span>
                      )}
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
        </div>
        )}

        {(isBulk ? split.picked : picked).length > 0 && blocked && !blocked.ok && (
          <p className="text-sm text-red-600">{blocked.reason}</p>
        )}

        {(isBulk ? split.picked : picked).length > 0 && !blocked && ineligible.length > 0 && (
          <p className="text-sm text-amber-700">
            {pluralize(ineligible.length, 'lead')} will be skipped: {ineligible.join('; ')}
          </p>
        )}

        {busy && (
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
            Assigning to {groups.map((group) => nameOf(group.userId)).join(', ')}…
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
