import { sameProject } from './projects.ts'

type BudgetBand = {
  id: string
  label: string
  min: number
  max: number | null
}

const LAKH = 100_000
const CRORE = 10_000_000

export const BUDGET_BANDS: BudgetBand[] = [
  { id: 'under-50l', label: 'Under ₹50 L', min: 0, max: 50 * LAKH },
  { id: '50l-75l', label: '₹50 L to ₹75 L', min: 50 * LAKH, max: 75 * LAKH },
  { id: '75l-1cr', label: '₹75 L to ₹1 Cr', min: 75 * LAKH, max: 1 * CRORE },
  { id: '1cr-1.5cr', label: '₹1 Cr to ₹1.5 Cr', min: 1 * CRORE, max: 1.5 * CRORE },
  { id: '1.5cr-2cr', label: '₹1.5 Cr to ₹2 Cr', min: 1.5 * CRORE, max: 2 * CRORE },
  { id: 'above-2cr', label: 'Above ₹2 Cr', min: 2 * CRORE, max: null }
]

function budgetBandById(id: string): BudgetBand | undefined {
  return BUDGET_BANDS.find((band) => band.id === id)
}

function isInBudgetBand(budget: number | null, band: BudgetBand): boolean {
  if (budget == null) return false
  if (budget < band.min) return false
  return band.max === null || budget < band.max
}

const BUDGET_UNITS: Array<[RegExp, number]> = [
  [/^(cr|crore|crores)$/, CRORE],
  [/^(l|lac|lacs|lakh|lakhs)$/, LAKH],
  [/^k$/, 1_000]
]

export function parseBudget(input: string): number | null {
  const cleaned = input.replace(/[,₹]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
  if (!cleaned) return null

  const match = /^(\d+(?:\.\d+)?)\s*([a-z]*)$/.exec(cleaned)
  if (!match) return null

  const amount = Number(match[1])
  const unit = match[2] ?? ''
  if (!Number.isFinite(amount)) return null
  if (!unit) return amount

  const found = BUDGET_UNITS.find(([pattern]) => pattern.test(unit))
  return found ? Math.round(amount * found[1]) : null
}

export function formatBudget(budget: number | null): string {
  if (budget == null) return 'N/A'

  if (budget >= CRORE) {
    const crore = budget / CRORE
    return `₹${crore % 1 === 0 ? crore : Number(crore.toFixed(2))} Cr`
  }
  if (budget >= LAKH) {
    const lakh = budget / LAKH
    return `₹${lakh % 1 === 0 ? lakh : Number(lakh.toFixed(1))} L`
  }
  return `₹${budget.toLocaleString('en-IN')}`
}

export type RequirementFilters = {
  budgetBand?: string
  configuration?: string
  project?: string
}

type RequirementLike = {
  budget: number | null
  configuration: string | null
  project: string | null
}

export function matchesRequirements(
  lead: RequirementLike,
  filters: RequirementFilters
): boolean {
  if (filters.configuration && lead.configuration !== filters.configuration) return false
  if (filters.project && !sameProject(lead.project, filters.project)) return false

  if (filters.budgetBand) {
    const band = budgetBandById(filters.budgetBand)
    if (!band || !isInBudgetBand(lead.budget, band)) return false
  }

  return true
}

export function distinctValues<T>(rows: T[], pick: (row: T) => string | null): string[] {
  const seen = new Map<string, string>()
  for (const row of rows) {
    const value = (pick(row) ?? '').trim()
    if (value && !seen.has(value.toLowerCase())) seen.set(value.toLowerCase(), value)
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b))
}
