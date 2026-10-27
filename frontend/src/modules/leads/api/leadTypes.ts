import type { LeadAssignee } from '@modules/leads/domain/transfer'

export type { LeadAssignee }

export type LeadStatus = string

export type CallLog = {
  at: string
  leadId: string
  leadName: string
  leadPhone: string | null
  project: string | null
  campaign: string | null
  userId: string | null
  userName: string | null
}

export type CallsResponse = {
  ok: boolean
  error?: string
  calls: CallLog[]
  people: { id: string; name: string }[]
}

export type LeadHandover = {
  at: string | null
  assigneeId: string | null
  assigneeName: string | null
  byName: string | null
  reason: string | null
}

export type LeadEvent = {
  at: string | null
  event: 'created' | 'assigned' | 'updated' | 'deleted' | string
  field: string | null
  from: string | null
  to: string | null
  by: string | null
  reason: string | null
}

export type Lead = {
  id: string
  pending?: true
  month: string
  name: string
  phone: string | null
  source: string | null
  sourceName: string | null
  campaign?: string | null
  project: string | null
  possession: string | null
  budget: number | null
  configuration: string | null
  status: LeadStatus
  isTerminal: boolean
  view: LeadsView
  canEdit: boolean
  canAssign: boolean
  priority: string | null
  nextFollowUpAt: string | null
  assignees: LeadAssignee[]
  lostReason: string | null
  notes: string | null
  previousLeadId: string | null
  untouchedDays: number | null
  history: LeadHandover[]
  events: LeadEvent[]
  createdAt: string | null
  updatedAt: string | null
}

export type RosterMember = {
  id: string
  name: string
  role: 'owner' | 'employee' | string
  projects: number
}

export type LeadsResponse = {
  ok: boolean
  error?: string
  leads: Lead[]
  roster: RosterMember[]
  months: string[]
  count: number
  viewer: { id: string; name: string; role: 'owner' | 'employee' }
}

export type LeadsView = 'mine' | 'unassigned' | 'others' | 'all'

export type LeadsQuery = {
  month?: string
  from?: string
  to?: string
}

export type LeadFilters = {
  budgetBand?: string
  configuration?: string
  project?: string
  priority?: string
  timing?: string
  search?: string
}

export type LeadActor = {
  id: string
  name: string
  role: 'owner' | 'employee'
}

export type NewLead = {
  date: string
  name: string
  phone: string
  source: string
  sourceName: string
  project: string
  budget: string
  configuration: string
  possession: string
}

export type LeadsSyncResponse = {
  ok: boolean
  error?: string | null
  added: number
  existing: string[]
  months?: string[]
}

export type LeadWriteAction = 'update' | 'assign' | 'take' | 'handover' | 'delete'

export type LeadWriteInput = {
  action: LeadWriteAction
  leadId?: string
  leadIds?: string[]
  by: LeadActor
  reason?: string
  toUserIds?: string[]
  toUserNames?: string[]
  changes?: Partial<{
    name: string
    source: string
    sourceName: string
    project: string
    budget: number | null
    configuration: string
    possession: string
    status: LeadStatus
    priority: 'high' | 'medium' | 'low'
    nextFollowUpAt: string | null
    notes: string
    lostReason: string
  }>
}

export type LeadWriteResult = {
  leadId: string
  ok: boolean
  noop?: boolean
  error?: string
}

export type LeadWriteResponse =
  | {
      ok: true
      noop?: boolean
      message?: string
      lead?: Partial<Lead>
      logged?: number
      results?: LeadWriteResult[]
    }
  | { ok: false; error: string }
