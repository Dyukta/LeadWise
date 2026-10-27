import { Router } from 'express'

import { requireOwner, viewerOf, type Viewer } from '../auth.ts'
import { db, must, rows as allRows, selectAll } from '../db.ts'
import { isIsoDate, isPeriod, todayKey, wholeDaysSince } from '../lib/dates.ts'
import { badRequest, forbidden, isRecord, isUuid, notFound, route, strings } from '../lib/errors.ts'
import { announceLeadsChanged } from '../realtime.ts'
import { addLeads, clean, type IncomingLead } from '../services/intake.ts'
import { isLeadStatus, isPriority, isTerminalStatus, phoneKey, sameText } from '../services/leadRules.ts'
import { listPeople, type Person } from '../services/people.ts'

type LeadRow = {
  id: string
  lead_date: string
  name: string
  phone: string | null
  source: string | null
  source_name: string | null
  project: string | null
  possession: string | null
  budget: number | string | null
  configuration: string | null
  status: string
  priority: string | null
  next_follow_up_at: string | null
  assignee_ids: string[]
  lost_reason: string | null
  notes: string | null
  previous_lead_id: string | null
  campaign: string | null
  created_at: string
  updated_at: string
  touched_at: string | null
}

type EventRow = {
  lead_id: string
  at: string
  event: string
  field: string | null
  from_value: string | null
  to_value: string | null
  by_name: string | null
  reason: string | null
  assignee_ids: string[] | null
  assignee_names: string | null
}

export const leadsRouter = Router()

leadsRouter.post(
  '/list',
  route(async (req, res) => {
    const viewer = viewerOf(res)
    const query = (req.body ?? {}) as { month?: string; from?: string; to?: string }

    const [rows, events, people, memberships] = await Promise.all([
      selectAll<LeadRow>((from, to) =>
        db.from('leads').select('*').order('lead_date', { ascending: false }).order('created_at', { ascending: false }).range(from, to)
      ),
      selectAll<EventRow>((from, to) =>
        db.from('lead_events').select('*').order('at').order('id').range(from, to)
      ),
      listPeople(),
      selectAll<{ project_id: string; user_id: string; projects: { name: string; active: boolean } | null }>(
        (from, to) => db.from('project_members').select('project_id, user_id, projects(name, active)').range(from, to)
      )
    ])

    const names = new Map(people.map((person) => [person.id, person.name]))
    const myProjects = memberships
      .filter((row) => row.user_id === viewer.id && row.projects?.active)
      .map((row) => row.projects!.name)

    const visible = rows.filter((row) => canSee(row, viewer, myProjects))

    const inRange = visible.filter((row) => {
      if (isPeriod(query.month)) return row.lead_date.startsWith(query.month)
      if (isIsoDate(query.from) && row.lead_date < query.from) return false
      if (isIsoDate(query.to) && row.lead_date > query.to) return false
      return true
    })

    const eventsByLead = new Map<string, EventRow[]>()
    for (const event of events) {
      const list = eventsByLead.get(event.lead_id)
      if (list) list.push(event)
      else eventsByLead.set(event.lead_id, [event])
    }

    const projectCount = new Map<string, number>()
    for (const row of memberships) {
      if (row.projects?.active) projectCount.set(row.user_id, (projectCount.get(row.user_id) ?? 0) + 1)
    }

    const now = Date.now()
    const leads = inRange.map((row) => toLead(row, eventsByLead.get(row.id) ?? [], viewer, names, now))

    return {
      ok: true,
      leads,
      count: leads.length,
      months: [...new Set(visible.map((row) => row.lead_date.slice(0, 7)))].sort().reverse(),
      roster: people
        .filter((person) => person.active)
        .map((person) => ({
          id: person.id,
          name: person.name,
          role: person.role,
          projects: projectCount.get(person.id) ?? 0
        })),
      viewer: { id: viewer.id, name: viewer.name, role: viewer.role }
    }
  })
)

function canSee(row: LeadRow, viewer: Viewer, myProjects: string[]): boolean {
  if (viewer.role === 'owner') return true
  if (row.assignee_ids.includes(viewer.id)) return true
  if (row.assignee_ids.length > 0) return false
  return !row.project || myProjects.some((name) => sameText(name, row.project))
}

