const key = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ')

export function samePerson(a: string | null, b: string | null): boolean {
  if (!a || !b) return false
  return key(a) === key(b)
}
