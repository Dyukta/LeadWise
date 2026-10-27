export const ALL_DEPARTMENTS = 'All Departments'
const UNASSIGNED = 'Unassigned'

export function normalizeDepartment(department: string | null): string {
  const trimmed = (department ?? '').trim()
  return trimmed.length > 0 ? trimmed : UNASSIGNED
}

export function departmentsEqual(a: string | null, b: string | null): boolean {
  return normalizeDepartment(a).toLowerCase() === normalizeDepartment(b).toLowerCase()
}

export function dedupeDepartments(departments: string[]): string[] {
  const seen = new Map<string, string>()
  for (const department of departments) {
    const key = department.toLowerCase()
    if (!seen.has(key)) seen.set(key, department)
  }
  return Array.from(seen.values())
}