function toLead(
  row: LeadRow,
  events: EventRow[],
  viewer: Viewer,
  names: Map<string, string>,
  now: number
) {
  const mine = row.assignee_ids.includes(viewer.id)
  const owner = viewer.role === 'owner'
  const terminal = isTerminalStatus(row.status)
  const view = mine ? 'mine' : row.assignee_ids.length === 0 ? 'unassigned' : 'others'

  return {
    id: row.id,
    month: row.lead_date.slice(0, 7),
    name: row.name,
    phone: row.phone,
    source: row.source,
    sourceName: row.source_name,
    campaign: row.campaign,
    project: row.project,
    possession: row.possession,
    budget: row.budget === null ? null : Number(row.budget),
    configuration: row.configuration,
    status: row.status,
    isTerminal: terminal,
    view,
    canEdit: owner || mine,
    canAssign: !terminal && (owner || mine || view === 'unassigned'),
    priority: row.priority,
    nextFollowUpAt: row.next_follow_up_at,
    assignees: row.assignee_ids.map((id) => ({ id, name: names.get(id) ?? 'Former user' })),
    lostReason: row.lost_reason,
    notes: row.notes,
    previousLeadId: row.previous_lead_id,
    untouchedDays: terminal ? null : wholeDaysSince(row.touched_at ?? row.created_at, now),
    history: events
      .filter((event) => event.event === 'assigned')
      .map((event) => ({
        at: event.at,
        assigneeId: event.assignee_ids?.[0] ?? null,
        assigneeName: event.assignee_names,
        byName: event.by_name,
        reason: event.reason
      })),
    events: events.map((event) => ({
      at: event.at,
      event: event.event,
      field: event.field,
      from: event.from_value,
      to: event.to_value,
      by: event.by_name,
      reason: event.reason
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

leadsRouter.post(
  '/import',
  route(async (req, res) => {
    const viewer = viewerOf(res)
    const body = ((req.body ?? {}) as { add?: unknown }).add
    if (!Array.isArray(body) || body.length === 0) throw badRequest('Add at least one lead.')
    if (body.length > 500) throw badRequest('Add at most 500 leads at a time.')
    if (!body.every(isRecord)) throw badRequest('Every row must be a lead.')
    const add = (body as IncomingLead[]).map(({ metaId: _metaId, at: _at, ...row }) => row)

    const today = todayKey()
    for (const [index, row] of add.entries()) {
      if (!clean(row.name)) throw badRequest(`Row ${index + 1} needs a name.`)
      if (phoneKey(row.phone).length < 6) throw badRequest(`Row ${index + 1} needs a phone number.`)
      if (row.date && (!isIsoDate(row.date) || row.date > today)) {
        throw badRequest(`Row ${index + 1} has a date that is not valid.`)
      }
    }

    return { ok: true, ...(await addLeads(add, viewer)) }
  })
)

leadsRouter.post(
  '/call',
  route(async (req, res) => {
    const viewer = viewerOf(res)
    const leadId = (req.body ?? {}).leadId
    if (!isUuid(leadId)) throw badRequest('Pick a lead first.')

    const [lead] = await loadLeads([leadId])
    if (!lead || !canSee(lead, viewer, await myProjectNames(viewer.id))) throw notFound('That lead no longer exists.')

    const now = new Date().toISOString()
    must(await db.from('leads').update({ touched_at: now }).eq('id', lead.id))
    must(
      await db.from('lead_events').insert({
        lead_id: lead.id,
        at: now,
        event: 'call',
        by_id: viewer.id,
        by_name: viewer.name,
        assignee_ids: [viewer.id]
      })
    )
    void announceLeadsChanged()
    return { ok: true }
  })
)

leadsRouter.post(
  '/calls',
  route(async (_req, res) => {
    const viewer = viewerOf(res)
    const owner = viewer.role === 'owner'

    const [calls, people] = await Promise.all([
      selectAll<{ at: string; lead_id: string; by_id: string | null; by_name: string | null }>((from, to) => {
        const query = db.from('lead_events').select('at, lead_id, by_id, by_name').eq('event', 'call')
        return (owner ? query : query.eq('by_id', viewer.id)).order('at', { ascending: false }).range(from, to)
      }),
      listPeople()
    ])

    const leadIds = [...new Set(calls.map((call) => call.lead_id))]
    const leads = new Map((await loadLeads(leadIds)).map((lead) => [lead.id, lead]))

    return {
      ok: true,
      calls: calls.map((call) => {
        const lead = leads.get(call.lead_id)
        return {
          at: call.at,
          leadId: call.lead_id,
          leadName: lead?.name ?? 'Deleted lead',
          leadPhone: lead?.phone ?? null,
          project: lead?.project ?? null,
          campaign: lead?.campaign ?? null,
          userId: call.by_id,
          userName: call.by_name
        }
      }),
      people: owner ? people.filter((person) => person.active).map((person) => ({ id: person.id, name: person.name })) : []
    }
  })
)

async function myProjectNames(userId: string): Promise<string[]> {
  const rows = allRows(
    await db.from('project_members').select('projects(name, active)').eq('user_id', userId)
  ) as unknown as { projects: { name: string; active: boolean } | null }[]
  return rows.filter((row) => row.projects?.active).map((row) => row.projects!.name)
}

type WriteInput = {
  action?: 'update' | 'assign' | 'take' | 'handover' | 'delete'
  leadId?: unknown
  leadIds?: unknown
  reason?: string
  toUserIds?: unknown
  changes?: unknown
}

type Result = { leadId: string; ok: boolean; noop?: boolean; error?: string }

leadsRouter.post(
  '/write',
  route(async (req, res) => {
    const viewer = viewerOf(res)
    const input = (req.body ?? {}) as WriteInput
    const reason = clean(input.reason)

    const ids = [...new Set([...strings(input.leadIds), ...strings([input.leadId])])].filter(isUuid)
    if (ids.length === 0) throw badRequest('Pick a lead first.')
    const toUserIds = strings(input.toUserIds)

    const leads = await loadLeads(ids)
    if (leads.length === 0) throw notFound('That lead no longer exists.')

    let response: Record<string, unknown>
    switch (input.action) {
      case 'update':
        response = await updateLead(leads[0]!, isRecord(input.changes) ? input.changes : {}, reason, viewer)
        break
      case 'assign':
        response = await assignLeads(leads, toUserIds, reason, viewer, 'replace')
        break
      case 'take':
        response = await assignLeads(leads, [viewer.id], reason ?? 'Picked up', viewer, 'replace')
        break
      case 'handover':
        response = await assignLeads(leads, toUserIds, reason, viewer, 'handover')
        break
      case 'delete':
        requireOwner(viewer)
        must(await db.from('leads').delete().in('id', leads.map((lead) => lead.id)))
        response = { ok: true, results: leads.map((lead) => ({ leadId: lead.id, ok: true })) }
        break
      default:
        throw badRequest('Unknown action.')
    }

    if (!response.noop) void announceLeadsChanged()
    return response
  })
)

async function loadLeads(ids: string[]): Promise<LeadRow[]> {
  const rows: LeadRow[] = []
  for (let i = 0; i < ids.length; i += 100) {
    rows.push(...allRows(await db.from('leads').select('*').in('id', ids.slice(i, i + 100))))
  }
  return rows
}

const EDITABLE: Record<string, keyof LeadRow> = {
  name: 'name',
  source: 'source',
  sourceName: 'source_name',
  project: 'project',
  budget: 'budget',
  configuration: 'configuration',
  possession: 'possession',
  status: 'status',
  priority: 'priority',
  nextFollowUpAt: 'next_follow_up_at',
  notes: 'notes',
  lostReason: 'lost_reason'
}

function normalizeChange(field: string, value: unknown): unknown {
  if (field === 'budget') {
    if (value === null || value === '') return null
    const budget = Number(value)
    if (!Number.isFinite(budget) || budget < 0) throw badRequest('Budget must be a number.')
    return budget
  }
  if (field === 'status') {
    if (!isLeadStatus(value)) throw badRequest('Pick a valid status.')
    return value
  }
  if (field === 'priority') {
    if (!isPriority(value)) throw badRequest('Pick a valid priority.')
    return value
  }
  if (field === 'nextFollowUpAt') {
    if (value === null || value === '') return null
    if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
      throw badRequest('The follow up date is not valid.')
    }
    return new Date(value).toISOString()
  }
  if (field === 'name') {
    const name = clean(value)
    if (!name) throw badRequest('The lead needs a name.')
    return name
  }
  return clean(value)
}

const asText = (value: unknown) => (value === null || value === undefined ? null : String(value))

function sameValue(field: string, a: unknown, b: unknown): boolean {
  if (field === 'budget') return (a === null ? null : Number(a)) === (b === null ? null : Number(b))
  if (field === 'nextFollowUpAt') {
    return (a ? Date.parse(String(a)) : null) === (b ? Date.parse(String(b)) : null)
  }
  return asText(a) === asText(b)
}

async function updateLead(
  lead: LeadRow,
  changes: Record<string, unknown>,
  reason: string | null,
  viewer: Viewer
) {
  if (viewer.role !== 'owner' && !lead.assignee_ids.includes(viewer.id)) {
    throw forbidden('Only the people handling this lead can change it.')
  }

  const patch: Record<string, unknown> = {}
  const events: Record<string, unknown>[] = []

  for (const [field, raw] of Object.entries(changes)) {
    const column = EDITABLE[field]
    if (!column) continue
    const value = normalizeChange(field, raw)
    if (sameValue(field, lead[column], value)) continue

    patch[column] = value
    events.push({
      lead_id: lead.id,
      event: 'updated',
      field,
      from_value: asText(lead[column]),
      to_value: asText(value),
      by_id: viewer.id,
      by_name: viewer.name,
      reason
    })
  }

  const nextStatus = (patch.status as string | undefined) ?? lead.status
  const nextLostReason = patch.lost_reason !== undefined ? patch.lost_reason : lead.lost_reason
  if (nextStatus === 'lost' && !nextLostReason) throw badRequest('Say why the lead was lost.')

  if (events.length === 0) return { ok: true, noop: true, message: 'Nothing changed.' }

  const now = new Date().toISOString()
  must(await db.from('leads').update({ ...patch, updated_at: now, touched_at: now }).eq('id', lead.id))
  must(await db.from('lead_events').insert(events))

  return { ok: true, logged: events.length }
}

async function assignLeads(
  leads: LeadRow[],
  toUserIds: string[],
  reason: string | null,
  viewer: Viewer,
  mode: 'replace' | 'handover'
) {
  const people = await listPeople()
  const active = new Map<string, Person>(
    people.filter((person) => person.active).map((person) => [person.id, person])
  )

  const targets = [...new Set(toUserIds)]
  if (targets.length === 0) throw badRequest('Pick at least one person to handle this lead.')
  const unknown = targets.find((id) => !active.has(id))
  if (unknown) throw badRequest('One of those people no longer has access.')

  const results: Result[] = []
  const groups = new Map<string, { ids: string[]; leadIds: string[] }>()

  for (const lead of leads) {
    const mine = lead.assignee_ids.includes(viewer.id)
    const unassigned = lead.assignee_ids.length === 0

    if (viewer.role !== 'owner' && !mine && !unassigned) {
      results.push({ leadId: lead.id, ok: false, error: 'Someone else is handling this lead.' })
      continue
    }
    if (isTerminalStatus(lead.status)) {
      results.push({ leadId: lead.id, ok: false, error: 'Closed leads cannot be reassigned.' })
      continue
    }

    const next =
      mode === 'handover'
        ? [...new Set([...lead.assignee_ids.filter((id) => id !== viewer.id), ...targets])]
        : targets

    const same =
      next.length === lead.assignee_ids.length && next.every((id) => lead.assignee_ids.includes(id))
    if (same) {
      results.push({ leadId: lead.id, ok: true, noop: true })
      continue
    }

    const key = [...next].sort().join(',')
    const group = groups.get(key)
    if (group) group.leadIds.push(lead.id)
    else groups.set(key, { ids: next, leadIds: [lead.id] })
    results.push({ leadId: lead.id, ok: true })
  }

  const now = new Date().toISOString()
  for (const group of groups.values()) {
    must(
      await db
        .from('leads')
        .update({ assignee_ids: group.ids, updated_at: now, touched_at: now })
        .in('id', group.leadIds)
    )
    const assigneeNames = group.ids.map((id) => active.get(id)!.name).join(', ')
    must(
      await db.from('lead_events').insert(
        group.leadIds.map((leadId) => ({
          lead_id: leadId,
          event: 'assigned',
          to_value: assigneeNames,
          assignee_ids: group.ids,
          assignee_names: assigneeNames,
          by_id: viewer.id,
          by_name: viewer.name,
          reason
        }))
      )
    )
  }

  if (leads.length === 1 && results[0] && !results[0].ok) throw badRequest(results[0].error!)

  const changed = results.filter((result) => result.ok && !result.noop).length
  return { ok: true, noop: changed === 0, results }
}
