type Period = string

type DailyLike = {
  day: number
  achieved: number
  attendanceStatus: 'present' | 'half-day' | 'absent' | 'weekly-off'
}

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
]

export type TrendPoint = {
  label: string
  caption: string
  achieved: number | null
  hasRecord: boolean
  isAbsent: boolean
  isOff: boolean
  isSunday: boolean
}

export type IsoDate = string

const pad = (value: number) => String(value).padStart(2, '0')

const makePeriod = (year: number, month: number) => `${year}-${pad(month)}`

const daysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate()

function parts(date: IsoDate) {
  const [year, month, day] = date.split('-').map(Number)
  return { year: year ?? 0, month: month ?? 0, day: day ?? 0 }
}

function isoDate(year: number, month: number, day: number): IsoDate {
  return `${year}-${pad(month)}-${pad(day)}`
}

export function monthBounds(period: Period): { from: IsoDate; to: IsoDate } {
  const [year, month] = period.split('-').map(Number)
  return {
    from: isoDate(year!, month!, 1),
    to: isoDate(year!, month!, daysInMonth(year!, month!))
  }
}

export function monthsBetween(from: IsoDate, to: IsoDate): Period[] {
  const start = parts(from)
  const end = parts(to)
  if (!start.year || !end.year || from > to) return []

  const months: Period[] = []
  let { year, month } = start

  while (year < end.year || (year === end.year && month <= end.month)) {
    months.push(makePeriod(year, month))
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }

  return months
}

const shortMonth = (month: number) => SHORT_MONTHS[month - 1] ?? ''

export function buildTrendPoints(
  recordsByPeriod: Map<Period, DailyLike[]>,
  from: IsoDate,
  to: IsoDate
): TrendPoint[] {
  const start = parts(from)
  const end = parts(to)
  if (!start.year || !end.year || from > to) return []

  const oneMonth = start.year === end.year && start.month === end.month
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const cursor = new Date(start.year, start.month - 1, start.day)
  const last = new Date(end.year, end.month - 1, end.day)
  const points: TrendPoint[] = []

  while (cursor <= last) {
    const year = cursor.getFullYear()
    const month = cursor.getMonth() + 1
    const day = cursor.getDate()

    const record = recordsByPeriod.get(makePeriod(year, month))?.find((row) => row.day === day)
    const isAbsent = record?.attendanceStatus === 'absent'

    const isOff = record?.attendanceStatus === 'weekly-off'

    points.push({
      label: oneMonth ? String(day) : `${day} ${shortMonth(month)}`,
      caption: `${day} ${shortMonth(month)} ${year}`,
      achieved: isOff ? null : record ? (isAbsent ? 0 : record.achieved) : cursor > today ? null : 0,
      hasRecord: record !== undefined,
      isAbsent,
      isOff,
      isSunday: cursor.getDay() === 0
    })

    cursor.setDate(day + 1)
  }

  return points
}

function toWeek(chunk: TrendPoint[]): TrendPoint {
  const counted = chunk.filter((point) => point.achieved !== null)

  return {
    label: `${chunk[0]!.label} to ${chunk[chunk.length - 1]!.label}`,
    caption: `${chunk[0]!.caption} to ${chunk[chunk.length - 1]!.caption}`,
    achieved:
      counted.length === 0
        ? null
        : counted.reduce((sum, point) => sum + (point.achieved ?? 0), 0),
    hasRecord: chunk.some((point) => point.hasRecord),
    isAbsent: false,
    isOff: chunk.every((point) => point.isOff),
    isSunday: false
  }
}

export function buildWeeks(days: TrendPoint[]): TrendPoint[] {
  const weeks: TrendPoint[] = []
  let chunk: TrendPoint[] = []

  for (const day of days) {
    if (day.isSunday && chunk.length > 0) {
      weeks.push(toWeek(chunk))
      chunk = []
    }
    chunk.push(day)
  }
  if (chunk.length > 0) weeks.push(toWeek(chunk))

  return weeks
}
