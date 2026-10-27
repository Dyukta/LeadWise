import { Router } from 'express'

import { requireOwner, viewerOf, type Viewer } from '../auth.ts'
import { db, must, selectAll } from '../db.ts'
import { isIsoDate, todayKey } from '../lib/dates.ts'
import { badRequest, forbidden, isUuid, notFound, requireId, route, strings } from '../lib/errors.ts'
import { announceLeadsChanged } from '../realtime.ts'
import { listPeople } from '../services/people.ts'

type ProjectRow = { id: string; name: string; active: boolean }
type MemberRow = { project_id: string; user_id: string }
type GoalRow = {
  id: string
  project_id: string
  name: string
  target: number
  starts_on: string
  ends_on: string
  reward: string
}
type LogRow = { goal_id: string; user_id: string; logged_on: string; achieved: number; created_at: string }

export const projectsRouter = Router()

projectsRouter.post(
  '/list',
  route(async (_req, res) => {
    const viewer = viewerOf(res)

    const [projects, members, goals, logs, people] = await Promise.all([
      selectAll<ProjectRow>((from, to) => db.from('projects').select('id, name, active').order('name').range(from, to)),
      selectAll<MemberRow>((from, to) => db.from('project_members').select('project_id, user_id').range(from, to)),
      selectAll<GoalRow>((from, to) =>
        db.from('project_goals').select('*').order('starts_on', { ascending: false }).range(from, to)
      ),
      selectAll<LogRow>((from, to) =>
        db.from('goal_logs').select('goal_id, user_id, logged_on, achieved, created_at').order('logged_on').order('created_at').range(from, to)
      ),
      listPeople()
    ])

    const names = new Map(people.map((person) => [person.id, person.name]))
    const membersOf = (projectId: string) =>
      members.filter((row) => row.project_id === projectId).map((row) => row.user_id)

    const mine = new Set(members.filter((row) => row.user_id === viewer.id).map((row) => row.project_id))
    const visibleGoals =
      viewer.role === 'owner' ? goals : goals.filter((goal) => mine.has(goal.project_id))

    const today = todayKey()

    return {
      ok: true,
      projects: projects.map((project) => {
        const memberIds = membersOf(project.id)
        return {
          id: project.id,
          name: project.name,
          active: project.active,
          memberIds,
          memberNames: memberIds.map((id) => names.get(id) ?? 'Former user')
        }
      }),
      goals: visibleGoals.map((goal) => {
        const goalLogs = logs.filter((log) => log.goal_id === goal.id)
        return summarizeGoal(goal, goalLogs, names, today)
      })
    }
  })
)

function summarizeGoal(goal: GoalRow, logs: LogRow[], names: Map<string, string>, today: string) {
  let achieved = 0
  let completedOn: string | undefined
  const perPerson = new Map<string, number>()

  for (const log of logs) {
    achieved += log.achieved
    perPerson.set(log.user_id, (perPerson.get(log.user_id) ?? 0) + log.achieved)
    if (!completedOn && achieved >= goal.target) completedOn = log.logged_on
  }

  return {
    id: goal.id,
    projectId: goal.project_id,
    name: goal.name,
    target: goal.target,
    from: goal.starts_on,
    to: goal.ends_on,
    reward: goal.reward,
    achieved,
    pct: Math.min(Math.round((achieved / goal.target) * 100), 100),
    running: goal.starts_on <= today && today <= goal.ends_on,
    ...(completedOn ? { completedOn } : {}),
    filings: [...perPerson.entries()]
      .map(([userId, total]) => ({ userId, name: names.get(userId) ?? 'Former user', achieved: total }))
      .sort((a, b) => b.achieved - a.achieved || a.name.localeCompare(b.name))
  }
}

type WriteInput = {
  action?: string
  projectId?: unknown
  goalId?: unknown
  name?: unknown
  active?: boolean
  userIds?: unknown
  target?: number
  from?: string
  to?: string
  reward?: unknown
  date?: string
  achieved?: number
}

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

projectsRouter.post(
  '/write',
  route(async (req, res) => {
    const viewer = viewerOf(res)
    const input = (req.body ?? {}) as WriteInput

    if (input.action === 'logGoal') return logGoal(input, viewer)

    requireOwner(viewer)
    switch (input.action) {
      case 'addProject':
        return addProject(input)
      case 'updateProject':
        return updateProject(input)
      case 'deleteProject':
        must(await db.from('projects').delete().eq('id', requireId(input.projectId)))
        void announceLeadsChanged()
        return { ok: true }
      case 'setMembers':
        return setMembers(input)
      case 'saveGoal':
        return saveGoal(input)
      case 'deleteGoal':
        must(await db.from('project_goals').delete().eq('id', requireId(input.goalId)))
        return { ok: true }
      default:
        throw badRequest('Unknown action.')
    }
  })
)

