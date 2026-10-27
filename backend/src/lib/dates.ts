import { config } from '../config.ts'

const APP_TIME_ZONE = config.timeZone

const DAY = 86_400_000

const keyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
})

export type IsoDate = string
export type Period = string

const pad = (value: number) => String(value).padStart(2, '0')

export function todayKey(now: Date = new Date()): IsoDate {
  return keyFormatter.format(now)
}

export function currentPeriod(now: Date = new Date()): Period {
  return todayKey(now).slice(0, 7)
}

export function isPeriod(value: unknown): value is Period {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export function daysInMonth(period: Period): number {
  const [year, month] = period.split('-').map(Number)
  return new Date(Date.UTC(year!, month!, 0)).getUTCDate()
}

export function monthBounds(period: Period): { from: IsoDate; to: IsoDate } {
  return { from: `${period}-01`, to: `${period}-${pad(daysInMonth(period))}` }
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10)
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY)
}

export function eachDay(from: IsoDate, to: IsoDate): IsoDate[] {
  const days: IsoDate[] = []
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day)
  return days
}

export function isSunday(date: IsoDate): boolean {
  return new Date(`${date}T00:00:00Z`).getUTCDay() === 0
}

export function monthsBetween(from: IsoDate, to: IsoDate): Period[] {
  const months: Period[] = []
  let [year, month] = from.split('-').map(Number) as [number, number]
  const end = to.slice(0, 7)

  while (`${year}-${pad(month)}` <= end) {
    months.push(`${year}-${pad(month)}`)
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }
  return months
}

export function wholeDaysSince(iso: string | null, now: number = Date.now()): number | null {
  if (!iso) return null
  const at = Date.parse(iso)
  if (Number.isNaN(at)) return null
  return Math.max(0, Math.floor((now - at) / DAY))
}

export function shiftPeriod(period: Period, by: number): Period {
  const [year, month] = period.split('-').map(Number)
  const date = new Date(Date.UTC(year!, month! - 1 + by, 1))
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`
}

export function zonedInstant(day: IsoDate, hour: number, minute = 0): Date {
  const guess = Date.parse(`${day}T${pad(hour)}:${pad(minute)}:00Z`)
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: APP_TIME_ZONE,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
      .formatToParts(new Date(guess))
      .map((part) => [part.type, part.value])
  )
  const shown = Date.parse(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00Z`)
  return new Date(guess - (shown - guess))
}
