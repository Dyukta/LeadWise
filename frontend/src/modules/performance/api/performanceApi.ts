import type { CatalogueKpi, MasterSaveResponse, MonthsResponse, PerformanceResponse, PerformanceSummary, Period, ReportInput, ReportResponse, TeamMonth, WireDepartment, WireEmployee } from '@modules/performance/api/performanceTypes'
import { endpoints, http, unwrap } from '@shared/lib/http'

export function fetchPerformanceMonths(signal?: AbortSignal): Promise<Period[]> {
  return http
    .get<MonthsResponse>(endpoints.performanceMonths, signal)
    .then((payload) => unwrap(payload).months)
}

export function fetchPerformance(
  period: Period,
  signal?: AbortSignal,
  range?: { from: string; to: string } | null
): Promise<TeamMonth> {
  return http
    .post<PerformanceResponse>(endpoints.performance, { tab: period, ...(range ?? {}) }, signal)
    .then((payload) => {
      const data = unwrap(payload)
      return {
        employees: data.employees.map((employee) => toSummary(employee, period)),
        departments: (data.departments ?? []).map(toDepartment)
      }
    })
}

export function fetchKpiCatalogue(period: Period, signal?: AbortSignal): Promise<CatalogueKpi[]> {
  return http
    .post<PerformanceResponse>(endpoints.performance, { tab: period }, signal)
    .then((payload) => unwrap(payload).kpiTargets ?? [])
}

export function submitReport(input: ReportInput, signal?: AbortSignal): Promise<ReportResponse> {
  return http
    .post<ReportResponse>(endpoints.reportWrite, input, signal)
    .then((payload) => unwrap(payload))
}

export function saveKpiCatalogue(
  month: Period,
  department: string,
  rows: CatalogueKpi[],
  signal?: AbortSignal
): Promise<MasterSaveResponse> {
  return http
    .post<MasterSaveResponse>(endpoints.masterWrite, { month, department, rows }, signal)
    .then((payload) => unwrap(payload))
}

function whole(value: number): number {
  return Math.round(value || 0)
}

function ratio(achieved: number, target: number): number | null {
  return target > 0 ? (achieved / target) * 100 : null
}

function toDepartment(department: WireDepartment): WireDepartment {
  return {
    ...department,
    kpis: department.kpis.map((kpi) => {
      const target = whole(kpi.target)
      const achieved = whole(kpi.achieved)
      return {
        ...kpi,
        target,
        achieved,
        pct: ratio(achieved, target),
        remaining: Math.max(target - achieved, 0)
      }
    })
  }
}

function toSummary(employee: WireEmployee, period: Period): PerformanceSummary {
  return {
    userId: employee.id,
    userName: employee.name,
    shortName: employee.shortName || employee.name,
    departments: employee.departments ?? [],
    period,
    kpis: employee.targets.map((target, index) => {
      const share = whole(target.share)
      const achieved = whole(target.actual)
      return {
        id: `${employee.id}-${index}`,
        department: target.department,
        label: target.label,
        target: whole(target.target),
        share,
        contributors: target.contributors,
        achieved,
        unit: target.unit,
        pct: ratio(achieved, share),
        remaining: Math.max(share - achieved, 0),
        pacing: target.pacing,
        source: target.source,
        reward: target.reward ?? '',
        from: target.from ?? '',
        to: target.to ?? ''
      }
    }),
    score: employee.score,
    grade: employee.grade,
    pacing: employee.pacing,
    totalTarget: whole(employee.totalTarget),
    totalActual: whole(employee.totalActual),
    weeklyAvg: employee.weeklyAvg,
    weeklyGrade: employee.weeklyGrade,
    attendanceRate: employee.attendanceRate,
    attendance: {
      presentDays: employee.presentDays,
      halfDays: employee.halfDays,
      absences: employee.absences,
      weeklyOffs: employee.weeklyOffs ?? 0
    },
    dailyRecords: employee.dailyRecords.map((record) => ({
      day: record.day,
      achieved: whole(record.achieved),
      target: whole(record.target),
      attendanceStatus: record.attendanceStatus
    }))
  }
}
