import type { ImportResult, ImportRow } from '@logic/leads/importRows'
import type { CallStats, Lead, LeadsQuery, Performance, LeadsResponse, LeadWriteInput, LeadWriteResponse } from '@logic/leads/leadTypes'
import { isTerminalStatus } from '@logic/rules/statuses'
import { handoverPlan } from '@logic/rules/transfer'
import { call } from '@shared/lib/backend'
import { enqueue, type Job } from '@shared/lib/outbox'

export const fetchLeads = (query: LeadsQuery) => call<LeadsResponse>('listLeads', query)

export const fetchPerformance = () => call<Performance>('performance')

export const queueCall = (leadId: string) => enqueue('logCall', leadId)

export const queueLeadUpdate = (input: LeadWriteInput) => enqueue('writeLead', input)

export function withPending(leads: Lead[], jobs: Job[]): Lead[] {
  if (!jobs.length) return leads
  return leads.map((lead) =>
    jobs.reduce((next, job) => {
      const input = job.args[0] as LeadWriteInput
      const touched = (patch: Partial<Lead>) => {
        const merged = { ...next, ...patch }
        const terminal = isTerminalStatus(merged.status)
        return { ...merged, isTerminal: terminal, canAssign: next.canAssign && !terminal, untouchedDays: terminal ? null : 0 }
      }
      if (job.action === 'logCall' && job.args[0] === lead.id) return touched({})
      if (job.action === 'writeLead' && input.leadId === lead.id) return touched(input.changes ?? {})
      return next
    }, lead)
  )
}

export const fetchCallStats = () => call<CallStats>('callStats')

export const writeLead = (input: LeadWriteInput) => call<LeadWriteResponse>('writeLead', input)

export const importLeads = (rows: ImportRow[], fileName: string) => call<ImportResult>('importLeads', rows, fileName)

type NewLead = {
  name: string
  phone: string
  source: string
  status: string
  notes: string
  nextFollowUpAt: string | null
  assigneeId: string
}

export const addLead = (input: NewLead) => call<{ leadId: string }>('addLead', input)

export async function shareLeads(groups: { userId: string; leadIds: string[] }[]): Promise<number> {
  for (const group of groups) {
    await writeLead({ action: 'assign', leadIds: group.leadIds, toUserIds: [group.userId] })
  }
  return groups.length
}

export async function assignLeads(
  groups: { userId: string; leadIds: string[] }[],
  names: Map<string, string>
): Promise<{ done: number; refused: string[] }> {
  let done = 0
  const refused: string[] = []
  for (const group of groups) {
    try {
      const { results = [] } = await writeLead({ action: 'assign', leadIds: group.leadIds, toUserIds: [group.userId] })
      if (results.length === 0) done += group.leadIds.length
      for (const entry of results) {
        if (entry.ok) done += 1
        else refused.push(`${names.get(entry.leadId) ?? entry.leadId}: ${entry.error ?? 'Could not assign.'}`)
      }
    } catch (error) {
      refused.push(...group.leadIds.map((id) => `${names.get(id) ?? id}: ${(error as Error).message}`))
    }
  }
  return { done, refused }
}

export async function moveLeads(fromUserId: string, toUserId: string): Promise<number> {
  const { leads } = await fetchLeads({})
  let moved = 0
  for (const group of handoverPlan(leads, fromUserId, toUserId)) {
    await writeLead({ action: 'assign', leadIds: group.leadIds, toUserIds: group.toUserIds })
    moved += group.leadIds.length
  }
  return moved
}
