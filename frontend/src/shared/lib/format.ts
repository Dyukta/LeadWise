const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
const compact = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 })

export const formatMoney = (amount: number) => money.format(amount)

export const compactMoney = (amount: number) => `₹${compact.format(amount)}`

const UNITS: [RegExp, number][] = [
  [/^(crores?|cr|c)$/, 10_000_000],
  [/^(lakhs?|lacs?|lkhs?|lk|l)$/, 100_000],
  [/^(thousand|k)$/, 1_000]
]

export function parseAmount(text: string): number {
  const match = text.toLowerCase().replace(/^\s*(rs\.?|inr|₹)/, '').replace(/[,\s₹]/g, '').match(/^(\d*\.?\d+)([a-z]*)$/)
  if (!match) return NaN
  const unit = match[2] ? UNITS.find(([pattern]) => pattern.test(match[2]!))?.[1] : 1
  return unit ? Math.round(Number(match[1]) * unit) : NaN
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}

export function niceTop(max: number, empty: number): number {
  if (max <= 0) return empty
  const step = Math.max(1, 10 ** Math.floor(Math.log10(max)) / 2)
  return Math.ceil(max / (2 * step)) * 2 * step
}
