import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { ImportRow } from '@logic/leads/importRows'
import { addLead, assignLeads, importLeads, shareLeads } from '@logic/leads/leadsApi'
import { pluralize } from '@shared/lib/format'
import { queryKeys } from '@shared/lib/queryKeys'
import { toast } from '@shared/lib/toast'

export { queueLeadUpdate } from '@logic/leads/leadsApi'

export function useAddLead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: addLead,
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.leads.all })
  })
}

export function useShareLeads() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: shareLeads,
    onSuccess: (people, groups) =>
      toast(
        `${pluralize(groups.reduce((sum, group) => sum + group.leadIds.length, 0), 'lead')} shared between ${pluralize(people, 'person', 'people')}`
      ),
    onError: (error) => toast(error.message, 'error'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.leads.all })
  })
}

export function useImportLeads() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ rows, fileName }: { rows: ImportRow[]; fileName: string }) => importLeads(rows, fileName),
    onSuccess: ({ added, repeats, rejected }) =>
      toast(
        [
          `${pluralize(added, 'lead')} added`,
          repeats > 0 && `${pluralize(repeats, 'repeat')}`,
          rejected > 0 && `${rejected} without a valid phone`
        ]
          .filter(Boolean)
          .join(' · ')
      ),
    onError: (error) => toast(error.message, 'error'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.leads.all })
  })
}

export function useAssignLeads() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ groups, names }: { groups: { userId: string; leadIds: string[] }[]; names: Map<string, string> }) =>
      assignLeads(groups, names),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.leads.all })
  })
}
