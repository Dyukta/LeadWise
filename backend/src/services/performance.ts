import type { Viewer } from '../auth.ts'
import { db, must, rows as allRows, selectAll } from '../db.ts'
import { currentPeriod, daysBetween, daysInMonth, eachDay, isIsoDate, isPeriod, isSunday, monthBounds, monthsBetween, todayKey, type IsoDate, type Period } from '../lib/dates.ts'
import { badRequest, isRecord } from '../lib/errors.ts'
import { firstName, listPeople, type Person } from './people.ts'

type KpiDef = { label: string; target: number; unit?: string; period?: string }

type KpiSetRow = { department: string; effective_from: Period; kpis: KpiDef[] }

type CatalogueRow = {
  department: string
  label: string
  target: number
  unit: string
  period: string
  from: Period
}

const lower = (value: string) => value.trim().toLowerCase()
const kpiKey = (department: string, label: string) => `${lower(department)}|${lower(label)}`

async function loadKpiSets(): Promise<KpiSetRow[]> {
  return selectAll<KpiSetRow>((from, to) =>
    db.from('kpi_sets').select('department, effective_from, kpis').range(from, to)
  )
}

function catalogueFor(sets: KpiSetRow[], month: Period): CatalogueRow[] {
  const newest = new Map<string, KpiSetRow>()
  for (const set of sets) {
    if (set.effective_from > month) continue
    const seen = newest.get(lower(set.department))
    if (!seen || seen.effective_from < set.effective_from) newest.set(lower(set.department), set)
  }

  return [...newest.values()]
    .sort((a, b) => a.department.localeCompare(b.department))
    .flatMap((set) =>
      (set.kpis ?? []).map((kpi) => ({
        department: set.department,
        label: kpi.label,
        target: Number(kpi.target) || 0,
        unit: kpi.unit ?? '',
        period: kpi.period ?? 'monthly',
        from: set.effective_from
      }))
    )
}

export async function performanceMonths(): Promise<Period[]> {
  const [firstAttendance, firstEntry, firstSet] = await Promise.all([
    db.from('attendance').select('day').order('day').limit(1).maybeSingle(),
    db.from('report_entries').select('day').order('day').limit(1).maybeSingle(),
    db.from('kpi_sets').select('effective_from').order('effective_from').limit(1).maybeSingle()
  ])

  const current = currentPeriod()
  const starts = [
    must(firstAttendance)?.day?.slice(0, 7),
    must(firstEntry)?.day?.slice(0, 7),
    must(firstSet)?.effective_from
  ].filter((value): value is Period => isPeriod(value) && value <= current)

  if (starts.length === 0) return [current]
  const earliest = starts.sort()[0]!
  return monthsBetween(`${earliest}-01`, `${current}-01`).reverse()
}

export async function saveKpis(month: unknown, was: unknown, rows: unknown) {
  if (!isPeriod(month)) throw badRequest('Pick a month.')
  if (!Array.isArray(rows) || !rows.every(isRecord)) throw badRequest('Send the KPI rows.')

  const previousName = typeof was === 'string' ? was.trim() : ''
  const cleaned: KpiDef[] = []
  const labels = new Set<string>()
  let name = previousName

  for (const row of rows) {
    const label = String(row.label ?? '').trim()
    const target = Number(row.target)
    if (!label) throw badRequest('Every KPI needs a name.')
    if (!Number.isFinite(target) || target < 0) throw badRequest(`${label} needs a target of zero or more.`)
    if (labels.has(lower(label))) throw badRequest(`${label} is listed twice.`)
    labels.add(lower(label))

    name = String(row.department ?? name).trim() || name
    cleaned.push({ label, target: Math.round(target), unit: String(row.unit ?? ''), period: String(row.period ?? 'monthly') })
  }

  if (!name) throw badRequest('Give the department a name.')

  const sets = await loadKpiSets()
  const catalogue = catalogueFor(sets, month)
  const before = catalogue.filter((row) => previousName && lower(row.department) === lower(previousName))

  if (!previousName || lower(previousName) !== lower(name)) {
    if (catalogue.some((row) => lower(row.department) === lower(name))) {
      throw badRequest(`${name} already exists.`)
    }
  }

  for (const department of new Set([previousName, name].filter(Boolean))) {
    const pattern = department.replace(/[\\%_]/g, (char) => `\\${char}`)
    must(await db.from('kpi_sets').delete().eq('effective_from', month).ilike('department', pattern))
  }

  const now = new Date().toISOString()
  const writes: KpiSetRow[] = []
  if (previousName && lower(previousName) !== lower(name)) {
    writes.push({ department: previousName, effective_from: month, kpis: [] })
  }
  writes.push({ department: name, effective_from: month, kpis: cleaned })

  must(await db.from('kpi_sets').upsert(writes.map((row) => ({ ...row, updated_at: now }))))

  const kept = new Set(cleaned.map((kpi) => lower(kpi.label)))
  const renamed = previousName && lower(previousName) !== lower(name)
  const removed = renamed ? before.length : before.filter((row) => !kept.has(lower(row.label))).length

  return { ok: true, saved: cleaned.length, removed }
}

