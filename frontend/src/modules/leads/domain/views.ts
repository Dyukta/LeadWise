import { matchesTiming, sortByTiming } from './followUp.ts'
import { matchesRequirements, type RequirementFilters } from './requirements.ts'

type View = 'mine' | 'unassigned' | 'others' | 'all'

function matchesSearch(
  lead: { name: string; phone: string | null; project: string | null },
  search: string | undefined
): boolean {
  const needle = (search ?? '').trim().toLowerCase()
  if (!needle) return true
  return [lead.name, lead.phone, lead.project].some((field) =>
    (field ?? '').toLowerCase().includes(needle)
  )
}

type SelectableLead = {
  view: View
  project: string | null
  name: string
  phone: string | null
  configuration: string | null
  budget: number | null
  priority: string | null
  createdAt: string | null
  nextFollowUpAt: string | null
}

type LeadSelection = RequirementFilters & {
  priority?: string
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
      matchesRequirements(lead, filters) &&
      (!filters.priority || lead.priority === filters.priority) &&
      matchesTiming(lead, filters.timing, now) &&
      matchesSearch(lead, filters.search)
  )

  return sortByTiming(matched, filters.timing)
}
