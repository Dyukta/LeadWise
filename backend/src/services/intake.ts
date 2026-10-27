import { db, must, rows as allRows } from '../db.ts'
import { todayKey } from '../lib/dates.ts'
import { announceLeadsChanged } from '../realtime.ts'
import { phoneKey, priorityForPossession } from './leadRules.ts'

export type IncomingLead = {
  date?: string
  name?: string | null
  phone?: unknown
  source?: string | null
  sourceName?: string | null
  project?: string | null
  budget?: number | string | null
  configuration?: string | null
  possession?: string | null
  campaign?: string | null
  metaId?: string | null
  at?: string
}

export type Actor = { id: string | null; name: string }

export const clean = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null)

export async function addLeads(incoming: IncomingLead[], by: Actor) {
  const keys = [...new Set(incoming.map((row) => phoneKey(row.phone)))]
  const taken = new Map<string, string>()
  for (let i = 0; i < keys.length; i += 200) {
    for (const row of allRows(await db.from('leads').select('id, phone_key').in('phone_key', keys.slice(i, i + 200)))) {
      taken.set(row.phone_key as string, row.id as string)
    }
  }

  const today = todayKey()
  const now = new Date().toISOString()
  const fresh: Record<string, unknown>[] = []
  const repeats: Record<string, unknown>[] = []
  const existing: string[] = []

  for (const row of incoming) {
    const key = phoneKey(row.phone)
    const at = row.at ?? now
    const reason = `From ${row.campaign ?? row.sourceName ?? row.source ?? by.name}`
    const known = taken.get(key)
    if (known) {
      existing.push(String(row.phone).trim())
      if (known !== 'new') repeats.push({ lead_id: known, at, event: 'repeat', by_id: by.id, by_name: by.name, reason })
      continue
    }
    taken.set(key, 'new')

    const budget = row.budget === '' || row.budget == null ? null : Number(row.budget)
    const possession = clean(row.possession)
    fresh.push({
      lead_date: row.date || (row.at ? todayKey(new Date(row.at)) : today),
      name: clean(row.name) ?? 'Unknown',
      phone: clean(String(row.phone ?? '')),
      phone_key: key,
      source: clean(row.source),
      source_name: clean(row.sourceName),
      project: clean(row.project),
      possession,
      budget: budget !== null && Number.isFinite(budget) ? budget : null,
      configuration: clean(row.configuration),
      campaign: clean(row.campaign),
      meta_id: row.metaId ?? null,
      status: 'new',
      priority: priorityForPossession(possession),
      created_by: by.name,
      created_at: at,
      updated_at: at
    })
  }

  const added = fresh.length > 0 ? allRows(await db.from('leads').insert(fresh).select('id, created_at, campaign, source_name, source')) : []
  const events = [
    ...added.map((lead) => ({
      lead_id: lead.id,
      at: lead.created_at,
      event: 'created',
      by_id: by.id,
      by_name: by.name,
      reason: lead.campaign ? `From ${lead.campaign}` : null
    })),
    ...repeats
  ]
  if (events.length > 0) must(await db.from('lead_events').insert(events))
  if (events.length > 0) void announceLeadsChanged()

  return {
    added: added.length,
    existing,
    months: [...new Set(fresh.map((row) => String(row.lead_date).slice(0, 7)))]
  }
}
