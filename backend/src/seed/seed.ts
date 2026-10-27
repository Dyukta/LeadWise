import { randomUUID } from 'node:crypto'

import { db, must } from '../db.ts'
import { addDays, currentPeriod, daysBetween, eachDay, shiftPeriod, todayKey, zonedInstant, type IsoDate } from '../lib/dates.ts'
import { phoneKey } from '../services/leadRules.ts'

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
    ['lead_events', 'id'],
    ['leads', 'id'],
    ['campaigns', 'id'],
    ['projects', 'id']
  ]
  for (const [table, column] of tables) must(await db.from(table).delete().not(column, 'is', null))
}

async function insertAll(table: string, rows: Record<string, unknown>[]) {
  for (let i = 0; i < rows.length; i += 500) must(await db.from(table).insert(rows.slice(i, i + 500)))
}

type Project = { name: string; active: boolean; closedFrom: IsoDate | null; share: number; deal: [number, number]; team: boolean }

const LAKH = 100_000

// deal: closed deal size in lakh. team: the demo employee is a member.
const PROJECTS: Project[] = [
  { name: 'Skyline Residency, Andheri West', active: true, closedFrom: null, share: 0.3, deal: [145, 480], team: true },
  { name: 'Harbour Heights, Chembur', active: true, closedFrom: null, share: 0.22, deal: [115, 360], team: true },
  { name: 'Lakeview Towers, Thane West', active: true, closedFrom: null, share: 0.28, deal: [78, 240], team: true },
  { name: 'Palm Grove, Kharghar', active: true, closedFrom: null, share: 0.12, deal: [62, 135], team: false },
  { name: 'Sea Breeze Residences, Borivali West', active: false, closedFrom: addDays(START, 115), share: 0.08, deal: [185, 375], team: true }
]

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

type Source = { platform: 'Facebook' | 'Instagram' | null; names: string[] }

// Lead DGC gets leads from Meta lead forms (tagged with the campaign) and from Excel uploads.
const SOURCES: ReadonlyArray<readonly [Source, number]> = [
  [{ platform: 'Facebook', names: ['Monsoon Offer', 'Ready Possession', 'Navratri Prelaunch', 'Weekend Site Visit'] }, 46],
  [{ platform: 'Instagram', names: ['Reels campaign', 'Story ads'] }, 24],
  [{ platform: null, names: ['Property expo leads.xlsx', 'Channel partner list.xlsx', 'Old enquiries.xlsx'] }, 30]
]

const LOST_REASONS: ReadonlyArray<readonly [string, number]> = [
  ['Price too high', 30],
  ['Loan not approved', 12],
  ['Location did not suit', 14],
  ['Bought elsewhere', 18],
  ['Not responding', 20],
  ['Not a serious buyer', 6]
]

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

// Stages follow Lead DGC: unreachable tries, then interested, details sent, registration, closed.
const FUNNEL = {
  won: ['interested', 'sent_details', 'reg_done', 'closed'],
  engaged: ['interested', 'sent_details', 'reg_done'],
  cold: ['not_answered', 'call_back_later', 'not_reachable', 'switched_off', 'call_after_some_time']
}

const DEAD_ENDS = [['lost', 5], ['not_interested', 4], ['invalid_number', 1]] as const

