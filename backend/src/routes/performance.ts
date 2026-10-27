import { Router } from 'express'

import { requireOwner, viewerOf } from '../auth.ts'
import { route } from '../lib/errors.ts'
import { fileReport, performanceMonths, saveKpis, teamPerformance } from '../services/performance.ts'

export const performanceRouter = Router()

performanceRouter.get(
  '/months',
  route(async () => ({ ok: true, months: await performanceMonths() }))
)

performanceRouter.post(
  '/summary',
  route(async (req, res) => {
    const body = (req.body ?? {}) as { tab?: unknown; from?: unknown; to?: unknown }
    return teamPerformance(viewerOf(res), body.tab, body)
  })
)

performanceRouter.post(
  '/reports',
  route(async (req, res) => fileReport(viewerOf(res), (req.body ?? {}) as Record<string, unknown>))
)

performanceRouter.post(
  '/kpis',
  route(async (req, res) => {
    requireOwner(viewerOf(res))
    const body = (req.body ?? {}) as { month?: unknown; department?: unknown; rows?: unknown }
    return saveKpis(body.month, body.department, body.rows)
  })
)