const ATTENDANCE = ['present', 'half-day', 'absent', 'weekly-off'] as const
type AttendanceStatus = (typeof ATTENDANCE)[number]

export async function fileReport(viewer: Viewer, input: Record<string, unknown>) {
  const date = input.date
  if (!isIsoDate(date)) throw badRequest('Pick the day you are reporting for.')
  if (date > todayKey()) throw badRequest('You cannot file for a day that has not happened yet.')

  const attendance = input.attendance as AttendanceStatus
  if (!ATTENDANCE.includes(attendance)) throw badRequest('Pick your attendance for the day.')

  const catalogue = new Map(
    catalogueFor(await loadKpiSets(), date.slice(0, 7)).map((row) => [kpiKey(row.department, row.label), row])
  )

  const rows = new Map<string, { department: string; task: string; achieved: number }>()
  for (const entry of Array.isArray(input.entries) ? input.entries.filter(isRecord) : []) {
    const department = String(entry.department ?? '')
    const task = String(entry.task ?? '')
    const achieved = Number(entry.achieved)
    const kpi = catalogue.get(kpiKey(department, task))

    if (!kpi) throw badRequest(`${task} is not a ${department} KPI in ${date.slice(0, 7)}.`)
    if (!Number.isInteger(achieved) || achieved < 0) throw badRequest(`${task} needs a whole number.`)
    rows.set(kpiKey(department, task), { department: kpi.department, task: kpi.label, achieved })
  }

  must(await db.from('attendance').upsert({ user_id: viewer.id, day: date, status: attendance }))

  if (attendance === 'absent' || attendance === 'weekly-off') {
    must(await db.from('report_entries').delete().eq('user_id', viewer.id).eq('day', date))
    return { ok: true, saved: 0, replaced: 0, added: 0 }
  }

  const existing = new Set(
    allRows(
      await db.from('report_entries').select('department, task').eq('user_id', viewer.id).eq('day', date)
    ).map((row) => kpiKey(row.department, row.task))
  )

  const now = new Date().toISOString()
  const writes = [...rows.values()].map((row) => ({ user_id: viewer.id, day: date, ...row, updated_at: now }))
  if (writes.length > 0) must(await db.from('report_entries').upsert(writes))

  const replaced = [...rows.keys()].filter((key) => existing.has(key)).length
  return { ok: true, saved: writes.length, replaced, added: writes.length - replaced }
}

type Grade = 'A' | 'B' | 'C'

function gradeFor(pct: number | null): Grade | null {
  return pct === null ? null : pct > 80 ? 'A' : pct >= 50 ? 'B' : 'C'
}

const ratio = (achieved: number, target: number) => (target > 0 ? (achieved / target) * 100 : null)

const capped = (achieved: number, target: number) =>
  target > 0 ? Math.min(Math.round((achieved / target) * 100), 100) : null

function pacingFor(achieved: number, target: number, elapsed: number): string | null {
  if (target <= 0) return null
  if (achieved >= target) return 'on target'
  if (elapsed <= 0) return 'on track'
  const pace = achieved / (target * elapsed)
  if (pace >= 1) return 'on track'
  if (pace >= 0.75) return 'at risk'
  return 'behind'
}

function elapsedShare(from: IsoDate, to: IsoDate, today: IsoDate): number {
  if (today < from) return 0
  const last = today < to ? today : to
  return (daysBetween(from, last) + 1) / (daysBetween(from, to) + 1)
}