const STEP_GAP: Record<string, [number, number]> = {
  not_answered: [0, 1],
  not_reachable: [0, 2],
  switched_off: [0, 2],
  call_back_later: [0, 2],
  call_after_some_time: [1, 4],
  interested: [0, 3],
  sent_details: [0, 2],
  reg_done: [3, 14],
  closed: [5, 20],
  lost: [3, 21],
  not_interested: [0, 5],
  invalid_number: [0, 1]
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
    const expected = poisson(1.1 * seasonOf(day) * weekendLift * (HOLIDAYS.has(day) ? 0.5 : 1))
    // A few fresh leads today so the owner has something to share out.
    const count = day === TODAY ? Math.max(expected, 5) : expected

    for (let n = 0; n < count; n += 1) {
      const open = PROJECTS.filter((p) => !p.closedFrom || day < p.closedFrom)
      const project = weighted(open.map((p) => [p, p.share] as const))
      const source = weighted(SOURCES)
      const id = randomUUID()
      const createdAt = stamp(day, weekday === 0 || weekday === 6 ? between(10, 18) : between(9, 21))
      const age = daysBetween(day, TODAY)
      const phone = phoneNumber(usedPhones)
      const premium = project.deal[1] >= 300 && chance(0.4)
      const handlers =
        (age <= 4 && chance(0.6)) || day === TODAY
          ? []
          : premium && chance(0.6)
            ? [owner]
            : chance(0.06)
              ? [employee, owner]
              : [employee]

      const sourceName = pick(source.names)
      const meta = source.platform !== null
      if (meta && !campaigns.has(sourceName)) campaigns.set(sourceName, { platform: source.platform!, from: day })

      events.push(
        meta
          ? { lead_id: id, at: iso(createdAt), event: 'created', by_name: 'Meta', reason: `From ${sourceName}` }
          : { lead_id: id, at: iso(createdAt), event: 'created', by_id: owner.id, by_name: owner.name, reason: `From ${sourceName}` }
      )
      // Some buyers enquire again later; Lead DGC logs that as a repeat on the same lead.
      if (chance(0.08) && age > 3) {
        const at = Math.min(createdAt + between(2, Math.min(age, 40)) * 86_400_000, NOW)
        events.push({ lead_id: id, at: iso(at), event: 'repeat', by_name: meta ? 'Meta' : owner.name, reason: `From ${sourceName}` })
      }

      let cursor = createdAt
      let status = 'new'
      let touched: number | null = null
      let lostReason: string | null = null
      let amount: number | null = null

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

        const drawn = weighted([['won', 8], ['engaged', 36], ['cold', 22], ['lost', 34]] as const)
        const staleEngaged = drawn === 'engaged' && age > 75 && chance(0.7)
        const staleCold = drawn === 'cold' && age > 30 && chance(0.85)
        const outcome = staleEngaged || staleCold ? 'lost' : drawn
        const tries = () => [pick(FUNNEL.cold), ...(chance(0.4) ? [pick(FUNNEL.cold)] : [])]
        const path: string[] =
          outcome === 'lost'
            ? [...pick([tries(), FUNNEL.engaged.slice(0, 1), FUNNEL.engaged.slice(0, 2)]), weighted(DEAD_ENDS)]
            : outcome === 'engaged'
              ? FUNNEL.engaged.slice(0, weighted([[1, 4], [2, 4], [3, 2]] as const))
              : outcome === 'cold'
                ? tries()
                : [...(chance(0.3) ? ['call_back_later'] : []), ...FUNNEL.won]
        const handler = handlers[0]!

        for (const next of path) {
          const [min, max] = STEP_GAP[next]!
          const at = cursor + between(min, max) * 86_400_000 + between(1, 8) * 3_600_000
          if (at > NOW) break
          if (next === 'lost') lostReason = weighted(LOST_REASONS)
          if (next === 'closed') amount = Math.round(between(project.deal[0], project.deal[1]) / 5) * 5 * LAKH
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
          if (next === 'closed') {
            events.push({ lead_id: id, at: iso(at), event: 'updated', field: 'amount', from_value: null, to_value: String(amount), by_id: handler.id, by_name: handler.name })
          }
          status = next
          cursor = at
          touched = at
        }
      }

      let assigneeIds = handlers.map((person) => person.id)
      const terminal = status === 'closed' || status === 'lost'
      const deadEnd = terminal || status === 'not_interested' || status === 'invalid_number'

      if (!deadEnd && handlers.length === 1 && handlers[0] === owner && touched !== null && chance(0.4)) {
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
          reason: `${firstName(employee)} to take the follow up`
        })
        touched = at
      }

      let followUp: string | null = null
      if (!deadEnd && touched !== null) {
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
        source: meta ? source.platform : owner.name,
        source_name: sourceName,
        campaign: meta ? sourceName : null,
        meta_id: meta ? `demo-${id}` : null,
        project: project.name,
        status,
        priority: handlers.length > 0 && chance(0.6) ? weighted([['high', 2], ['medium', 4], ['low', 3]] as const) : null,
        amount,
        next_follow_up_at: followUp,
        assignee_ids: assigneeIds,
        lost_reason: lostReason,
        notes: pick(NOTES),
        created_at: iso(createdAt),
        updated_at: iso(touched ?? createdAt),
        touched_at: touched === null ? null : iso(touched)
      })
    }
  }

  await insertAll(
    'projects',
    PROJECTS.map((p) => ({ name: p.name, active: p.active, member_ids: p.team ? [employee.id] : [] }))
  )
  await insertAll('leads', leads)
  events.sort((a, b) => String(a.at).localeCompare(String(b.at)))
  await insertAll('lead_events', events)
  await insertAll(
    'campaigns',
    [...campaigns].map(([name, c], index) => ({ name, platform: c.platform, source_id: 'meta', started_on: c.from, stopped: index === 0 }))
  )

  const byStatus = new Map<string, number>()
  for (const lead of leads) byStatus.set(String(lead.status), (byStatus.get(String(lead.status)) ?? 0) + 1)
  console.log(`  ${PROJECTS.length} projects, ${campaigns.size} campaigns, ${leads.length} leads, ${events.length} lead events`)
  console.log(`  ${[...byStatus.entries()].map(([s, n]) => `${s} ${n}`).join(', ')}`)
}

async function main() {
  console.log(`Seeding ${START} to ${TODAY}`)
  console.log('Accounts')
  const { owner, employee } = await loadPeople()

  console.log('Clearing CRM tables')
  await wipe()

  console.log('Data')
  await seedLeads(owner, employee)

  console.log('\nDone.')
}

main().catch((error) => {
  console.error(`\nSeed failed: ${(error as Error).message}`)
  process.exit(1)
})
