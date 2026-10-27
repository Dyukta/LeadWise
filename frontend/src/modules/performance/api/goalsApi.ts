import type { GoalFiling } from '@modules/performance/api/performanceTypes'
import { endpoints, http, unwrap } from '@shared/lib/http'

export type ProjectGoalLine = {
  id: string
  projectId: string
  name: string
  target: number
  from: string
  to: string
  reward: string
  achieved: number
  pct: number
  filings: GoalFiling[]
  completedOn?: string
}

export type GoalProjectLine = { id: string; name: string }

type GoalsResponse = {
  ok: boolean
  error?: string
  projects: GoalProjectLine[]
  goals: ProjectGoalLine[]
}

type LogGoalInput = { goalId: string; date: string; achieved: number }

export function fetchProjectGoals(signal?: AbortSignal): Promise<GoalsResponse> {
  return http
    .post<GoalsResponse>(endpoints.projects, {}, signal)
    .then((payload) => unwrap(payload))
}

export async function logGoalProgress(input: LogGoalInput): Promise<{ ok: boolean }> {
  const payload = await http.post<{ ok: boolean; error?: string }>(endpoints.projectWrite, {
    action: 'logGoal',
    ...input
  })
  return unwrap(payload)
}
