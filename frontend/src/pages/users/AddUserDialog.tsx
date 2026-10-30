import { useState } from 'react'

import { useAddUser, useUsers } from '@hooks/useUsers'
import { validateEmail } from '@logic/rules/credentials'
import type { Role } from '@logic/rules/session'
import { userName } from '@logic/users/userTypes'
import { Button } from '@shared/ui/Button'
import { Checkbox } from '@shared/ui/Checkbox'
import { Input } from '@shared/ui/Input'
import { Modal } from '@shared/ui/Modal'
import { Select } from '@shared/ui/Select'

export function AddUserDialog({
  open,
  onClose
}: {
  open: boolean
  onClose: () => void
}) {
  const add = useAddUser()
  const users = useUsers()

  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<Role>('employee')
  const [takeOverFrom, setTakeOverFrom] = useState('')
  const [deactivate, setDeactivate] = useState(false)

  const createdId = add.createdId
  const busy = add.isPending
  const failure = add.error?.message ?? null

  const roster = (users.data ?? []).filter((person) => person.active)
  const leaving = roster.find((person) => person.id === takeOverFrom) ?? null
  const leavingName = leaving ? userName(leaving) : ''

  const close = () => {
    add.reset()
    setEmail('')
    setFullName('')
    setRole('employee')
    setTakeOverFrom('')
    setDeactivate(false)
    onClose()
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (busy || !canSubmit) return
    add.mutate(
      {
        email: email.trim(),
        fullName: fullName.trim(),
        role,
        leaving,
        deactivate
      },
      { onSuccess: close }
    )
  }

  const locked = busy || createdId !== null
  const emailError = email.trim() ? validateEmail(email) : undefined
  const canSubmit = createdId !== null || (email.trim() !== '' && !emailError)

  return (
    <Modal open={open} onClose={close} title="Add user">
      <form id="add-user" className="space-y-4" onSubmit={submit} noValidate>
        <Input
          label="Email"
          type="email"
          inputMode="email"
          autoFocus
          value={email}
          disabled={locked}
          error={emailError}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Input
          label="Full name"
          value={fullName}
          disabled={locked}
          onChange={(event) => setFullName(event.target.value)}
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
              label: userName(person)
            }))}
          />
          {leaving && (
            <>
              <p className="text-xs text-slate-500">
                {leavingName}&apos;s open leads{' '}
                move to this new user. Closed and lost leads don&apos;t move.
              </p>
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <Checkbox
                  checked={deactivate}
                  disabled={locked}
                  onChange={setDeactivate}
                  label={`Deactivate ${leavingName} after moving`}
                />
                <span>Deactivate {leavingName} after moving (they can&apos;t sign in)</span>
              </label>
            </>
          )}
        </div>

        <p className="text-xs text-slate-500">
          They sign in with Continue with Google using this email.
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
              ? 'Moving…'
              : 'Adding…'
            : createdId
              ? 'Retry handover'
              : 'Add user'}
        </Button>
      </footer>
    </Modal>
  )
}
