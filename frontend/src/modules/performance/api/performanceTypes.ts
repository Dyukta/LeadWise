import type { GradeLetter } from '@modules/performance/domain/grading'

export type Period = string

export type WireTarget = {
  department: string
  label: string
  target: number
  share: number
  contributors: number
  actual: number
  unit: string
  period: 'weekly' | 'monthly' | string
  pct: number | null
  grade: GradeLetter | null
  pacing: string | null
  remaining: number
  source: 'department' | 'goal' | 'unmatched' | string
  reward?: string
  from?: string
  to?: string
}

export type WireDailyRecord = {
  day: number
  target: number
  targetSource: string
  achieved: number
  performancePct: number | null
  attendanceStatus: AttendanceStatus
}

export type WireEmployee = {
  id: string
  name: string
  shortName: string
  departments: string[]
  targets: WireTarget[]
  score: number | null
  grade: GradeLetter | null
  pacing: string | null
  totalTarget: number
  totalActual: number
  weeklyAvg: number | null
  weeklyGrade: GradeLetter | null
  attendanceRate: number
  presentDays: number
  absences: number
  halfDays: number
  weeklyOffs: number
  dailyRecords: WireDailyRecord[]
}

export type PerformanceResponse = {
  ok: boolean
  error?: string
  tab: string
  month: number
  year: number
  daysInMonth: number
  elapsed: number
  employees: WireEmployee[]
  kpiTargets: Array<{ department: string; label: string; target: number; unit: string; period: string }>
  departments: WireDepartment[]
  generatedAt: string
}

export type MonthsResponse = {
  ok: boolean
  error?: string
  months: Period[]
}

export type Kpi = {
  id: string
  department: string
  label: string
  target: number
  share: number
  contributors: number
  achieved: number
  unit: string
  pct: number | null
  remaining: number
  pacing: string | null
  source: string
  reward: string
  from: string
  to: string
}

export type AttendanceStatus = 'present' | 'half-day' | 'absent' | 'weekly-off'

export type Attendance = {
  presentDays: number
  halfDays: number
  absences: number
  weeklyOffs: number
}

export type DailyRecord = {
  day: number
  achieved: number
  target: number
  attendanceStatus: AttendanceStatus
}

export type DepartmentTarget = {
  label: string
  target: number
  achieved: number
  unit: string
  pct: number | null
  remaining: number
  pacing: string | null
}

export type WireDepartment = {
  name: string
  headcount: number
  score: number | null
  grade: GradeLetter | null
  absences: number
  kpis: DepartmentTarget[]
}

export type TeamMonth = {
  employees: PerformanceSummary[]
  departments: WireDepartment[]
}

export type PerformanceSummary = {
  userId: string
  userName: string
  shortName: string
  departments: string[]
  period: Period
  kpis: Kpi[]
  score: number | null
  grade: GradeLetter | null
  pacing: string | null
  totalTarget: number
  totalActual: number
  weeklyAvg: number | null
  weeklyGrade: GradeLetter | null
  attendanceRate: number
  attendance: Attendance | null
  dailyRecords: DailyRecord[]
}

export type CatalogueKpi = {
  department: string
  label: string
  target: number
  unit: string
  period: string
  from?: string
  to?: string
}

export type GoalFiling = { userId: string; name: string; achieved: number }

export type ReportEntry = { department: string; task: string; achieved: number }

export type ReportInput = {
  date: string
  attendance: AttendanceStatus
  entries: ReportEntry[]
}

export type ReportResponse = {
  ok: boolean
  error?: string
  saved: number
  replaced: number
  added: number
}

export type MasterSaveResponse = {
  ok: boolean
  error?: string
  saved: number
  removed: number
}
