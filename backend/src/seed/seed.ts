import { randomUUID } from 'node:crypto'

import { db, must } from '../db.ts'
import { addDays, currentPeriod, daysBetween, daysInMonth, eachDay, isSunday, monthsBetween, shiftPeriod, todayKey, zonedInstant, type IsoDate, type Period } from '../lib/dates.ts'
import { phoneKey, priorityForPossession } from '../services/leadRules.ts'

function env(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing environment variable ${name}.`)
  return value
}

const TODAY = todayKey()
const NOW = Date.now()
const START: IsoDate = `${shiftPeriod(currentPeriod(), -6)}-01`

let state = 20260930
function random(): number {
  state = (state + 0x6d2b79f5) | 0
  let t = Math.imul(state ^ (state >>> 15), 1 | state)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length)]!
const between = (min: number, max: number) => min + Math.floor(random() * (max - min + 1))
const chance = (p: number) => random() < p
const noise = () => (random() + random() + random()) / 3

function weighted<T>(options: ReadonlyArray<readonly [T, number]>): T {
  let roll = random() * options.reduce((sum, [, weight]) => sum + weight, 0)
  for (const [value, weight] of options) {
    roll -= weight
    if (roll < 0) return value
  }
  return options[options.length - 1]![0]
}

function poisson(mean: number): number {
  const limit = Math.exp(-mean)
  let count = 0
  let product = random()
  while (product > limit) {
    count += 1
    product *= random()
  }
  return count
}

const stamp = (day: IsoDate, hour: number, minute = between(0, 59)) =>
  Math.min(zonedInstant(day, hour, minute).getTime(), NOW)
const iso = (ms: number) => new Date(ms).toISOString()
const weekdayOf = (day: IsoDate) => new Date(`${day}T00:00:00Z`).getUTCDay()

type Department = 'Sales' | 'Marketing' | 'CRM'

type Person = { id: string; email: string; name: string; role: 'owner' | 'employee' }

const SEASON: Record<number, number> = { 1: 1, 2: 1, 3: 1.15, 4: 0.96, 5: 1.02, 6: 0.92, 7: 0.8, 8: 0.86, 9: 1.04, 10: 1.12, 11: 1.1, 12: 0.94 }
const seasonOf = (day: IsoDate) => SEASON[Number(day.slice(5, 7))] ?? 1

const HOLIDAYS = new Set(
  [...new Set(eachDay(START, TODAY).map((day) => day.slice(0, 4)))].flatMap((year) => [
    `${year}-01-26`,
    `${year}-05-01`,
    `${year}-08-15`,
    `${year}-10-02`
  ])
)
const isWorkingDay = (day: IsoDate) => !isSunday(day) && !HOLIDAYS.has(day)

async function loadPeople(): Promise<{ owner: Person; employee: Person }> {
  const wanted = [
    { email: env('DEMO_OWNER_EMAIL').toLowerCase(), name: 'Aarav Mehta', role: 'owner' as const },
    { email: env('DEMO_EMPLOYEE_EMAIL').toLowerCase(), name: 'Priya Sharma', role: 'employee' as const }
  ]

  const { data, error } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw new Error(error.message)

  const people: Person[] = []
  for (const person of wanted) {
    const id = data.users.find((user) => user.email?.toLowerCase() === person.email)?.id
    if (!id) throw new Error(`${person.email} is not in Supabase Auth. Add it under Authentication > Users first.`)

    must(await db.from('allowed_emails').upsert({ email: person.email }))
    must(
      await db
        .from('users')
        .upsert({ id, email: person.email, full_name: person.name, role: person.role, active: true })
    )
    people.push({ id, ...person })
    console.log(`  ${person.role.padEnd(8)} ${person.email} (${person.name})`)
  }

  return { owner: people[0]!, employee: people[1]! }
}

async function wipe() {
  const tables: Array<[string, string]> = [
    ['goal_logs', 'id'],
    ['project_goals', 'id'],
    ['project_members', 'project_id'],
    ['lead_events', 'id'],
    ['leads', 'id'],
    ['campaigns', 'id'],
    ['projects', 'id'],
    ['report_entries', 'user_id'],
    ['attendance', 'user_id'],
    ['kpi_sets', 'department']
  ]
  for (const [table, column] of tables) must(await db.from(table).delete().not(column, 'is', null))
}

async function insertAll(table: string, rows: Record<string, unknown>[]) {
  for (let i = 0; i < rows.length; i += 500) must(await db.from(table).insert(rows.slice(i, i + 500)))
}

type Kpi = { label: string; target: number }
type KpiSet = { department: Department; from: Period; kpis: Kpi[] }

const FIRST_MONTH = START.slice(0, 7)

const KPI_SETS: KpiSet[] = [
  {
    department: 'Sales',
    from: FIRST_MONTH,
    kpis: [
      { label: 'Calls made', target: 850 },
      { label: 'Site visits', target: 26 },
      { label: 'Bookings', target: 3 }
    ]
  },
  {
    department: 'Marketing',
    from: FIRST_MONTH,
    kpis: [
      { label: 'Leads generated', target: 40 },
      { label: 'Listings refreshed', target: 20 }
    ]
  },
  {
    department: 'CRM',
    from: FIRST_MONTH,
    kpis: [
      { label: 'Follow ups', target: 380 },
      { label: 'Documents processed', target: 10 }
    ]
  },
  {
    department: 'Marketing',
    from: shiftPeriod(currentPeriod(), -3),
    kpis: [
      { label: 'Leads generated', target: 40 },
      { label: 'Listings refreshed', target: 20 },
      { label: 'Channel partner meets', target: 6 }
    ]
  },
  {
    department: 'Sales',
    from: shiftPeriod(currentPeriod(), -2),
    kpis: [
      { label: 'Calls made', target: 950 },
      { label: 'Site visits', target: 30 },
      { label: 'Bookings', target: 4 }
    ]
  }
]

function kpisFor(department: Department, month: Period): Kpi[] {
  return KPI_SETS.filter((set) => set.department === department && set.from <= month).sort((a, b) =>
    b.from.localeCompare(a.from)
  )[0]!.kpis
}

const WEEKDAY_FACTOR: Record<string, Record<number, number>> = {
  'Calls made': { 1: 1.15, 6: 0.75 },
  'Site visits': { 6: 1.8, 1: 0.6 },
  Bookings: { 6: 1.5 },
  'Follow ups': { 1: 1.1 },
  'Listings refreshed': { 1: 1.6 }
}

async function seedReports(employee: Person) {
  must(
    await db.from('kpi_sets').insert(
      KPI_SETS.map((set) => ({
        department: set.department,
        effective_from: set.from,
        kpis: set.kpis.map((kpi) => ({ ...kpi, unit: '', period: 'monthly' }))
      }))
    )
  )

  const months = monthsBetween(START, TODAY)
  const workingDays = new Map(
    months.map((month) => [month, eachDay(`${month}-01`, `${month}-${daysInMonth(month)}`).filter(isWorkingDay).length])
  )
  const departments: Department[] = ['Sales', 'Marketing', 'CRM']
  const window = eachDay(START, TODAY)

  const leave = new Set<IsoDate>()
  for (const from of [pick(window.slice(20, 70)), pick(window.slice(110, 160))]) {
    eachDay(from, addDays(from, between(2, 4))).forEach((day) => leave.add(day))
  }

  const attendance: Record<string, unknown>[] = []
  const entries: Record<string, unknown>[] = []

  for (const day of window) {
    if (!isWorkingDay(day)) {
      attendance.push({ user_id: employee.id, day, status: 'weekly-off' })
      continue
    }
    if (day === TODAY && new Date().getHours() < 18) continue

    const roll = random()
    const status = leave.has(day) || roll < 0.02 ? 'absent' : roll < 0.06 ? 'half-day' : 'present'
    attendance.push({ user_id: employee.id, day, status })
    if (status === 'absent') continue

    const month = day.slice(0, 7)
    const monthIndex = months.indexOf(month)
    const effort = (0.72 + 0.025 * monthIndex) * seasonOf(day) * (status === 'half-day' ? 0.5 : 1)

    for (const department of departments) {
      for (const kpi of kpisFor(department, month)) {
        const perDay = kpi.target / workingDays.get(month)!
        const value = perDay * effort * (WEEKDAY_FACTOR[kpi.label]?.[weekdayOf(day)] ?? 1) * (0.55 + noise() * 0.9)
        const achieved = value < 1 ? (chance(value) ? 1 : 0) : Math.round(value)
        if (achieved > 0) entries.push({ user_id: employee.id, day, department, task: kpi.label, achieved })
      }
    }
  }

  await insertAll('attendance', attendance)
  await insertAll('report_entries', entries)
  console.log(`  ${attendance.length} attendance days, ${entries.length} KPI entries`)
}

type Project = {
  key: string
  name: string
  active: boolean
  closedFrom: IsoDate | null
  share: number
  configurations: ReadonlyArray<readonly [string, number, number, number]>
}

const LAKH = 100_000

const PROJECTS: Project[] = [
  {
    key: 'andheri',
    name: 'Skyline Residency, Andheri West',
    active: true,
    closedFrom: null,
    share: 0.3,
    configurations: [
      ['1 BHK', 3, 145, 185],
      ['2 BHK', 5, 225, 310],
      ['3 BHK', 2, 360, 480]
    ]
  },
  {
    key: 'chembur',
    name: 'Harbour Heights, Chembur',
    active: true,
    closedFrom: null,
    share: 0.22,
    configurations: [
      ['1 BHK', 3, 115, 145],
      ['2 BHK', 5, 175, 240],
      ['3 BHK', 2, 290, 360]
    ]
  },
  {
    key: 'thane',
    name: 'Lakeview Towers, Thane West',
    active: true,
    closedFrom: null,
    share: 0.28,
    configurations: [
      ['1 BHK', 4, 78, 110],
      ['2 BHK', 5, 125, 165],
      ['3 BHK', 2, 185, 240]
    ]
  },
  {
    key: 'kharghar',
    name: 'Palm Grove, Kharghar',
    active: true,
    closedFrom: null,
    share: 0.12,
    configurations: [
      ['1 BHK', 5, 62, 85],
      ['2 BHK', 4, 98, 135]
    ]
  },
  {
    key: 'borivali',
    name: 'Sea Breeze Residences, Borivali West',
    active: false,
    closedFrom: addDays(START, 115),
    share: 0.08,
    configurations: [
      ['2 BHK', 5, 185, 245],
      ['3 BHK', 3, 290, 375]
    ]
  }
]

async function seedProjects(employee: Person) {
  const projectIds = new Map(PROJECTS.map((project) => [project.key, randomUUID()]))

  must(
    await db
      .from('projects')
      .insert(PROJECTS.map((p) => ({ id: projectIds.get(p.key), name: p.name, active: p.active })))
  )
  must(
    await db
      .from('project_members')
      .insert(PROJECTS.map((p) => ({ project_id: projectIds.get(p.key), user_id: employee.id })))
  )

  const lastMonth = shiftPeriod(currentPeriod(), -1)
  const goals = [
    {
      project: 'andheri',
      name: 'Monsoon booking drive',
      target: 5,
      starts_on: `${shiftPeriod(currentPeriod(), -2)}-01`,
      ends_on: `${lastMonth}-${daysInMonth(lastMonth)}`,
      reward: '₹50,000 incentive',
      achieved: 6,
      saturdays: false
    },
    {
      project: 'thane',
      name: 'Site visit sprint',
      target: 24,
      starts_on: addDays(TODAY, -29),
      ends_on: addDays(TODAY, -3),
      reward: 'Dinner voucher at Hiranandani',
      achieved: 19,
      saturdays: false
    },
    {
      project: 'andheri',
      name: 'Navratri prelaunch bookings',
      target: 4,
      starts_on: addDays(TODAY, -12),
      ends_on: addDays(TODAY, 24),
      reward: '₹25,000 per booking over target',
      achieved: 1,
      saturdays: false
    },
    {
      project: 'chembur',
      name: 'Weekend walk in challenge',
      target: 15,
      starts_on: addDays(TODAY, -20),
      ends_on: addDays(TODAY, 15),
      reward: 'Weekend stay at Lonavala',
      achieved: 7,
      saturdays: true
    }
  ].map((goal) => ({ ...goal, id: randomUUID() }))

  must(
    await db.from('project_goals').insert(
      goals.map((goal) => ({
        id: goal.id,
        project_id: projectIds.get(goal.project),
        name: goal.name,
        target: goal.target,
        starts_on: goal.starts_on,
        ends_on: goal.ends_on,
        reward: goal.reward
      }))
    )
  )

  const logs: Record<string, unknown>[] = []
  for (const goal of goals) {
    const days = eachDay(goal.starts_on, goal.ends_on < TODAY ? goal.ends_on : TODAY).filter(
      (day) => isWorkingDay(day) && (!goal.saturdays || weekdayOf(day) === 6)
    )
    let left = goal.achieved
    while (left > 0) {
      const achieved = Math.min(left, weighted([[1, 6], [2, 3], [3, 1]] as const))
      logs.push({ goal_id: goal.id, user_id: employee.id, logged_on: pick(days), achieved })
      left -= achieved
    }
  }
  logs.sort((a, b) => String(a.logged_on).localeCompare(String(b.logged_on)))
  await insertAll('goal_logs', logs)
  console.log(`  ${PROJECTS.length} projects, ${goals.length} goals, ${logs.length} goal filings`)
}

const FIRST_NAMES = [
  'Rahul', 'Neha', 'Amit', 'Pooja', 'Siddharth', 'Kavya', 'Suresh', 'Divya', 'Arjun', 'Rutuja', 'Nikhil', 'Isha',
  'Manoj', 'Ritu', 'Sanjay', 'Tanvi', 'Deepak', 'Anjali', 'Harsh', 'Shreya', 'Gaurav', 'Nisha', 'Yash', 'Sayali',
  'Kunal', 'Swati', 'Aditya', 'Farah', 'Imran', 'Zoya', 'Omkar', 'Prachi', 'Hitesh', 'Bhavna', 'Jignesh', 'Hetal',
  'Clinton', 'Sharon', 'Glen', 'Rhea', 'Sameer', 'Aparna', 'Tejas', 'Mansi', 'Varun', 'Komal', 'Faisal', 'Sana'
]
const LAST_NAMES = [
  'Patil', 'Deshmukh', 'Joshi', 'Kulkarni', 'Sawant', 'Naik', 'Chavan', 'Gokhale', 'Rane', 'Shinde', 'Shah',
  'Mehta', 'Jain', 'Desai', 'Parekh', 'Doshi', 'Iyer', 'Nair', 'Menon', 'Pillai', 'Fernandes', 'Pinto', "D'Souza",
  'Rodrigues', 'Khan', 'Shaikh', 'Ansari', 'Gupta', 'Agarwal', 'Malhotra', 'Kapoor', 'Bhatia', 'Singh', 'Mishra'
]

const SOURCES: ReadonlyArray<readonly [{ source: string; names: string[] }, number]> = [
  [{ source: '99acres', names: ['Premium listing', 'Project page'] }, 18],
  [{ source: 'MagicBricks', names: ['Featured listing', 'Project page'] }, 14],
  [{ source: 'Housing.com', names: ['Project page', 'Boosted listing'] }, 10],
  [{ source: 'Facebook Ads', names: ['Monsoon Offer', 'Ready Possession', 'Navratri Prelaunch'] }, 16],
  [{ source: 'Instagram', names: ['Reels campaign', 'Story ads'] }, 6],
  [{ source: 'Google Ads', names: ['Search: 2 BHK Andheri', 'Search: Thane flats', 'Brand search'] }, 12],
  [{ source: 'Channel Partner', names: ['Anand Realtors', 'Mumbai Homes Consultants', 'Prime Estate Advisors', 'Western Line Properties'] }, 11],
  [{ source: 'Walk in', names: ['Site office', 'Sample flat'] }, 7],
  [{ source: 'Referral', names: ['Existing customer', 'Friend of buyer'] }, 4],
  [{ source: 'Website', names: ['Enquiry form', 'Brochure download'] }, 2]
]

const POSSESSIONS: ReadonlyArray<readonly [string, number]> = [
  ['Under 6 months', 3],
  ['6 months to 1 year', 4],
  ['More than 1 year', 3]
]

const LOST_REASONS: ReadonlyArray<readonly [string, number]> = [
  ['Price too high', 30],
  ['Loan not approved', 12],
  ['Location did not suit', 14],
  ['Bought elsewhere', 18],
  ['Not responding', 20],
  ['Not a serious buyer', 6]
]

const META_SOURCES = new Set(['Facebook Ads', 'Instagram'])

const NOTES = [
  'Wants a higher floor with sea view if available.',
  'Prefers east facing; parents moving in with them.',
  'Home loan preapproved with SBI.',
  'Home loan in process with HDFC, sanction expected in two weeks.',
  'Upgrading from a 1 BHK in Goregaon.',
  'NRI buyer based in Dubai; calls after 8 pm IST only.',
  'Needs possession before school admissions in June.',
  'Comparing with a Lodha project nearby.',
  'Asked for the stamp duty and registration breakup.',
  'Wants to visit with spouse on Saturday.',
  'Looking for covered parking for two cars.',
  'Investor; interested in rental yield near the metro line.',
  'Asked about the 20:80 payment plan.',
  'Close to the office in BKC is the priority.',
  null,
  null,
  null
]

const FUNNEL = {
  booked: ['contacted', 'site_visit_scheduled', 'site_visit_done', 'revisit_scheduled', 'booked', 'documentation', 'agreement_done', 'disbursement_done', 'closed'],
  engaged: ['contacted', 'site_visit_scheduled', 'site_visit_done', 'revisit_scheduled'],
  cold: ['ringing', 'contacted']
}

const STEP_GAP: Record<string, [number, number]> = {
  contacted: [0, 2],
  ringing: [0, 1],
  site_visit_scheduled: [1, 4],
  site_visit_done: [2, 7],
  revisit_scheduled: [3, 10],
  booked: [4, 18],
  documentation: [3, 8],
  agreement_done: [10, 25],
  disbursement_done: [15, 35],
  closed: [5, 15],
  lost: [3, 21]
}

function phoneNumber(used: Set<string>): string {
  for (;;) {
    const digits = `${pick(['9', '9', '9', '8', '8', '7', '7', '6'])}${String(between(0, 999_999_999)).padStart(9, '0')}`
    if (used.has(digits)) continue
    used.add(digits)
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`
  }
}

