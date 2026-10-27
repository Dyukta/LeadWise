import { Router } from 'express'

import { config } from '../config.ts'
import { db, must, rows, selectAll } from '../db.ts'
import { todayKey } from '../lib/dates.ts'
import { isRecord, strings } from '../lib/errors.ts'
import { addLeads, clean } from '../services/intake.ts'
import { isLeadStatus, isTerminalStatus, phoneKey, sameText } from '../services/leadRules.ts'

// The frontend is Lead DGC's, which talks to one endpoint: { action, args, token } in,
// { ok, data } or { ok: false, error } out. Each action mirrors Lead DGC's Apps Script.

type Viewer = { id: string; email: string; name: string; role: 'owner' | 'employee' }

type UserRow = { id: string; email: string; full_name: string; role: string; active: boolean }
type ProjectRow = { id: string; name: string; active: boolean; member_ids: string[] }
type LeadRow = {
  id: string
  lead_date: string
  name: string
  phone: string | null
  source: string | null
  source_name: string | null
  project: string | null
  possession: string | null
  status: string
  priority: string | null
  next_follow_up_at: string | null
  assignee_ids: string[]
  lost_reason: string | null
  notes: string | null
  amount: number | string | null
  campaign: string | null
  meta_id: string | null
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
  by_id: string | null
  by_name: string | null
  reason: string | null
  assignee_ids: string[] | null
}
type NewEvent = Omit<EventRow, 'from_value' | 'to_value'> & { from_value?: string | null; to_value?: string | null }

const DAY = 86_400_000
const SESSION_EXPIRED = 'Your session has expired. Sign in again.'

// Lead DGC field name -> leads column.
const EDITABLE: Record<string, keyof LeadRow> = {
  name: 'name',
  source: 'source',
  sourceName: 'source_name',
  project: 'project',
  possession: 'possession',
  status: 'status',
  priority: 'priority',
  nextFollowUpAt: 'next_follow_up_at',
  notes: 'notes',
  lostReason: 'lost_reason',
  amount: 'amount'
}

const asText = (value: unknown) => (value === null || value === undefined ? null : String(value))

function sameValue(field: string, a: unknown, b: unknown): boolean {
  if (field === 'nextFollowUpAt') return (a ? Date.parse(String(a)) : null) === (b ? Date.parse(String(b)) : null)
  if (field === 'amount') return (a === null ? null : Number(a)) === (b === null ? null : Number(b))
  return asText(a) === asText(b)
}

const allUsers = async () => rows<UserRow>(await db.from('users').select('id, email, full_name, role, active'))
const allProjects = async () => rows<ProjectRow>(await db.from('projects').select('id, name, active, member_ids').order('name'))
const allLeads = () => selectAll<LeadRow>((a, b) => db.from('leads').select('*').range(a, b))
const allEvents = () => selectAll<EventRow>((a, b) => db.from('lead_events').select('*').order('at').order('id').range(a, b))

async function leadsById(ids: string[]): Promise<LeadRow[]> {
  const found: LeadRow[] = []
  for (let i = 0; i < ids.length; i += 100) found.push(...rows<LeadRow>(await db.from('leads').select('*').in('id', ids.slice(i, i + 100))))
  return found
}

async function sessionOf(token: unknown): Promise<Viewer | null> {
  if (typeof token !== 'string' || !token) return null
  const { data, error } = await db.auth.getClaims(token)
  const userId = data?.claims?.sub
  if (error || !userId) return null
  const user = must(await db.from('users').select('id, email, full_name, role, active').eq('id', userId).maybeSingle()) as UserRow | null
  if (!user?.active) return null
  return { id: user.id, email: user.email, name: user.full_name || user.email, role: user.role === 'owner' ? 'owner' : 'employee' }
}

const projectNamesOf = (projects: ProjectRow[], me: Viewer) =>
  projects.filter((p) => p.active && p.member_ids.includes(me.id)).map((p) => p.name)

function canSee(row: LeadRow, me: Viewer, myProjects: string[]): boolean {
  if (me.role === 'owner') return true
  if (row.assignee_ids.includes(me.id)) return true
  if (row.assignee_ids.length > 0) return false
  return !row.project || myProjects.some((name) => sameText(name, row.project))
}

