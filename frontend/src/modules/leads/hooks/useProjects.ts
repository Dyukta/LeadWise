import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'

import {
  fetchProjects,
  writeProject,
  type ProjectWriteInput,
  type ProjectWriteResult
} from '@modules/leads/api/projectsApi'
import type { Project, ProjectGoal } from '@modules/leads/domain/projects'
import { useSession } from '@platform/auth/hooks/useSession'
import { queryKeys } from '@shared/lib/queryKeys'
import { toast } from '@shared/lib/toast'

const NO_PROJECTS: Project[] = []
const NO_GOALS: ProjectGoal[] = []

export function useProjects() {
  const result = useQuery({
    queryKey: queryKeys.projects.list(),
    queryFn: ({ signal }) => fetchProjects(signal),
    refetchInterval: 5 * 60_000
  })

  return {
    ...result,
    projects: result.data?.projects ?? NO_PROJECTS,
    goals: result.data?.goals ?? NO_GOALS
  }
}

export function useMyProjectNames(): string[] | null {
  const { session } = useSession()
  const { projects } = useProjects()
  const owner = session?.role === 'owner'
  const userId = session?.userId ?? null

  return useMemo(() => {
    if (owner) return null
    return projects
      .filter(
        (project) =>
          project.active && userId !== null && project.memberIds.includes(userId)
      )
      .map((project) => project.name)
  }, [owner, userId, projects])
}

export function useActiveProjectNames(): string[] {
  const { projects } = useProjects()
  return useMemo(
    () => projects.filter((project) => project.active).map((project) => project.name),
    [projects]
  )
}

const done: Record<ProjectWriteInput['action'], string> = {
  addProject: 'Project added',
  updateProject: 'Project updated',
  deleteProject: 'Project deleted',
  setMembers: 'Team updated',
  saveGoal: 'Goal saved',
  deleteGoal: 'Goal removed'
}

export function useWriteProject() {
  const queryClient = useQueryClient()

  return useMutation<ProjectWriteResult, Error, ProjectWriteInput>({
    mutationFn: writeProject,
    onSuccess: (_result, input) => {
      toast(done[input.action])

      const movesLeads =
        input.action === 'setMembers' ||
        input.action === 'updateProject' ||
        input.action === 'deleteProject'

      return Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
        ...(movesLeads
          ? [queryClient.invalidateQueries({ queryKey: queryKeys.leads.all })]
          : [])
      ])
    }
  })
}
