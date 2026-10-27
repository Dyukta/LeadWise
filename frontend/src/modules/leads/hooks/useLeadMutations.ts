import { useMutation, useQueryClient } from '@tanstack/react-query'

import { createLeads, importLeads, logCall, writeLead } from '@modules/leads/api/leadsApi'
import type { LeadWriteInput, NewLead } from '@modules/leads/api/leadTypes'
import { holdPending, phoneKey, prunePending } from '@modules/leads/hooks/pendingLeads'
import { useSession } from '@platform/auth/hooks/useSession'
import { pluralize } from '@shared/lib/format'
import { queryKeys } from '@shared/lib/queryKeys'
import { toast } from '@shared/lib/toast'

const RECONCILE_CHECKS = [2_000, 5_000, 10_000, 30_000]

const done: Record<string, string> = {
  update: 'Lead updated',
  assign: 'Lead assigned',
  take: 'Lead is yours',
  handover: 'Lead handed over',
  delete: 'Lead deleted'
}

export function useWriteLead(options?: { silent?: boolean }) {
  const { session } = useSession()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: Omit<LeadWriteInput, 'by'>) => {
      if (!session) throw new Error('You are signed out. Sign in again to save this change.')
      return writeLead({
        ...input,
        by: { id: session.userId, name: session.fullName, role: session.role }
      })
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.leads.all })
    },
    onSuccess: (_result, input) => {
      if (options?.silent) return
      toast(done[input.action] ?? 'Saved')
    }
  })
}

export function useCreateLeads() {
  const { session } = useSession()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (rows: NewLead[]) => {
      if (!session) throw new Error('You are signed out. Sign in again to save these leads.')
      return createLeads(rows, session.fullName || session.email)
    },
    onMutate: (rows) => {
      holdPending(rows)
    },
    onError: (error, rows) => {
      prunePending(new Set(rows.map((row) => phoneKey(row.phone))))
      toast((error as Error).message, 'error')
    },
    onSuccess: (result) => {
      prunePending(new Set(result.existing.map(phoneKey)))
      const refresh = () => void queryClient.invalidateQueries({ queryKey: queryKeys.leads.all })
      refresh()
      for (const delay of RECONCILE_CHECKS) setTimeout(refresh, delay)
      const saved = `${pluralize(result.added, 'lead')} saved`
      toast(
        result.existing.length === 0
          ? saved
          : `${saved}. Already in the CRM, not changed: ${result.existing.join(', ')}`,
        result.added === 0 && result.existing.length > 0 ? 'error' : 'success'
      )
    }
  })
}

export function useImportLeads() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: importLeads,
    onError: (error) => toast((error as Error).message, 'error'),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.leads.all })
      toast(
        `${pluralize(result.added, 'lead')} added${result.existing ? `, ${result.existing} already in the CRM` : ''}`,
        result.added === 0 ? 'error' : 'success'
      )
    }
  })
}

export function useLogCall() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: logCall,
    onError: (error) => toast((error as Error).message, 'error'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.calls })
      void queryClient.invalidateQueries({ queryKey: queryKeys.leads.all })
    }
  })
}