function campaignOf(events: EventRow[]): string | null {
  const created = events.find((event) => event.event === 'created' && event.by_name === 'Meta')
  return created?.reason ? created.reason.replace(/^From /, '') : null
}

function toLead(row: LeadRow, events: EventRow[], me: Viewer, names: Map<string, string>, now: number) {
  const mine = row.assignee_ids.includes(me.id)
  const owner = me.role === 'owner'
  const terminal = isTerminalStatus(row.status)
  const view = mine ? 'mine' : row.assignee_ids.length === 0 ? 'unassigned' : 'others'
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    source: row.source,
    sourceName: row.source_name,
    campaign: row.campaign || campaignOf(events),
    project: row.project,
    possession: row.possession,
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
    amount: Number(row.amount) || null,
    untouchedDays: terminal ? null : Math.max(0, Math.floor((now - Date.parse(row.touched_at || row.created_at)) / DAY)),
    history: events
      .filter((event) => event.event === 'assigned')
      .map((event) => ({ at: event.at, assigneeId: event.assignee_ids?.[0] ?? null, assigneeName: event.to_value, byName: event.by_name, reason: event.reason })),
    activity: events
      .map((event) => ({ at: event.at, event: event.event, field: event.field, from: event.from_value, to: event.to_value, byName: event.by_name, reason: event.reason }))
      .sort((a, b) => b.at.localeCompare(a.at)),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function normalize(field: string, value: unknown): unknown {
  if (field === 'status') {
    if (!isLeadStatus(value)) throw new Error('Pick a valid status.')
    return value
  }
  if (field === 'priority') {
    if (!['high', 'medium', 'low'].includes(String(value))) throw new Error('Pick a valid priority.')
    return value
  }
  if (field === 'nextFollowUpAt') {
    if (value === null || value === '') return null
    if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) throw new Error('The follow up date is not valid.')
    return new Date(value).toISOString()
  }
  if (field === 'amount') {
    if (value === null || value === '') return null
    const amount = Number(String(value).replace(/[,\s₹]/g, ''))
    if (!(amount > 0)) throw new Error('Enter a valid deal amount.')
    return amount
  }
  if (field === 'name') {
    const name = clean(value)
    if (!name) throw new Error('The lead needs a name.')
    return name
  }
  return clean(value)
}

async function updateLead(lead: LeadRow, changes: Record<string, unknown>, reason: string | null, me: Viewer) {
  if (me.role !== 'owner' && !lead.assignee_ids.includes(me.id)) throw new Error('Only the people handling this lead can change it.')
  const patch: Partial<LeadRow> = {}
  const events: NewEvent[] = []
  const now = new Date().toISOString()
  for (const [field, column] of Object.entries(EDITABLE)) {
    if (!(field in changes)) continue
    const value = normalize(field, changes[field])
    if (sameValue(field, lead[column], value)) continue
    Object.assign(patch, { [column]: value })
    events.push({ lead_id: lead.id, at: now, event: 'updated', field, from_value: asText(lead[column]), to_value: asText(value), by_id: me.id, by_name: me.name, reason, assignee_ids: [] })
  }
  const nextStatus = patch.status ?? lead.status
  const nextLost = 'lost_reason' in patch ? patch.lost_reason : lead.lost_reason
  if (nextStatus === 'lost' && !nextLost) throw new Error('Say why the lead was lost.')
  if (nextStatus === 'closed' && !('amount' in patch ? patch.amount : lead.amount)) throw new Error('Enter the deal amount for a closed lead.')
  if (!events.length) return { noop: true }
  must(await db.from('leads').update({ ...patch, updated_at: now, touched_at: now }).eq('id', lead.id))
  must(await db.from('lead_events').insert(events))
  return {}
}

