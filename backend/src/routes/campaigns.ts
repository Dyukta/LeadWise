import { Router } from 'express'

import { requireOwner, viewerOf } from '../auth.ts'
import { config } from '../config.ts'
import { db, must, rows, selectAll } from '../db.ts'
import { badRequest, isUuid, route } from '../lib/errors.ts'
import { syncMeta } from '../services/meta.ts'

const WON = new Set(['booked', 'documentation', 'agreement_done', 'disbursement_done', 'closed'])

export const campaignsRouter = Router()

campaignsRouter.post(
  '/list',
  route(async (_req, res) => {
    requireOwner(viewerOf(res))

    const [campaigns, leads, meta] = await Promise.all([
      db.from('campaigns').select('id, name, platform, stopped, started_on').order('started_on', { ascending: false }),
      selectAll<{ campaign: string; status: string }>((from, to) =>
        db.from('leads').select('campaign, status').not('campaign', 'is', null).range(from, to)
      ),
      db.from('meta_sync').select('connected, synced_at, error').eq('id', true).single()
    ])

    const tally = new Map<string, { leads: number; open: number; won: number; lost: number }>()
    for (const lead of leads) {
      const key = lead.campaign.toLowerCase()
      const row = tally.get(key) ?? { leads: 0, open: 0, won: 0, lost: 0 }
      row.leads += 1
      if (WON.has(lead.status)) row.won += 1
      else if (lead.status === 'lost') row.lost += 1
      else row.open += 1
      tally.set(key, row)
    }

    const state = must(meta)
    return {
      ok: true,
      campaigns: rows(campaigns).map((campaign) => ({
        id: campaign.id,
        name: campaign.name,
        platform: campaign.platform,
        stopped: campaign.stopped,
        startedOn: campaign.started_on,
        ...(tally.get(String(campaign.name).toLowerCase()) ?? { leads: 0, open: 0, won: 0, lost: 0 })
      })),
      meta: {
        configured: Boolean(config.meta.pageToken),
        connected: state?.connected === true,
        syncedAt: state?.synced_at ?? null,
        error: state?.error ?? null
      }
    }
  })
)

campaignsRouter.post(
  '/write',
  route(async (req, res) => {
    requireOwner(viewerOf(res))
    const input = (req.body ?? {}) as { action?: string; id?: unknown; on?: unknown }

    switch (input.action) {
      case 'stop':
      case 'start':
        if (!isUuid(input.id)) throw badRequest('Pick a campaign first.')
        must(await db.from('campaigns').update({ stopped: input.action === 'stop' }).eq('id', input.id))
        return { ok: true }
      case 'connect':
        if (input.on === true && !config.meta.pageToken) throw badRequest('Set META_PAGE_TOKEN on the server first.')
        must(await db.from('meta_sync').update({ connected: input.on === true, error: null }).eq('id', true))
        return { ok: true }
      case 'sync':
        return { ok: true, added: await syncMeta() }
      default:
        throw badRequest('Unknown action.')
    }
  })
)
