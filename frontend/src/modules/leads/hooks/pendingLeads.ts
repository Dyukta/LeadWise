import { useSyncExternalStore } from 'react'

import type { Lead, NewLead } from '@modules/leads/api/leadTypes'

const TTL = 120_000

type Held = { lead: Lead; key: string; at: number }

let held: Held[] = []
let snapshot: Lead[] = []
const listeners = new Set<() => void>()

export function phoneKey(phone: string | null): string {
  const digits = (phone ?? '').replace(/\D/g, '')
  return digits.length > 10 ? digits.slice(-10) : digits
}

function publish(next: Held[]) {
  if (next.length === held.length && next.every((row, i) => row === held[i])) return
  held = next
  snapshot = next.map((row) => row.lead)
  for (const listener of listeners) listener()
}

function subscribePending(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function pendingSnapshot(): Lead[] {
  return snapshot
}

export function usePendingLeads(): Lead[] {
  return useSyncExternalStore(subscribePending, pendingSnapshot)
}

export function holdPending(rows: NewLead[], now = Date.now()): void {
  const fresh: Held[] = rows.map((row) => {
    const key = phoneKey(row.phone)
    const budget = Number(row.budget)

    return {
      key,
      at: now,
      lead: {
        id: `pending-${key}-${now}`,
        pending: true,
        month: row.date.slice(0, 7),
        name: row.name,
        phone: row.phone,
        source: row.source || null,
        sourceName: row.sourceName || null,
        project: row.project || null,
        possession: row.possession || null,
        budget: Number.isFinite(budget) && row.budget !== '' ? budget : null,
        configuration: row.configuration || null,
        status: 'new',
        isTerminal: false,
        view: 'unassigned',
        canEdit: false,
        canAssign: true,
        priority: null,
        nextFollowUpAt: null,
        assignees: [],
        lostReason: null,
        notes: null,
        previousLeadId: null,
        untouchedDays: 0,
        history: [],
        events: [],
        createdAt: new Date(now).toISOString(),
        updatedAt: null
      }
    }
  })

  publish([...held, ...fresh.filter((row) => row.key !== '')])
}

export function prunePending(landed: Set<string>, now = Date.now()): void {
  publish(held.filter((row) => !landed.has(row.key) && now - row.at < TTL))
}
