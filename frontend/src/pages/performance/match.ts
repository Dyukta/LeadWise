import type { CallLog } from '@logic/leads/leadTypes'
import { inPeriod, type Period } from '@logic/rules/performance'
import { todayKey } from '@shared/lib/date'

export type Filters = { search: string; person: string; source: string; campaign: string }

export const NO_FILTERS: Filters = { search: '', person: '', source: '', campaign: '' }

export const sourceOf = (lead: { source: string | null }) => lead.source ?? 'Unknown'

export const campaignOf = (lead: { campaign?: string | null }) => lead.campaign ?? 'No campaign'

export const lostReasonOf = (lead: { lostReason?: string | null }) => lead.lostReason || 'No reason given'

export const isLost = (lead: { status: string }) => lead.status === 'lost'

export const dayOf =(call: CallLog) => todayKey(new Date(call.at))

export function matchesCall(call: CallLog, filters: Filters, period: Period, fields: (string | null | undefined)[]) {
  const needle = filters.search.trim().toLowerCase()
  return (
    inPeriod(dayOf(call), period) &&
    (!filters.person || call.userId === filters.person) &&
    (!filters.source || call.source === filters.source) &&
    (!filters.campaign || call.campaign === filters.campaign) &&
    (!needle || fields.some((field) => (field ?? '').toLowerCase().includes(needle)))
  )
}
