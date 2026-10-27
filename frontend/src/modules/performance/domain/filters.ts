import { ALL_DEPARTMENTS, departmentsEqual } from './departments.ts'
import { gradeFor, type GradeLetter } from './grading.ts'

export type PerformanceFilters = {
  period: string
  department: string
  focusedUserId: string | null
  query: string
}

type PersonLike = {
  userId: string
  userName: string
  departments: string[]
}

type ScorablePerson = PersonLike & {
  kpis: Array<{ department: string; share: number; achieved: number }>
  totalTarget: number
  totalActual: number
  score: number | null
  grade: GradeLetter | null
  weeklyAvg: number | null
  weeklyGrade: GradeLetter | null
}

export function filterByDepartment<T extends PersonLike>(people: T[], department: string): T[] {
  if (department === ALL_DEPARTMENTS) return people
  return people.filter((person) =>
    person.departments.some((worked) => departmentsEqual(worked, department))
  )
}

export function scopeToDepartment<T extends ScorablePerson>(person: T, department: string): T {
  if (department === ALL_DEPARTMENTS) return person

  const kpis = person.kpis.filter((kpi) => departmentsEqual(kpi.department, department))
  const counted = kpis.filter((kpi) => kpi.share > 0)
  const totalTarget = counted.reduce((sum, kpi) => sum + kpi.share, 0)
  const totalActual = counted.reduce((sum, kpi) => sum + kpi.achieved, 0)
  const score = totalTarget > 0 ? Math.min(Math.round((totalActual / totalTarget) * 100), 100) : null

  return {
    ...person,
    departments: person.departments.filter((worked) => departmentsEqual(worked, department)),
    kpis,
    totalTarget,
    totalActual,
    score,
    grade: gradeFor(score),
    weeklyAvg: null,
    weeklyGrade: null
  }
}

export function filterByQuery<T extends PersonLike>(people: T[], query: string): T[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return people
  return people.filter((person) => person.userName.toLowerCase().includes(needle))
}

export function resolveFocused<T extends PersonLike>(people: T[], focusedUserId: string | null): T | null {
  if (focusedUserId) {
    const match = people.find((person) => person.userId === focusedUserId)
    if (match) return match
  }
  return people[0] ?? null
}

export function hasActiveFilters(filters: PerformanceFilters): boolean {
  return (
    filters.department !== ALL_DEPARTMENTS ||
    filters.focusedUserId !== null ||
    filters.query.trim().length > 0
  )
}
