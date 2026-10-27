export function formatPercent(value: number, options: { withSymbol?: boolean } = {}): string {
  const formatted = value.toFixed(1)
  return options.withSymbol === false ? formatted : `${formatted}%`
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}