function projectName(raw: unknown): string {
  const name = text(raw)
  if (!name) throw badRequest('Give the project a name.')
  if (name.length > 120) throw badRequest('That project name is too long.')
  return name
}

function duplicate(message: string | undefined): boolean {
  return /duplicate key|projects_name_key/i.test(message ?? '')
}

async function addProject(input: WriteInput) {
  const name = projectName(input.name)
  const { data, error } = await db.from('projects').insert({ name }).select('id').single()
  if (error) throw badRequest(duplicate(error.message) ? `${name} already exists.` : error.message)
  return { ok: true, projectId: data.id }
}

async function updateProject(input: WriteInput) {
  const projectId = requireId(input.projectId)
  const current = must(await db.from('projects').select('name').eq('id', projectId).maybeSingle())
  if (!current) throw notFound('That project no longer exists.')

  const patch: Record<string, unknown> = {}
  if (input.name !== undefined) patch.name = projectName(input.name)
  if (typeof input.active === 'boolean') patch.active = input.active
  if (Object.keys(patch).length === 0) throw badRequest('Nothing to change.')

  const { error } = await db.from('projects').update(patch).eq('id', projectId)
  if (error) throw badRequest(duplicate(error.message) ? `${String(patch.name)} already exists.` : error.message)

  if (patch.name && patch.name !== current.name) {
    const pattern = current.name.replace(/[\\%_]/g, (char: string) => `\\${char}`)
    must(await db.from('leads').update({ project: patch.name }).ilike('project', pattern))
    void announceLeadsChanged()
  }

  return { ok: true, projectId }
}

async function setMembers(input: WriteInput) {
  const projectId = requireId(input.projectId)
  const userIds = [...new Set(strings(input.userIds).filter(isUuid))]

  must(await db.from('project_members').delete().eq('project_id', projectId))
  if (userIds.length > 0) {
    must(
      await db
        .from('project_members')
        .insert(userIds.map((userId) => ({ project_id: projectId, user_id: userId })))
    )
  }
  void announceLeadsChanged()
  return { ok: true, projectId }
}

async function saveGoal(input: WriteInput) {
  const projectId = requireId(input.projectId)
  const name = text(input.name)
  const target = Math.round(Number(input.target))

  if (!name) throw badRequest('Give the goal a name.')
  if (!Number.isFinite(target) || target <= 0) throw badRequest('The target must be above zero.')
  if (!isIsoDate(input.from) || !isIsoDate(input.to)) throw badRequest('Pick the start and end dates.')
  if (input.to < input.from) throw badRequest('The goal must end on or after it starts.')

  const row = {
    project_id: projectId,
    name,
    target,
    starts_on: input.from,
    ends_on: input.to,
    reward: text(input.reward)
  }

  if (input.goalId) {
    const saved = must(await db.from('project_goals').update(row).eq('id', requireId(input.goalId)).select('id'))
    if (!saved?.length) throw notFound('That goal no longer exists.')
    return { ok: true, projectId }
  }
  must(await db.from('project_goals').insert(row))
  return { ok: true, projectId }
}

async function logGoal(input: WriteInput, viewer: Viewer) {
  const goalId = requireId(input.goalId)
  const achieved = Math.round(Number(input.achieved))
  if (!Number.isFinite(achieved) || achieved < 0) throw badRequest('Enter a whole number.')
  if (!isIsoDate(input.date)) throw badRequest('Pick the day this was done.')
  if (input.date > todayKey()) throw badRequest('You cannot file for a day that has not happened yet.')

  const goal = must(
    await db.from('project_goals').select('project_id, starts_on, ends_on, name').eq('id', goalId).maybeSingle()
  )
  if (!goal) throw notFound('That goal no longer exists.')
  if (input.date < goal.starts_on || input.date > goal.ends_on) {
    throw badRequest(`${goal.name} is not running on that day.`)
  }

  if (viewer.role !== 'owner') {
    const member = must(
      await db
        .from('project_members')
        .select('user_id')
        .eq('project_id', goal.project_id)
        .eq('user_id', viewer.id)
        .maybeSingle()
    )
    if (!member) throw forbidden('You are not on this project.')
  }

  if (achieved > 0) {
    must(
      await db
        .from('goal_logs')
        .insert({ goal_id: goalId, user_id: viewer.id, logged_on: input.date, achieved })
    )
  }
  return { ok: true }
}
