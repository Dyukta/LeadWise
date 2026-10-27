export type Project = {
  id: string
  name: string
  active: boolean
  memberIds: string[]
  memberNames: string[]
}

export type ProjectGoal = {
  id: string
  projectId: string
  name: string
  target: number
  from: string
  to: string
  reward: string
  achieved: number
  pct: number
  running: boolean
  completedOn?: string
}

export function sameProject(a: string | null, b: string | null): boolean {
  return (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase()
}