async function assignLeads(leads: LeadRow[], toUserIds: string[], reason: string | null, me: Viewer) {
  const active = new Map((await allUsers()).filter((user) => user.active).map((user) => [user.id, user]))
  const targets = [...new Set(toUserIds)]
  if (!targets.length) throw new Error('Pick at least one person to handle this lead.')
  if (targets.some((id) => !active.has(id))) throw new Error('One of those people no longer has access.')
  const results: { leadId: string; ok: boolean; noop?: boolean; error?: string }[] = []
  const events: NewEvent[] = []
  const moved: string[] = []
  const now = new Date().toISOString()
  for (const lead of leads) {
    const mine = lead.assignee_ids.includes(me.id)
    if (me.role !== 'owner' && !mine && lead.assignee_ids.length > 0) {
      results.push({ leadId: lead.id, ok: false, error: 'Someone else is handling this lead.' })
      continue
    }
    if (isTerminalStatus(lead.status)) {
      results.push({ leadId: lead.id, ok: false, error: 'Closed leads cannot be reassigned.' })
      continue
    }
    if (targets.length === lead.assignee_ids.length && targets.every((id) => lead.assignee_ids.includes(id))) {
      results.push({ leadId: lead.id, ok: true, noop: true })
      continue
    }
    moved.push(lead.id)
    const to = targets.map((id) => active.get(id)!.full_name).join(', ')
    events.push({ lead_id: lead.id, at: now, event: 'assigned', field: null, to_value: to, by_id: me.id, by_name: me.name, reason, assignee_ids: targets })
    results.push({ leadId: lead.id, ok: true })
  }
  if (leads.length === 1 && results[0] && !results[0].ok) throw new Error(results[0].error)
  for (let i = 0; i < moved.length; i += 100) {
    must(await db.from('leads').update({ assignee_ids: targets, updated_at: now, touched_at: now }).in('id', moved.slice(i, i + 100)))
  }
  if (events.length) must(await db.from('lead_events').insert(events))
  return { noop: results.every((r) => !r.ok || r.noop), results }
}

function requireOwner(me: Viewer): Viewer {
  if (me.role !== 'owner') throw new Error('Only the owner can do that.')
  return me
}

async function findAuthId(email: string): Promise<string | null> {
  for (let page = 1; ; page += 1) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(error.message)
    const match = data.users.find((user) => user.email?.toLowerCase() === email)
    if (match) return match.id
    if (data.users.length < 1000) return null
  }
}

type Api = Record<string, (me: Viewer | null, ...args: unknown[]) => Promise<unknown>>

const signedIn = (me: Viewer | null): Viewer => {
  if (!me) throw new Error(SESSION_EXPIRED)
  return me
}

