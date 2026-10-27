import { UserPlus } from 'lucide-react'
import { useState } from 'react'

import type { AppUser, MoveLeads } from '@platform/users/api/userTypes'
import { AddUserDialog } from '@platform/users/components/AddUserDialog'
import { EditUserDialog } from '@platform/users/components/EditUserDialog'
import { HandoverUserDialog } from '@platform/users/components/HandoverUserDialog'
import { UserTable } from '@platform/users/components/UserTable'
import { useUsers } from '@platform/users/hooks/useUsers'
import { Button } from '@shared/ui/Button'

export function UsersPage({
  moveLeads
}: {
  moveLeads?: MoveLeads
}) {
  const users = useUsers()
  const everyone = users.data ?? []
  const owners = everyone.filter((person) => person.role === 'owner')
  const team = everyone.filter((person) => person.role !== 'owner')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<AppUser | null>(null)
  const [handing, setHanding] = useState<AppUser | null>(null)

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">Users</h1>
        <Button onClick={() => setAdding(true)}>
          <UserPlus className="h-4 w-4" />
          Add user
        </Button>
      </header>

      {users.isError && <p className="text-sm text-red-600">{(users.error as Error).message}</p>}

      {owners.length > 0 && (
        <UserTable
          users={owners}
          isLoading={users.isPending}
          onEdit={setEditing}
          onHandover={moveLeads && setHanding}
        />
      )}
      <UserTable
        users={team}
        isLoading={users.isPending}
        onEdit={setEditing}
        onHandover={moveLeads && setHanding}
      />
      <AddUserDialog open={adding} onClose={() => setAdding(false)} moveLeads={moveLeads} />
      {handing && moveLeads && (
        <HandoverUserDialog
          key={handing.id}
          user={handing}
          users={everyone}
          moveLeads={moveLeads}
          onClose={() => setHanding(null)}
        />
      )}
      {editing && (
        <EditUserDialog key={editing.id} user={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
