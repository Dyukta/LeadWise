import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  fetchProjectGoals,
  logGoalProgress,
  type GoalProjectLine,
  type ProjectGoalLine
} from '@modules/performance/api/goalsApi'
import { queryKeys } from '@shared/lib/queryKeys'

const NO_GOALS: ProjectGoalLine[] = []
const NO_PROJECTS: GoalProjectLine[] = []

export function useProjectGoals() {
  const result = useQuery({
    queryKey: queryKeys.projects.list(),
    queryFn: ({ signal }) => fetchProjectGoals(signal)
  })

  return {
    goals: result.data?.goals ?? NO_GOALS,
    projects: result.data?.projects ?? NO_PROJECTS
  }
}

export function useLogGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: logGoalProgress,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.projects.all })
  })
}
