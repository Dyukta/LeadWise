import { createClient } from '@supabase/supabase-js'

import { config } from './config.ts'

export const db = createClient(config.supabaseUrl, config.supabaseSecretKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

type Page = PromiseLike<{ data: unknown; error: { message: string } | null }>

const PAGE = 1000

export async function selectAll<T>(page: (from: number, to: number) => Page): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    const batch = (data ?? []) as T[]
    rows.push(...batch)
    if (batch.length < PAGE) return rows
  }
}

export function must<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message)
  return result.data
}

export function rows<T>(result: { data: T[] | null; error: { message: string } | null }): T[] {
  return must(result) ?? []
}
