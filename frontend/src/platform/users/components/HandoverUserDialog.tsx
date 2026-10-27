import { useState } from 'react'

import type { AppUser, MoveLeads } from '@platform/users/api/userTypes'
import { useUpdateUser } from '@platform/users/hooks/useUsers'
import { pluralize } from '@shared/lib/format'
import { toast } from '@shared/lib/toast'
import { Button } from '@shared/ui/Button'
import { Checkbox } from '@shared/ui/Checkbox'
import { Modal } from '@shared/ui/Modal'
import { Select } from '@shared/ui/Select'

const nameOf = (user: AppUser) => user.fullName || user.email

export function HandoverUserDialog({
  user,
  users,
  moveLeads,
  onClose
}: {
  user: AppUser
  users: AppUser[]
  moveLeads: MoveLeads
  onClose: () => void
}) {
  const update = useUpdateUser()

  const [toUserId, setToUserId] = useState('')
  const [keep, setKeep] = useState(false)
  const [deactivate, setDeactivate] = useState(!user.active)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  const candidates = users.filter((person) => person.active && person.id !== user.id)
  const target = candidates.find((person) => person.id === toUserId) ?? null

  const submit = async () => {
    if (!target || busy) return
    setBusy(true)
    setFailure(null)

    try {
      const moved = await moveLeads(user.id, target.id, nameOf(target), keep)
      if (deactivate && !keep && user.active) {
        await update.mutateAsync({ id: user.id, active: false })
      }
      toast(
        moved === 0
          ? `${nameOf(user)} had no open leads to move`
          : `${pluralize(moved, 'lead')} ${keep ? 'shared with' : 'moved to'} ${nameOf(target)}`
      )
      onClose()
    } catch (error) {
      setFailure((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Hand over leads"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={busy || !target}>
            {busy ? (keep ? 'Sharing…' : 'Moving…') : keep ? 'Share leads' : 'Move leads'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          {keep ? 'Share ' : 'Move '}
          <span className="font-semibold text-ink">{nameOf(user)}</span>
          {keep
            ? "'s open leads with another person."
            : "'s open leads to another person. Closed and lost leads don't move."}
        </p>

        <Select
          label="Give leads to"
          placeholder="Choose a person"
          value={toUserId}
          disabled={busy}
          searchable={candidates.length > 8}
          onChange={setToUserId}
          options={candidates.map((person) => ({ value: person.id, label: nameOf(person) }))}
        />

        {candidates.length === 0 && (
          <p className="text-sm text-amber-700">
            There&apos;s no other active person to give these leads to.
          </p>
        )}

        {user.active && (
          <>
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <Checkbox
                checked={keep}
                disabled={busy}
                onChange={(next) => {
                  setKeep(next)
                  if (next) setDeactivate(false)
                }}
                label={`Share instead (${nameOf(user)} keeps them too)`}
              />
              Share instead ({nameOf(user)} keeps them too)
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <Checkbox
                checked={deactivate}
                disabled={busy || keep}
                onChange={setDeactivate}
                label={`Deactivate ${nameOf(user)} after moving`}
              />
              <span className={keep ? 'text-slate-400' : undefined}>
                Deactivate {nameOf(user)} after moving (they can&apos;t sign in)
              </span>
            </label>
          </>
        )}

        {failure && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {failure}
          </p>
        )}
      </div>
    </Modal>
  )
}
