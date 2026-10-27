import { useState } from 'react'

import type { Role } from '@platform/auth/domain/session'
import { useSession } from '@platform/auth/hooks/useSession'
import type { AppUser } from '@platform/users/api/userTypes'
import { useUpdateUser } from '@platform/users/hooks/useUsers'
import { Button } from '@shared/ui/Button'
import { Input } from '@shared/ui/Input'
import { Modal } from '@shared/ui/Modal'
import { PasswordInput } from '@shared/ui/PasswordInput'
import { Select } from '@shared/ui/Select'

const MIN_PASSWORD = 8

export function EditUserDialog({ user, onClose }: { user: AppUser; onClose: () => void }) {
  const { session } = useSession()
  const update = useUpdateUser()

  const [fullName, setFullName] = useState(user.fullName)
  const [role, setRole] = useState<Role>(user.role)
  const [active, setActive] = useState(user.active)
  const [password, setPassword] = useState('')

  const isSelf = user.id === session?.userId
  const busy = update.isPending
  const error = update.error as Error | null
  const tooShort = password.length > 0 && password.length < MIN_PASSWORD

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (tooShort) return
    update.mutate(
      {
        id: user.id,
        fullName: fullName.trim(),
        ...(isSelf ? {} : { role, active }),
        ...(password ? { password } : {})
      },
      { onSuccess: onClose }
    )
  }

  return (
    <Modal open onClose={onClose} title="Edit user">
      <form id="edit-user" className="space-y-4" onSubmit={submit} noValidate>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            {user.email}
          </p>
          <p className="text-xs text-slate-500">
            Fixed once created. It is the address they sign in with. To change it, delete this
            user and add them again.
          </p>
        </div>

        <Input
          label="Full name"
          autoFocus
          value={fullName}
          disabled={busy}
          onChange={(event) => setFullName(event.target.value)}
        />
        <Select
          label="Role"
          value={role}
          disabled={isSelf || busy}
          onChange={(value) => setRole(value === 'owner' ? 'owner' : 'employee')}
          options={[
            { value: 'employee', label: 'Employee' },
            { value: 'owner', label: 'Owner' }
          ]}
        />
        <Select
          label="Status"
          value={active ? 'active' : 'inactive'}
          disabled={isSelf || busy}
          onChange={(value) => setActive(value === 'active')}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive, cannot sign in' }
          ]}
        />

        {!isSelf && (
          <div className="flex flex-col gap-1">
            <PasswordInput
              label="Set a new password"
              autoComplete="new-password"
              value={password}
              disabled={busy}
              error={tooShort ? `At least ${MIN_PASSWORD} characters.` : undefined}
              onChange={(event) => setPassword(event.target.value)}
            />
            <p className="text-xs text-slate-500">
              Leave empty to keep their current password. Use this when they forget it.
            </p>
          </div>
        )}

        {isSelf && (
          <p className="text-xs text-slate-500">
            This is your own account. Role and status are locked so you cannot lock yourself out.
          </p>
        )}

        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error.message}
          </p>
        )}
      </form>
      <footer className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" form="edit-user" disabled={busy || tooShort}>
          {update.isPending ? 'Saving…' : 'Save'}
        </Button>
      </footer>
    </Modal>
  )
}
