import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { fetchLeads, withPending } from '@logic/leads/leadsApi'
import type { LeadFilters, LeadsQuery, LeadsResponse, LeadsView } from '@logic/leads/leadTypes'
import { selectLeads } from '@logic/rules/views'
import { todayKey } from '@shared/lib/date'
import { useOutbox } from '@shared/lib/outbox'
import { queryKeys } from '@shared/lib/queryKeys'
import { readCachedLeads, writeCachedLeads } from '@shared/lib/sessionCache'

const NO_FILTERS: LeadFilters = {}

export function useLeads(
  view: LeadsView,
  filters: LeadFilters = NO_FILTERS,
  query: LeadsQuery = {}
) {
  const { from, to } = query
  const fetched = from && to ? {} : query
  const result = useQuery({
    queryKey: queryKeys.leads.list(fetched),
    queryFn: async () => {
      const data = await fetchLeads(fetched)
      writeCachedLeads(fetched, data)
      return data
    },
    initialData: () => readCachedLeads<LeadsResponse>(fetched),
    initialDataUpdatedAt: 0,
    refetchInterval: 2 * 60_000
  })

  const pending = useOutbox()
  const fetchedLeads = result.data?.leads
  const all = useMemo(() => withPending(fetchedLeads ?? [], pending), [fetchedLeads, pending])
  const leads = useMemo(() => {
    const inRange = all.filter((lead) => {
      if (!from || !to || !lead.createdAt) return !from || !to
      const day = todayKey(new Date(lead.createdAt))
      return day >= from && day <= to
    })
    return selectLeads(inRange, view, filters)
  }, [all, view, filters, from, to])

  return {
    ...result,
    data: result.data && { ...result.data, leads: all },
    leads,
    roster: result.data?.roster ?? [],
    months: result.data?.months ?? [],
    syncedAt: result.data?.syncedAt ?? null
  }
}
