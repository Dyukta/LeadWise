export type GradeLetter = 'A' | 'B' | 'C'
type GradeLabel = 'HIGH' | 'MEDIUM' | 'LOW'

const GRADE_LABELS: Record<GradeLetter, GradeLabel> = {
  A: 'HIGH',
  B: 'MEDIUM',
  C: 'LOW'
}

const GRADE_COLORS: Record<GradeLetter, string> = {
  A: 'var(--color-grade-a)',
  B: 'var(--color-grade-b)',
  C: 'var(--color-grade-c)'
}

export const NEUTRAL_COLOR = '#94a3b8'

export const GRADE_TONES: Record<GradeLetter, 'success' | 'warning' | 'danger'> = {
  A: 'success',
  B: 'warning',
  C: 'danger'
}

export function gradeFor(pct: number | null): GradeLetter | null {
  return pct === null ? null : pct > 80 ? 'A' : pct >= 50 ? 'B' : 'C'
}

export function gradeLabel(letter: GradeLetter | null): GradeLabel | 'N/A' {
  return letter ? GRADE_LABELS[letter] : 'N/A'
}

export function gradeColor(letter: GradeLetter | null): string {
  return letter ? GRADE_COLORS[letter] : NEUTRAL_COLOR
}
