import type { Project, ProjectGoal } from '@modules/leads/domain/projects'
import { endpoints, http, unwrap } from '@shared/lib/http'

type ProjectsResponse = {
  ok: boolean
  error?: string
  projects: Project[]
  goals: ProjectGoal[]
}

export type ProjectWriteInput =
  | { action: 'addProject'; name: string }
  | { action: 'updateProject'; projectId: string; name?: string; active?: boolean }
  | { action: 'deleteProject'; projectId: string }
  | { action: 'setMembers'; projectId: string; userIds: string[] }
  | {
      action: 'saveGoal'
      goalId?: string
      projectId: string
      name: string
      target: number
      from: string
      to: string
      reward: string
    }
  | { action: 'deleteGoal'; goalId: string }

export function fetchProjects(signal?: AbortSignal): Promise<ProjectsResponse> {
  return http
    .post<ProjectsResponse>(endpoints.projects, {}, signal)
    .then((payload) => unwrap(payload))
}

export type ProjectWriteResult = { ok: boolean; error?: string; projectId?: string }

export async function writeProject(input: ProjectWriteInput): Promise<ProjectWriteResult> {
  const payload = await http.post<ProjectWriteResult>(endpoints.projectWrite, input)
  return unwrap(payload)
}
