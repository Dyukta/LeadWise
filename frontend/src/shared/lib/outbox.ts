import { useSyncExternalStore } from 'react'

import { send, type BackendError } from '@shared/lib/backend'
import { readCachedSession } from '@shared/lib/sessionCache'
import { toast } from '@shared/lib/toast'

export type Job = { id: string; user: string; action: string; args: unknown[]; done?: boolean }

const KEY = 'leadwise.outbox'
const listeners = new Set<() => void>()
let jobs = load()
let running = false
let onDrained: () => Promise<unknown> = async () => {}

function load(): Job[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

function update(change: (list: Job[]) => Job[]) {
  jobs = change(load())
  try {
    localStorage.setItem(KEY, JSON.stringify(jobs))
  } catch {}
  listeners.forEach((listener) => listener())
}

const me = () => readCachedSession<{ userId: string }>()?.userId ?? ''

export function enqueue(action: string, ...args: unknown[]) {
  update((list) => [...list, { id: crypto.randomUUID(), user: me(), action, args }])
  void flushOutbox()
}

export async function flushOutbox() {
  if (running) return
  running = true
  let delay = 2000
  try {
    for (;;) {
      const job = load().find((entry) => !entry.done && entry.user === me())
      if (!job) break
      try {
        await send(job.action, job.args, job.id)
        update((list) => list.map((entry) => (entry.id === job.id ? { ...entry, done: true } : entry)))
        delay = 2000
      } catch (error) {
        if ((error as BackendError).retry) {
          await new Promise((resolve) => setTimeout(resolve, delay))
          delay = Math.min(delay * 2, 30_000)
          continue
        }
        update((list) => list.filter((entry) => entry.id !== job.id))
        toast(`Change not saved: ${(error as Error).message}`, 'error')
      }
    }
    const finished = new Set(load().filter((entry) => entry.done).map((entry) => entry.id))
    if (finished.size) {
      await onDrained().catch(() => {})
      update((list) => list.filter((entry) => !finished.has(entry.id)))
    }
  } finally {
    running = false
  }
}

export function startOutbox(drained: () => Promise<unknown>) {
  onDrained = drained
  window.addEventListener('storage', (event) => {
    if (event.key !== KEY) return
    jobs = load()
    listeners.forEach((listener) => listener())
  })
  window.addEventListener('beforeunload', (event) => {
    if (load().some((entry) => !entry.done && entry.user === me())) event.preventDefault()
  })
  void flushOutbox()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const useOutbox = () => useSyncExternalStore(subscribe, () => jobs)
