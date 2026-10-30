import { useState } from 'react'

import { splitByCounts } from '@logic/rules/transfer'

export function useTeamSplit(leadIds: string[]) {
  const [picked, setPicked] = useState<string[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const size = leadIds.length

  const even = (index: number) => Math.floor(size / picked.length) + (index < size % picked.length ? 1 : 0)
  const countFor = (id: string) => counts[id] ?? even(picked.indexOf(id))
  const total = picked.reduce((sum, id) => sum + countFor(id), 0)
  const plan = splitByCounts(leadIds, picked.map((userId) => ({ userId, count: countFor(userId) })))

  const pick = (ids: string[]) => {
    setPicked(ids)
    setCounts({})
  }

  return {
    size,
    picked,
    plan,
    total,
    over: total - size,
    custom: Object.keys(counts).length > 0,
    countFor,
    pick,
    toggle: (id: string) => pick(picked.includes(id) ? picked.filter((value) => value !== id) : [...picked, id]),
    setCount: (id: string, value: string) => {
      const count = Number(value.replace(/\D/g, '').slice(0, 4)) || 0
      setCounts(Object.fromEntries(picked.map((userId) => [userId, userId === id ? count : countFor(userId)])))
    },
    splitEqually: () => setCounts({})
  }
}
