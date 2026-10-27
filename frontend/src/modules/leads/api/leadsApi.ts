import type { CallsResponse, LeadsQuery, LeadsResponse, LeadsSyncResponse, LeadWriteInput, LeadWriteResponse, NewLead } from '@modules/leads/api/leadTypes'
import { endpoints, http, unwrap } from '@shared/lib/http'

export function fetchLeads(query: LeadsQuery, signal?: AbortSignal): Promise<LeadsResponse> {
  return http
    .post<LeadsResponse>(endpoints.leads, query, signal)
    .then((payload) => unwrap(payload))
}

export async function createLeads(rows: NewLead[], by: string): Promise<LeadsSyncResponse> {
  const payload = await http.post<LeadsSyncResponse>(endpoints.leadsSync, {
    by,
    add: rows.map((row) => ({ ...row, budget: row.budget.trim() === '' ? '' : Number(row.budget) }))
  })
  return unwrap(payload)
}

export async function importLeads(rows: Partial<NewLead>[]): Promise<{ added: number; existing: number }> {
  let added = 0
  let existing = 0
  for (let i = 0; i < rows.length; i += 500) {
    const result = unwrap(await http.post<LeadsSyncResponse>(endpoints.leadsSync, { add: rows.slice(i, i + 500) }))
    added += result.added
    existing += result.existing.length
  }
  return { added, existing }
}

export async function writeLead(input: LeadWriteInput): Promise<LeadWriteResponse> {
  const payload = await http.post<LeadWriteResponse>(endpoints.leadWrite, input)
  return unwrap(payload)
}

export async function logCall(leadId: string): Promise<void> {
  unwrap(await http.post<{ ok: boolean; error?: string }>(endpoints.leadCall, { leadId }))
}

export async function fetchCalls(signal?: AbortSignal): Promise<CallsResponse> {
  return unwrap(await http.post<CallsResponse>(endpoints.calls, {}, signal))
}
