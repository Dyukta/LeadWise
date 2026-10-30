import { matchesTiming, sortByTiming } from './followUp.ts'
import type { LeadsView as View } from './session.ts'

function matchesSearch(
  lead: { name: string; phone: string | null },
  search: string | undefined
): boolean {
  const needle = (search ?? '').trim().toLowerCase()
  if (!needle) return true
  return [lead.name, lead.phone].some((field) =>
    (field ?? '').toLowerCase().includes(needle)
  )
}

type SelectableLead = {
  view: View
  name: string
  phone: string | null
  priority: string | null
  status?: string
  source?: string | null
  campaign?: string | null
  createdAt: string | null
  nextFollowUpAt: string | null
  activity?: { event: string }[]
}

type LeadSelection = {
  repeated?: string
  priority?: string
  status?: string
  source?: string
  campaign?: string
  timing?: string
  search?: string
}

export function selectLeads<T extends SelectableLead>(
  leads: T[],
  view: View,
  filters: LeadSelection,
  now: number = Date.now()
): T[] {
  const matched = leads.filter(
    (lead) =>
      (view === 'all' || lead.view === view) &&
      (!filters.repeated ||
        (filters.repeated === 'yes') ===
          !!lead.activity?.some((entry) => entry.event === 'repeat')) &&
      (!filters.priority || lead.priority === filters.priority) &&
      (!filters.status || lead.status === filters.status) &&
      (!filters.source || lead.source === filters.source) &&
      (!filters.campaign || lead.campaign === filters.campaign) &&
      matchesTiming(lead, filters.timing, now) &&
      matchesSearch(lead, filters.search)
  )

  return sortByTiming(matched, filters.timing)
}
