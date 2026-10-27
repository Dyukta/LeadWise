import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'

import { fetchCalls, fetchLeads } from '@modules/leads/api/leadsApi'
import type { LeadFilters, LeadsQuery, LeadsView } from '@modules/leads/api/leadTypes'
import { selectLeads } from '@modules/leads/domain/views'
import { phoneKey, prunePending, usePendingLeads } from '@modules/leads/hooks/pendingLeads'
import { queryKeys } from '@shared/lib/queryKeys'

const NO_FILTERS: LeadFilters = {}

export function useCalls() {
  return useQuery({ queryKey: queryKeys.calls, queryFn: ({ signal }) => fetchCalls(signal) })
}

function useLeadsData(query: LeadsQuery = {}) {
  return useQuery({
    queryKey: queryKeys.leads.list(query),
    queryFn: ({ signal }) => fetchLeads(query, signal),
    refetchInterval: 2 * 60_000
  })
}

export function useLeads(
  view: LeadsView,
  filters: LeadFilters = NO_FILTERS,
  query: LeadsQuery = {}
) {
  const result = useLeadsData(query)

  const all = result.data?.leads
  const pending = usePendingLeads()

  const landed = useMemo(
    () => new Set((all ?? []).map((lead) => phoneKey(lead.phone))),
    [all]
  )

  useEffect(() => {
    prunePending(landed)
  }, [landed])

  const leads = useMemo(
    () =>
      selectLeads(
        [...pending.filter((lead) => !landed.has(phoneKey(lead.phone))), ...(all ?? [])],
        view,
        filters
      ),
    [all, pending, landed, view, filters]
  )

  return {
    ...result,
    leads,
    roster: result.data?.roster ?? [],
    months: result.data?.months ?? []
  }
}