type EntryRow = { user_id: string; day: IsoDate; department: string; task: string; achieved: number }
type AttendanceRow = { user_id: string; day: IsoDate; status: AttendanceStatus }
type GoalRow = {
  id: string
  project_id: string
  name: string
  target: number
  starts_on: IsoDate
  ends_on: IsoDate
  reward: string
  projects: { name: string } | null
}
type GoalLogRow = { goal_id: string; user_id: string; logged_on: IsoDate; achieved: number }

type WireTarget = {
  department: string
  label: string
  target: number
  share: number
  contributors: number
  actual: number
  unit: string
  period: string
  pct: number | null
  grade: Grade | null
  pacing: string | null
  remaining: number
  source: 'department' | 'goal' | 'unmatched'
  reward?: string
  from?: string
  to?: string
}

function target(
  fields: Omit<WireTarget, 'pct' | 'grade' | 'pacing' | 'remaining'>,
  elapsed: number
): WireTarget {
  const pct = ratio(fields.actual, fields.share)
  return {
    ...fields,
    pct,
    grade: gradeFor(pct === null ? null : Math.min(pct, 100)),
    pacing: pacingFor(fields.actual, fields.share, elapsed),
    remaining: Math.max(fields.share - fields.actual, 0)
  }
}

export async function teamPerformance(
  viewer: Viewer,
  tab: unknown,
  range: { from?: unknown; to?: unknown }
) {
  if (!isPeriod(tab)) throw badRequest('Pick a month.')

  const custom = isIsoDate(range.from) && isIsoDate(range.to) && range.from <= range.to
  const { from, to } = custom ? { from: range.from as IsoDate, to: range.to as IsoDate } : monthBounds(tab)
  const today = todayKey()
  const elapsed = elapsedShare(from, to, today)

  const sets = await loadKpiSets()

  const defs = new Map<string, { department: string; label: string; target: number; unit: string; period: string }>()
  for (const month of monthsBetween(from, to)) {
    for (const row of catalogueFor(sets, month)) {
      const key = kpiKey(row.department, row.label)
      const seen = defs.get(key)
      if (seen) seen.target += row.target
      else defs.set(key, { department: row.department, label: row.label, target: row.target, unit: row.unit, period: row.period })
    }
  }

  const [people, entries, attendance, goals, logs, members] = await Promise.all([
    listPeople(),
    selectAll<EntryRow>((a, b) =>
      db.from('report_entries').select('user_id, day, department, task, achieved').gte('day', from).lte('day', to).range(a, b)
    ),
    selectAll<AttendanceRow>((a, b) =>
      db.from('attendance').select('user_id, day, status').gte('day', from).lte('day', to).range(a, b)
    ),
    selectAll<GoalRow>((a, b) =>
      db.from('project_goals').select('*, projects(name)').lte('starts_on', to).gte('ends_on', from).range(a, b)
    ),
    selectAll<GoalLogRow>((a, b) =>
      db.from('goal_logs').select('goal_id, user_id, logged_on, achieved').gte('logged_on', from).lte('logged_on', to).range(a, b)
    ),
    selectAll<{ project_id: string; user_id: string }>((a, b) =>
      db.from('project_members').select('project_id, user_id').range(a, b)
    )
  ])

  const involved = new Set([...entries, ...attendance, ...logs].map((row) => row.user_id))
  const staff = people.filter(
    (person) => (person.active && person.role === 'employee') || involved.has(person.id)
  )

  const departmentsOf = new Map<string, Set<string>>()
  const departmentName = new Map<string, string>()
  for (const def of defs.values()) departmentName.set(lower(def.department), def.department)
  for (const entry of entries) {
    const key = lower(entry.department)
    if (!departmentName.has(key)) departmentName.set(key, entry.department)
    const set = departmentsOf.get(entry.user_id) ?? new Set<string>()
    set.add(key)
    departmentsOf.set(entry.user_id, set)
  }
  const headcount = new Map<string, number>()
  for (const set of departmentsOf.values()) {
    for (const key of set) headcount.set(key, (headcount.get(key) ?? 0) + 1)
  }

  const goalPeople = new Map<string, Set<string>>()
  for (const goal of goals) {
    const people = new Set(members.filter((row) => row.project_id === goal.project_id).map((row) => row.user_id))
    for (const log of logs) if (log.goal_id === goal.id) people.add(log.user_id)
    goalPeople.set(goal.id, people)
  }

  const workingDays = eachDay(from, to).filter((day) => !isSunday(day)).length
  const countedDays = elapsed > 0 ? eachDay(from, today < to ? today : to) : []

  const employees = staff.map((person) =>
    scorePerson(person, {
      tab,
      today,
      elapsed,
      defs,
      departmentName,
      headcount,
      departments: departmentsOf.get(person.id) ?? new Set(),
      entries: entries.filter((row) => row.user_id === person.id),
      attendance: attendance.filter((row) => row.user_id === person.id),
      goals: goals.filter((goal) => goalPeople.get(goal.id)?.has(person.id)),
      goalPeople,
      logs: logs.filter((row) => row.user_id === person.id),
      workingDays,
      countedDays
    })
  )

  const departments = [...new Set([...defs.values()].map((def) => lower(def.department)))]
    .map((key) => {
      const kpis = [...defs.entries()]
        .filter(([, def]) => lower(def.department) === key)
        .map(([defKey, def]) => {
          const achieved = entries
            .filter((row) => kpiKey(row.department, row.task) === defKey)
            .reduce((sum, row) => sum + row.achieved, 0)
          return {
            label: def.label,
            target: def.target,
            achieved,
            unit: def.unit,
            pct: ratio(achieved, def.target),
            remaining: Math.max(def.target - achieved, 0),
            pacing: pacingFor(achieved, def.target, elapsed)
          }
        })

      const team = employees.filter((employee) =>
        employee.departments.some((name) => lower(name) === key)
      )
      const totalTarget = kpis.reduce((sum, kpi) => sum + kpi.target, 0)
      const totalAchieved = kpis.reduce((sum, kpi) => sum + kpi.achieved, 0)
      const score = team.length > 0 ? capped(totalAchieved, totalTarget) : null

      return {
        name: departmentName.get(key) ?? key,
        headcount: team.length,
        score,
        grade: gradeFor(score),
        absences: team.reduce((sum, employee) => sum + employee.absences, 0),
        kpis
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  const [year, month] = tab.split('-').map(Number)

  return {
    ok: true,
    tab,
    month: month!,
    year: year!,
    daysInMonth: daysInMonth(tab),
    elapsed: countedDays.filter((day) => day.startsWith(tab)).length,
    employees: viewer.role === 'owner' ? employees : employees.filter((employee) => employee.id === viewer.id),
    kpiTargets: catalogueFor(sets, tab),
    departments,
    generatedAt: new Date().toISOString()
  }
}

type PersonContext = {
  tab: Period
  today: IsoDate
  elapsed: number
  defs: Map<string, { department: string; label: string; target: number; unit: string; period: string }>
  departmentName: Map<string, string>
  headcount: Map<string, number>
  departments: Set<string>
  entries: EntryRow[]
  attendance: AttendanceRow[]
  goals: GoalRow[]
  goalPeople: Map<string, Set<string>>
  logs: GoalLogRow[]
  workingDays: number
  countedDays: IsoDate[]
}

function scorePerson(person: Person, ctx: PersonContext) {
  const targets: WireTarget[] = []
  const actualFor = new Map<string, number>()
  for (const entry of ctx.entries) {
    const key = kpiKey(entry.department, entry.task)
    actualFor.set(key, (actualFor.get(key) ?? 0) + entry.achieved)
  }

  const departments = [...ctx.departments].sort((a, b) =>
    (ctx.departmentName.get(a) ?? a).localeCompare(ctx.departmentName.get(b) ?? b)
  )

  for (const department of departments) {
    const contributors = ctx.headcount.get(department) ?? 1
    for (const [key, def] of ctx.defs) {
      if (lower(def.department) !== department) continue
      targets.push(
        target(
          {
            department: def.department,
            label: def.label,
            target: def.target,
            share: def.target / contributors,
            contributors,
            actual: actualFor.get(key) ?? 0,
            unit: def.unit,
            period: def.period,
            source: 'department'
          },
          ctx.elapsed
        )
      )
    }
  }

  for (const [key, actual] of actualFor) {
    if (ctx.defs.has(key)) continue
    const sample = ctx.entries.find((entry) => kpiKey(entry.department, entry.task) === key)!
    targets.push(
      target(
        {
          department: sample.department,
          label: sample.task,
          target: 0,
          share: 0,
          contributors: 1,
          actual,
          unit: '',
          period: 'monthly',
          source: 'unmatched'
        },
        ctx.elapsed
      )
    )
  }

  for (const goal of ctx.goals) {
    const contributors = Math.max(ctx.goalPeople.get(goal.id)?.size ?? 1, 1)
    const actual = ctx.logs
      .filter((log) => log.goal_id === goal.id)
      .reduce((sum, log) => sum + log.achieved, 0)
    targets.push(
      target(
        {
          department: goal.projects?.name ?? 'Project goal',
          label: goal.name,
          target: goal.target,
          share: goal.target / contributors,
          contributors,
          actual,
          unit: '',
          period: 'goal',
          source: 'goal',
          reward: goal.reward,
          from: goal.starts_on,
          to: goal.ends_on
        },
        elapsedShare(goal.starts_on, goal.ends_on, ctx.today)
      )
    )
  }

  const counted = targets.filter((row) => row.share > 0)
  const totalTarget = counted.reduce((sum, row) => sum + row.share, 0)
  const totalActual = counted.reduce((sum, row) => sum + row.actual, 0)
  const score = capped(totalActual, totalTarget)

  const statusOn = new Map(ctx.attendance.map((row) => [row.day, row.status]))
  const achievedOn = new Map<IsoDate, number>()
  for (const row of [...ctx.entries.map((e) => ({ day: e.day, n: e.achieved })), ...ctx.logs.map((l) => ({ day: l.logged_on, n: l.achieved }))]) {
    achievedOn.set(row.day, (achievedOn.get(row.day) ?? 0) + row.n)
  }

  const dailyTarget = ctx.workingDays > 0 ? totalTarget / ctx.workingDays : 0
  const recordDays = [...new Set([...statusOn.keys(), ...achievedOn.keys()])]
    .filter((day) => day.startsWith(ctx.tab))
    .sort()

  const dailyRecords = recordDays.map((day) => {
    const achieved = achievedOn.get(day) ?? 0
    const status = statusOn.get(day) ?? 'present'
    const dayTarget = status === 'weekly-off' || status === 'absent' ? 0 : dailyTarget
    return {
      day: Number(day.slice(8)),
      target: dayTarget,
      targetSource: 'monthly',
      achieved,
      performancePct: dayTarget > 0 ? Math.round((achieved / dayTarget) * 100) : null,
      attendanceStatus: status
    }
  })

  const count = (status: AttendanceStatus) => ctx.attendance.filter((row) => row.status === status).length
  const presentDays = count('present')
  const halfDays = count('half-day')
  const absences = count('absent')
  const weeklyOffs = count('weekly-off')
  const marked = presentDays + halfDays + absences
  const attendanceRate = marked > 0 ? Math.round(((presentDays + halfDays / 2) / marked) * 100) : 0

  const weekly: number[] = []
  let week: IsoDate[] = []
  const closeWeek = () => {
    const working = week.filter((day) => !isSunday(day) && statusOn.get(day) !== 'weekly-off').length
    const goal = dailyTarget * working
    const done = week.reduce((sum, day) => sum + (achievedOn.get(day) ?? 0), 0)
    if (goal > 0) weekly.push(Math.min((done / goal) * 100, 100))
    week = []
  }
  for (const day of ctx.countedDays) {
    if (isSunday(day) && week.length > 0) closeWeek()
    week.push(day)
  }
  if (week.length > 0) closeWeek()
  const weeklyAvg = weekly.length > 0 ? Math.round(weekly.reduce((a, b) => a + b, 0) / weekly.length) : null

  return {
    id: person.id,
    name: person.name,
    shortName: firstName(person.name),
    departments: departments.map((key) => ctx.departmentName.get(key) ?? key),
    targets,
    score,
    grade: gradeFor(score),
    pacing: pacingFor(totalActual, totalTarget, ctx.elapsed),
    totalTarget,
    totalActual,
    weeklyAvg,
    weeklyGrade: gradeFor(weeklyAvg),
    attendanceRate,
    presentDays,
    absences,
    halfDays,
    weeklyOffs,
    dailyRecords
  }
}