const API: Api = {
  async currentSession(me) {
    return me ? { userId: me.id, email: me.email, fullName: me.name, role: me.role } : null
  },

  async performance(viewer) {
    const me = signedIn(viewer)
    const [leads, users, closes] = await Promise.all([
      allLeads(),
      allUsers(),
      selectAll<{ lead_id: string; at: string }>((a, b) =>
        db.from('lead_events').select('lead_id, at').eq('field', 'status').eq('to_value', 'closed').order('at').range(a, b)
      )
    ])
    const closedAt = new Map(closes.map((event) => [event.lead_id, event.at]))
    const totals = new Map<string, number>()
    const mine: { leadId: string; name: string; closedAt: string; amount: number }[] = []
    for (const lead of leads) {
      if (lead.status !== 'closed' || !lead.assignee_ids.length) continue
      const share = (Number(lead.amount) || 0) / lead.assignee_ids.length
      for (const id of lead.assignee_ids) totals.set(id, (totals.get(id) ?? 0) + share)
      if (lead.assignee_ids.includes(me.id)) mine.push({ leadId: lead.id, name: lead.name, closedAt: closedAt.get(lead.id) ?? lead.updated_at, amount: share })
    }
    const board = users
      .filter((user) => user.active)
      .map((user) => ({ name: user.full_name, amount: totals.get(user.id) ?? 0, you: user.id === me.id }))
      .sort((a, b) => b.amount - a.amount)
    return { mine, board }
  },

  async listLeads(viewer, rawQuery) {
    const me = signedIn(viewer)
    const query = (isRecord(rawQuery) ? rawQuery : {}) as { month?: string; from?: string; to?: string }
    const [users, projects, leads, events, sync] = await Promise.all([
      allUsers(),
      allProjects(),
      allLeads(),
      allEvents(),
      db.from('meta_sync').select('synced_at').eq('id', true).maybeSingle()
    ])
    const names = new Map(users.map((user) => [user.id, user.full_name]))
    const active = projects.filter((p) => p.active)
    const myProjects = projectNamesOf(active, me)
    const visible = leads
      .filter((row) => canSee(row, me, myProjects))
      .sort((a, b) => b.lead_date.localeCompare(a.lead_date) || b.created_at.localeCompare(a.created_at))
    const inRange = visible.filter((row) => {
      if (query.month) return row.lead_date.startsWith(query.month)
      if (query.from && row.lead_date < query.from) return false
      if (query.to && row.lead_date > query.to) return false
      return true
    })
    const byLead = new Map<string, EventRow[]>()
    for (const event of events) {
      const list = byLead.get(event.lead_id)
      if (list) list.push(event)
      else byLead.set(event.lead_id, [event])
    }
    const now = Date.now()
    return {
      leads: inRange.map((row) => toLead(row, byLead.get(row.id) ?? [], me, names, now)),
      months: [...new Set(visible.map((row) => row.lead_date.slice(0, 7)))].sort().reverse(),
      syncedAt: must(sync)?.synced_at ?? null,
      roster: users
        .filter((u) => u.active)
        .map((u) => ({ id: u.id, name: u.full_name, role: u.role, projects: active.filter((p) => p.member_ids.includes(u.id)).length }))
    }
  },

  async writeLead(viewer, rawInput) {
    const me = signedIn(viewer)
    const input = (isRecord(rawInput) ? rawInput : {}) as { action?: string; leadId?: unknown; leadIds?: unknown; changes?: unknown; toUserIds?: unknown; reason?: unknown }
    const reason = clean(input.reason)
    const ids = [...new Set([...strings(input.leadIds), ...(typeof input.leadId === 'string' ? [input.leadId] : [])])]
    if (!ids.length) throw new Error('Pick a lead first.')
    const leads = await leadsById(ids)
    if (!leads.length) throw new Error('That lead no longer exists.')
    if (input.action === 'update') return updateLead(leads[0]!, isRecord(input.changes) ? input.changes : {}, reason, me)
    if (input.action === 'assign') return assignLeads(leads, strings(input.toUserIds), reason, me)
    throw new Error('Unknown action.')
  },

  async logCall(viewer, leadId) {
    const me = signedIn(viewer)
    const [lead] = typeof leadId === 'string' ? await leadsById([leadId]) : []
    if (!lead || !canSee(lead, me, projectNamesOf(await allProjects(), me))) throw new Error('That lead no longer exists.')
    const now = new Date().toISOString()
    must(await db.from('leads').update({ touched_at: now }).eq('id', lead.id))
    must(await db.from('lead_events').insert({ lead_id: lead.id, at: now, event: 'call', by_id: me.id, by_name: me.name, assignee_ids: [me.id] }))
  },

  async callStats(viewer) {
    const me = signedIn(viewer)
    const owner = me.role === 'owner'
    const [leads, calls, users] = await Promise.all([
      allLeads(),
      selectAll<EventRow>((a, b) => {
        const query = db.from('lead_events').select('*').eq('event', 'call')
        return (owner ? query : query.contains('assignee_ids', [me.id])).order('at', { ascending: false }).range(a, b)
      }),
      owner ? allUsers() : Promise.resolve([])
    ])
    const byId = new Map(leads.map((lead) => [lead.id, lead]))
    return {
      calls: calls.map((call) => {
        const lead = byId.get(call.lead_id)
        return {
          at: call.at,
          leadId: call.lead_id,
          leadName: lead?.name ?? 'Deleted lead',
          leadPhone: lead?.phone ?? null,
          project: lead?.project ?? null,
          campaign: lead?.campaign ?? null,
          userId: call.assignee_ids?.[0] ?? null,
          userName: call.by_name
        }
      }),
      people: users.filter((u) => u.active).map((u) => ({ id: u.id, name: u.full_name }))
    }
  },

  async listProjects(viewer) {
    signedIn(viewer)
    const [projects, users] = await Promise.all([allProjects(), allUsers()])
    const names = new Map(users.map((user) => [user.id, user.full_name]))
    return projects.map((p) => ({
      id: p.id,
      name: p.name,
      active: p.active,
      memberIds: p.member_ids,
      memberNames: p.member_ids.map((id) => names.get(id) ?? 'Former user')
    }))
  },

  async writeProject(viewer, rawInput) {
    requireOwner(signedIn(viewer))
    const input = (isRecord(rawInput) ? rawInput : {}) as Record<string, unknown>
    const projects = await allProjects()

    if (input.action === 'addProject') {
      const name = clean(input.name)
      if (!name) throw new Error('Name the project.')
      if (projects.some((p) => sameText(p.name, name))) throw new Error('A project with that name already exists.')
      const created = must(await db.from('projects').insert({ name }).select('id').single())
      return { projectId: created?.id }
    }

    if (input.action === 'setUserProjects') {
      const userId = String(input.userId)
      const picked = new Set(strings(input.projectIds))
      for (const p of projects.filter((project) => project.active)) {
        const next = [...p.member_ids.filter((id) => id !== userId), ...(picked.has(p.id) ? [userId] : [])]
        if (next.length !== p.member_ids.length || next.some((id, i) => id !== p.member_ids[i])) {
          must(await db.from('projects').update({ member_ids: next }).eq('id', p.id))
        }
      }
      return {}
    }

    const project = projects.find((p) => p.id === input.projectId)
    if (!project) throw new Error('That project no longer exists.')

    if (input.action === 'deleteProject') {
      must(await db.from('projects').delete().eq('id', project.id))
      return { projectId: project.id }
    }

    if (input.action === 'setMembers') {
      must(await db.from('projects').update({ member_ids: [...new Set(strings(input.userIds))] }).eq('id', project.id))
      return { projectId: project.id }
    }

    const name = input.name === undefined ? project.name : clean(input.name)
    if (!name) throw new Error('Name the project.')
    if (name !== project.name) must(await db.from('leads').update({ project: name }).ilike('project', project.name))
    must(
      await db
        .from('projects')
        .update({ name, ...(typeof input.active === 'boolean' ? { active: input.active } : {}) })
        .eq('id', project.id)
    )
    return { projectId: project.id }
  },

  async listUsers(viewer) {
    signedIn(viewer)
    const [users, auth] = await Promise.all([allUsers(), db.auth.admin.listUsers({ page: 1, perPage: 1000 })])
    const signedInEmails = new Set(
      (auth.data?.users ?? []).filter((u) => u.last_sign_in_at).map((u) => String(u.email).toLowerCase())
    )
    return users
      .map((u) => ({
        id: u.id,
        email: u.email,
        fullName: u.full_name,
        role: u.role,
        active: u.active,
        pending: auth.error ? false : !signedInEmails.has(u.email.toLowerCase())
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
  },

  async createUser(viewer, rawInput) {
    requireOwner(signedIn(viewer))
    const input = (isRecord(rawInput) ? rawInput : {}) as { email?: unknown; fullName?: unknown; role?: unknown }
    const email = String(input.email ?? '').trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.')
    if ((await allUsers()).some((u) => sameText(u.email, email))) throw new Error('A user with that email already exists.')

    must(await db.from('allowed_emails').upsert({ email }))
    const origin = config.allowedOrigins[0]
    const invited = await db.auth.admin.inviteUserByEmail(email, origin ? { redirectTo: `${origin}/set-password` } : undefined)
    const id = invited.data?.user?.id ?? (await findAuthId(email))
    if (!id) throw new Error(invited.error?.message ?? 'Could not send the invite email.')

    must(
      await db
        .from('users')
        .upsert({ id, email, full_name: String(input.fullName ?? '').trim(), role: input.role === 'owner' ? 'owner' : 'employee', active: true })
    )
    return id
  },

  async updateUser(viewer, rawInput) {
    const me = requireOwner(signedIn(viewer))
    const input = (isRecord(rawInput) ? rawInput : {}) as { id?: unknown; fullName?: unknown; role?: unknown; active?: unknown }
    const user = must(await db.from('users').select('id').eq('id', String(input.id)).maybeSingle())
    if (!user) throw new Error('That user no longer exists.')
    if (user.id === me.id && (input.active === false || input.role === 'employee')) throw new Error('You cannot remove your own owner access.')
    const patch: Record<string, unknown> = {}
    if (input.fullName !== undefined) patch.full_name = String(input.fullName).trim()
    if (input.role !== undefined) patch.role = input.role === 'owner' ? 'owner' : 'employee'
    if (input.active !== undefined) patch.active = input.active === true
    if (Object.keys(patch).length) must(await db.from('users').update(patch).eq('id', user.id))
  },

  async deleteUser(viewer, id) {
    const me = requireOwner(signedIn(viewer))
    if (id === me.id) throw new Error('You cannot delete your own account.')
    const user = must(await db.from('users').select('id, email').eq('id', String(id)).maybeSingle())
    if (!user) return
    for (const lead of (await allLeads()).filter((row) => row.assignee_ids.includes(user.id))) {
      must(await db.from('leads').update({ assignee_ids: lead.assignee_ids.filter((uid) => uid !== user.id) }).eq('id', lead.id))
    }
    for (const p of (await allProjects()).filter((project) => project.member_ids.includes(user.id))) {
      must(await db.from('projects').update({ member_ids: p.member_ids.filter((uid) => uid !== user.id) }).eq('id', p.id))
    }
    must(await db.from('users').delete().eq('id', user.id))
    must(await db.from('allowed_emails').delete().eq('email', user.email.toLowerCase()))
  },

  async importLeads(viewer, rawRows, fileName) {
    const me = signedIn(viewer)
    if (!Array.isArray(rawRows) || !rawRows.length) throw new Error('The file has no leads.')
    if (rawRows.length > 5000) throw new Error('Upload at most 5000 leads at a time.')
    const usable = rawRows.filter(isRecord).filter((row) => phoneKey(row.phone).length === 10)
    const rejected = rawRows.length - usable.length
    let added = 0
    let repeats = 0
    const day = todayKey()
    for (let i = 0; i < usable.length; i += 500) {
      const result = await addLeads(
        usable.slice(i, i + 500).map((row) => ({ date: day, name: clean(asText(row.name)), phone: row.phone, source: me.name, sourceName: clean(fileName) })),
        { id: me.id, name: me.name }
      )
      added += result.added
      repeats += result.existing.length
    }
    return { added, repeats, rejected }
  },

  async listCampaigns(viewer) {
    signedIn(viewer)
    const [campaigns, leads] = await Promise.all([
      rows<{ id: string; name: string; platform: string; source_id: string; stopped: boolean; started_on: string }>(
        await db.from('campaigns').select('id, name, platform, source_id, stopped, started_on')
      ),
      selectAll<{ campaign: string }>((a, b) => db.from('leads').select('campaign').not('campaign', 'is', null).range(a, b))
    ])
    const counts = new Map<string, number>()
    for (const lead of leads) counts.set(lead.campaign.toLowerCase(), (counts.get(lead.campaign.toLowerCase()) ?? 0) + 1)
    return campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      platform: c.platform,
      sourceId: c.source_id,
      stopped: c.stopped,
      start: c.started_on,
      leads: counts.get(c.name.toLowerCase()) ?? 0
    }))
  },

  async listSources(viewer) {
    signedIn(viewer)
    const meta = must(await db.from('meta_sync').select('connected, error').eq('id', true).maybeSingle())
    return [{ id: 'meta', connected: meta?.connected === true, error: meta?.error ?? null }]
  },

  async setMetaConnected(viewer, on) {
    requireOwner(signedIn(viewer))
    must(await db.from('meta_sync').update({ connected: on === true }).eq('id', true))
  }
}

export const rpcRouter = Router()

// Errors come back as { ok: false } with HTTP 200, as the Lead DGC frontend expects.
rpcRouter.post('/', async (req, res) => {
  try {
    const { action, args, token } = (req.body ?? {}) as { action?: string; args?: unknown[]; token?: unknown }
    const fn = action ? API[action] : undefined
    if (!fn) throw new Error('Unknown action.')
    const data = await fn(await sessionOf(token), ...(Array.isArray(args) ? args : []))
    res.json({ ok: true, data: data ?? null })
  } catch (error) {
    res.json({ ok: false, error: (error as Error).message })
  }
})
