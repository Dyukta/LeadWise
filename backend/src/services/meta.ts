import { config } from '../config.ts'
import { db, must, rows } from '../db.ts'
import { todayKey } from '../lib/dates.ts'
import { addLeads, type IncomingLead } from './intake.ts'
import { phoneKey, sameText } from './leadRules.ts'

const GRAPH = 'https://graph.facebook.com/v23.0'

type Page<T> = { data?: T[]; paging?: { next?: string }; error?: { message: string } }
type Form = { id: string; name: string; status: string }
type MetaLead = {
  id: string
  created_time: string
  field_data?: { name: string; values?: string[] }[]
  campaign_id?: string
  campaign_name?: string
  platform?: string
}
type CampaignRow = { id: string; name: string; stopped: boolean; started_on: string }

async function graph<T>(url: string): Promise<Page<T>> {
  const body = (await (await fetch(url, { signal: AbortSignal.timeout(15_000) })).json()) as Page<T>
  if (body.error) throw new Error(`Meta: ${body.error.message}`)
  return body
}

async function* pages<T>(url: string): AsyncGenerator<T> {
  for (let next: string | undefined = url; next; ) {
    const page: Page<T> = await graph<T>(next)
    yield* page.data ?? []
    next = page.paging?.next
  }
}

const field = (lead: MetaLead, ...names: string[]) =>
  lead.field_data?.find((item) => names.includes(item.name))?.values?.[0] ?? null

const saveState = async (patch: Record<string, unknown>) =>
  must(await db.from('meta_sync').update(patch).eq('id', true))

// ponytail: in-process guard, assumes one API instance; use pg_try_advisory_lock if it ever scales out
let running: Promise<number> | null = null

export function syncMeta(): Promise<number> {
  running ??= pull().finally(() => {
    running = null
  })
  return running
}

async function pull(): Promise<number> {
  const { pageToken, adsToken, adAccount, formIds } = config.meta
  const state = must(await db.from('meta_sync').select('connected, since').eq('id', true).single())
  if (!pageToken || !state?.connected) return 0

  try {
    const forms: Form[] = []
    for await (const form of pages<Form>(`${GRAPH}/me/leadgen_forms?fields=id,name,status&limit=100&access_token=${pageToken}`)) {
      if (formIds.length ? formIds.includes(form.id) : form.status === 'ACTIVE') forms.push(form)
    }

    let live: Set<string> | null = null
    if (adAccount) {
      live = new Set()
      const active = encodeURIComponent('["ACTIVE"]')
      for await (const campaign of pages<{ id: string }>(
        `${GRAPH}/act_${adAccount}/campaigns?fields=id&effective_status=${active}&limit=500&access_token=${adsToken ?? pageToken}`
      )) live.add(campaign.id)
    }

    const campaigns = rows(await db.from('campaigns').select('id, name, stopped, started_on')) as CampaignRow[]
    const since = Number(state.since)
    let newest = since
    const incoming: IncomingLead[] = []

    for (const form of forms) {
      const filter = encodeURIComponent(JSON.stringify([{ field: 'time_created', operator: 'GREATER_THAN', value: since }]))
      const url = `${GRAPH}/${form.id}/leads?fields=id,created_time,field_data,campaign_id,campaign_name,platform&limit=100&filtering=${filter}&access_token=${pageToken}`

      for await (const item of pages<MetaLead>(url)) {
        const created = Date.parse(item.created_time.replace(/([+-]\d{2})(\d{2})$/, '$1:$2'))
        newest = Math.max(newest, Math.floor(created / 1000))
        if (live && item.campaign_id && !live.has(item.campaign_id)) continue

        const platform = /^(ig|instagram)$/i.test(item.platform ?? '') ? 'Instagram' : 'Facebook'
        const name = item.campaign_name ?? 'Meta lead form'
        const day = todayKey(new Date(created))

        let campaign = campaigns.find((row) => sameText(row.name, name))
        if (!campaign) {
          campaign = must(
            await db.from('campaigns').insert({ name, platform, started_on: day }).select('id, name, stopped, started_on').single()
          ) as CampaignRow
          campaigns.push(campaign)
        }
        if (campaign.stopped) continue
        if (campaign.started_on > day) {
          must(await db.from('campaigns').update({ started_on: day }).eq('id', campaign.id))
          campaign.started_on = day
        }

        incoming.push({
          name: field(item, 'full_name', 'name'),
          phone: field(item, 'phone_number', 'phone'),
          source: platform,
          sourceName: form.name,
          campaign: name,
          metaId: item.id,
          at: new Date(created).toISOString()
        })
      }
    }

    const seen = new Set<string>()
    const ids = incoming.map((row) => row.metaId!)
    for (let i = 0; i < ids.length; i += 200) {
      for (const row of rows(await db.from('leads').select('meta_id').in('meta_id', ids.slice(i, i + 200)))) {
        seen.add(row.meta_id as string)
      }
    }
    const fresh = incoming.filter((row) => !seen.has(row.metaId!) && phoneKey(row.phone).length >= 6)
    const added = fresh.length > 0 ? (await addLeads(fresh, { id: null, name: 'Meta' })).added : 0

    await saveState({ since: newest, synced_at: new Date().toISOString(), error: null })
    return added
  } catch (error) {
    await saveState({ synced_at: new Date().toISOString(), error: (error as Error).message })
    throw error
  }
}