async function seedLeads(owner: Person, employee: Person) {
  const firstName = (person: Person) => person.name.split(' ')[0]
  const leads: Record<string, unknown>[] = []
  const events: Record<string, unknown>[] = []
  const usedPhones = new Set<string>()
  const campaigns = new Map<string, { platform: string; from: IsoDate }>()

  for (const day of eachDay(START, TODAY)) {
    const weekday = weekdayOf(day)
    const weekendLift = weekday === 0 ? 1.45 : weekday === 6 ? 1.3 : 1
    const count = poisson(1.1 * seasonOf(day) * weekendLift * (HOLIDAYS.has(day) ? 0.5 : 1))

    for (let n = 0; n < count; n += 1) {
      const open = PROJECTS.filter((p) => !p.closedFrom || day < p.closedFrom)
      const project = weighted(open.map((p) => [p, p.share] as const))
      const [configuration, , low, high] = weighted(project.configurations.map((c) => [c, c[1]] as const))
      const source = weighted(SOURCES)
      const possession = weighted(POSSESSIONS)
      const id = randomUUID()
      const createdAt = stamp(day, weekday === 0 || weekday === 6 ? between(10, 18) : between(9, 21))
      const age = daysBetween(day, TODAY)
      const phone = phoneNumber(usedPhones)
      const step = high - low > 60 ? 10 : 5
      const budget = Math.round(between(low, high) / step) * step * LAKH

      const premium = budget >= 300 * LAKH
      const handlers =
        age <= 4 && chance(0.6)
          ? []
          : premium && chance(0.6)
            ? [owner]
            : chance(0.06)
              ? [employee, owner]
              : [employee]

      const sourceName = pick(source.names)
      const meta = META_SOURCES.has(source.source)
      if (meta && !campaigns.has(sourceName)) {
        campaigns.set(sourceName, { platform: source.source === 'Instagram' ? 'Instagram' : 'Facebook', from: day })
      }

      events.push(
        meta
          ? { lead_id: id, at: iso(createdAt), event: 'created', by_name: 'Meta', reason: `From ${sourceName}` }
          : { lead_id: id, at: iso(createdAt), event: 'created', by_id: owner.id, by_name: owner.name }
      )

      let cursor = createdAt
      let status = 'new'
      let touched: number | null = null
      let lostReason: string | null = null

      if (handlers.length > 0) {
        cursor = Math.min(cursor + between(1, 6) * 3_600_000, NOW)
        const names = handlers.map((person) => person.name).join(', ')
        events.push({
          lead_id: id,
          at: iso(cursor),
          event: 'assigned',
          to_value: names,
          assignee_ids: handlers.map((person) => person.id),
          assignee_names: names,
          by_id: owner.id,
          by_name: owner.name
        })
        touched = cursor

        const drawn = weighted([['booked', 8], ['engaged', 36], ['cold', 22], ['lost', 34]] as const)
        const staleEngaged = drawn === 'engaged' && age > 75 && chance(0.7)
        const staleCold = drawn === 'cold' && age > 30 && chance(0.85)
        const outcome = staleEngaged || staleCold ? 'lost' : drawn
        const path =
          outcome === 'lost'
            ? [...pick([FUNNEL.cold, FUNNEL.engaged.slice(0, 2), FUNNEL.engaged.slice(0, 3)]), 'lost']
            : outcome === 'engaged'
              ? FUNNEL.engaged.slice(0, weighted([[1, 3], [2, 3], [3, 3], [4, 2]] as const))
              : FUNNEL[outcome]
        const handler = handlers[0]!

        for (const next of path) {
          const [min, max] = STEP_GAP[next]!
          const at = cursor + between(min, max) * 86_400_000 + between(1, 8) * 3_600_000
          if (at > NOW) break
          if (next === 'lost') lostReason = weighted(LOST_REASONS)
          for (let n = between(1, 3); n > 0; n -= 1) {
            events.push({
              lead_id: id,
              at: iso(at - n * between(20, 240) * 60_000),
              event: 'call',
              by_id: handler.id,
              by_name: handler.name,
              assignee_ids: [handler.id]
            })
          }
          events.push({
            lead_id: id,
            at: iso(at),
            event: 'updated',
            field: 'status',
            from_value: status,
            to_value: next,
            by_id: handler.id,
            by_name: handler.name,
            reason: next === 'lost' ? lostReason : null
          })
          status = next
          cursor = at
          touched = at
        }
      }

      let assigneeIds = handlers.map((person) => person.id)
      const terminal = status === 'closed' || status === 'lost'

      if (!terminal && handlers.length === 1 && handlers[0] === owner && touched !== null && chance(0.4)) {
        const at = Math.min(touched + between(1, 3) * 86_400_000, NOW)
        assigneeIds = [employee.id]
        events.push({
          lead_id: id,
          at: iso(at),
          event: 'assigned',
          to_value: employee.name,
          assignee_ids: assigneeIds,
          assignee_names: employee.name,
          by_id: owner.id,
          by_name: owner.name,
          reason: `${firstName(employee)} to take the site visit and paperwork`
        })
        touched = at
      }

      let followUp: string | null = null
      if (!terminal && touched !== null) {
        const idle = (NOW - touched) / 86_400_000
        const due = idle < 10 || chance(0.6) ? addDays(TODAY, between(0, 6)) : addDays(TODAY, -between(1, 12))
        followUp = iso(stamp(due, between(10, 19), pick([0, 15, 30, 45])))
      }

      leads.push({
        id,
        lead_date: day,
        name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
        phone,
        phone_key: phoneKey(phone),
        source: source.source,
        source_name: sourceName,
        campaign: meta ? sourceName : null,
        meta_id: meta ? `demo-${id}` : null,
        project: project.name,
        possession,
        budget,
        configuration,
        status,
        priority: chance(0.15) ? pick(['high', 'medium', 'low']) : priorityForPossession(possession),
        next_follow_up_at: followUp,
        assignee_ids: assigneeIds,
        lost_reason: lostReason,
        notes: pick(NOTES),
        created_by: meta ? 'Meta' : owner.name,
        created_at: iso(createdAt),
        updated_at: iso(touched ?? createdAt),
        touched_at: touched === null ? null : iso(touched)
      })
    }
  }

  await insertAll('leads', leads)
  events.sort((a, b) => String(a.at).localeCompare(String(b.at)))
  await insertAll('lead_events', events)
  await insertAll(
    'campaigns',
    [...campaigns].map(([name, c], index) => ({ name, platform: c.platform, started_on: c.from, stopped: index === 0 }))
  )

  const byStatus = new Map<string, number>()
  for (const lead of leads) byStatus.set(String(lead.status), (byStatus.get(String(lead.status)) ?? 0) + 1)
  console.log(`  ${leads.length} leads, ${events.length} lead events`)
  console.log(`  ${[...byStatus.entries()].map(([s, n]) => `${s} ${n}`).join(', ')}`)
}

async function main() {
  console.log(`Seeding ${START} to ${TODAY}`)
  console.log('Accounts')
  const { owner, employee } = await loadPeople()

  console.log('Clearing CRM tables')
  await wipe()

  console.log('Data')
  await seedProjects(employee)
  await seedLeads(owner, employee)
  await seedReports(employee)

  console.log('\nDone.')
}

main().catch((error) => {
  console.error(`\nSeed failed: ${(error as Error).message}`)
  process.exit(1)
})
