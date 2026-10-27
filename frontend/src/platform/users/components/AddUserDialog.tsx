import { useState } from 'react'

import type { Role } from '@platform/auth/domain/session'
import type { MoveLeads } from '@platform/users/api/userTypes'
import { useCreateUser, useUpdateUser, useUsers } from '@platform/users/hooks/useUsers'
import { pluralize } from '@shared/lib/format'
import { toast } from '@shared/lib/toast'
import { Button } from '@shared/ui/Button'
import { Checkbox } from '@shared/ui/Checkbox'
import { Input } from '@shared/ui/Input'
import { Modal } from '@shared/ui/Modal'
import { PasswordInput } from '@shared/ui/PasswordInput'
import { Select } from '@shared/ui/Select'

const MIN_PASSWORD = 8

export function AddUserDialog({
  open,
  onClose,
  moveLeads
}: {
  open: boolean
  onClose: () => void
  moveLeads?: MoveLeads
}) {
  const create = useCreateUser()
  const update = useUpdateUser()
  const users = useUsers()

  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<Role>('employee')
  const [password, setPassword] = useState('')
  const [takeOverFrom, setTakeOverFrom] = useState('')
  const [keep, setKeep] = useState(true)
  const [deactivate, setDeactivate] = useState(false)

  const [createdId, setCreatedId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  const roster = (users.data ?? []).filter((person) => person.active)
  const leaving = roster.find((person) => person.id === takeOverFrom) ?? null
  const leavingName = leaving ? leaving.fullName || leaving.email : ''

  const close = () => {
    create.reset()
    setEmail('')
    setFullName('')
    setRole('employee')
    setPassword('')
    setTakeOverFrom('')
    setKeep(true)
    setDeactivate(false)
    setCreatedId(null)
    setFailure(null)
    onClose()
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (busy || !canSubmit) return

    setBusy(true)
    setFailure(null)

    const name = fullName.trim() || email.trim()

    try {
      const newUserId =
        createdId ??
        (await create.mutateAsync({ email: email.trim(), fullName: fullName.trim(), role, password }))
      setCreatedId(newUserId)

      if (moveLeads && takeOverFrom) {
        const moved = await moveLeads(takeOverFrom, newUserId, name, keep)
        if (deactivate && !keep) await update.mutateAsync({ id: takeOverFrom, active: false })
        toast(
          moved === 0
            ? `${leavingName || 'They'} had no open leads to move`
            : `${pluralize(moved, 'lead')} ${keep ? 'shared with' : 'moved to'} ${name}`
        )
      }
      close()
    } catch (error) {
      setFailure((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const locked = busy || createdId !== null
  const tooShort = password.length > 0 && password.length < MIN_PASSWORD
  const canSubmit = createdId !== null || (email.trim() !== '' && password.length >= MIN_PASSWORD)

  return (
    <Modal open={open} onClose={close} title="Add user">
      <form id="add-user" className="space-y-4" onSubmit={(event) => void submit(event)} noValidate>
        <Input
          label="Email"
          type="email"
          inputMode="email"
          autoFocus
          value={email}
          disabled={locked}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Input
          label="Full name"
          value={fullName}
          disabled={locked}
          onChange={(event) => setFullName(event.target.value)}
        />
        <PasswordInput
          label="Temporary password"
          autoComplete="new-password"
          value={password}
          disabled={locked}
          error={tooShort ? `At least ${MIN_PASSWORD} characters.` : undefined}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Select
          label="Role"
          value={role}
          disabled={locked}
          onChange={(value) => setRole(value === 'owner' ? 'owner' : 'employee')}
          options={[
            { value: 'employee', label: 'Employee' },
            { value: 'owner', label: 'Owner' }
          ]}
        />

        {moveLeads && (
          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <Select
              label="Take over leads from"
              placeholder="No one"
              value={takeOverFrom}
              disabled={busy}
              searchable={roster.length > 8}
              onChange={setTakeOverFrom}
              options={roster.map((person) => ({
                value: person.id,
                label: person.fullName || person.email
              }))}
            />
            {leaving && (
              <>
                <p className="text-xs text-slate-500">
                  {leavingName}&apos;s open leads{' '}
                  {keep
                    ? 'are shared with this new user.'
                    : "move to this new user. Closed and lost leads don't move."}
                </p>
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <Checkbox
                    checked={keep}
                    disabled={locked}
                    onChange={(next) => {
                      setKeep(next)
                      if (next) setDeactivate(false)
                    }}
                    label={`Share instead (${leavingName} keeps them too)`}
                  />
                  Share instead ({leavingName} keeps them too)
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <Checkbox
                    checked={deactivate}
                    disabled={locked || keep}
                    onChange={setDeactivate}
                    label={`Deactivate ${leavingName} after moving`}
                  />
                  <span className={keep ? 'text-slate-400' : undefined}>
                    Deactivate {leavingName} after moving (they can&apos;t sign in)
                  </span>
                </label>
              </>
            )}
          </div>
        )}

        <p className="text-xs text-slate-500">
          Share the email and temporary password with them. They can change the password from
          their Account page, or sign in with Google using the same email.
        </p>

        {failure && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {createdId
              ? `The account was created, but the handover stopped: ${failure} Retry, or move the leads yourself from the Leads page.`
              : failure}
          </p>
        )}
      </form>
      <footer className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={close} disabled={busy}>
          {createdId ? 'Done' : 'Cancel'}
        </Button>
        <Button type="submit" form="add-user" disabled={busy || !canSubmit}>
          {busy
            ? takeOverFrom
              ? keep
                ? 'Sharing…'
                : 'Moving…'
              : 'Adding…'
            : createdId
              ? 'Retry handover'
              : 'Add user'}
        </Button>
      </footer>
    </Modal>
  )
}
