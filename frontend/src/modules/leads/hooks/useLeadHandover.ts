import { fetchLeads } from '@modules/leads/api/leadsApi'
import { handoverPlan } from '@modules/leads/domain/transfer'
import { useWriteLead } from '@modules/leads/hooks/useLeadMutations'
import type { MoveLeads } from '@platform/users/api/userTypes'

export function useLeadHandover(): MoveLeads {
  const write = useWriteLead({ silent: true })

  return async (fromUserId, toUserId, toUserName, keepFrom = false) => {
    const { leads, roster } = await fetchLeads({})
    const plan = handoverPlan(leads, fromUserId, toUserId, keepFrom)

    const nameOf = (id: string) =>
      id === toUserId ? toUserName : (roster.find((owner) => owner.id === id)?.name ?? '')

    let moved = 0
    for (const group of plan) {
      await write.mutateAsync({
        action: 'assign',
        leadIds: group.leadIds,
        toUserIds: group.toUserIds,
        toUserNames: group.toUserIds.map(nameOf)
      })
      moved += group.leadIds.length
    }
    return moved
  }
}
