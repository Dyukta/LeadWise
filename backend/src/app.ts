import cors from 'cors'
import express from 'express'

import { authenticate } from './auth.ts'
import { config } from './config.ts'
import { db } from './db.ts'
import { errorHandler } from './lib/errors.ts'
import { campaignsRouter } from './routes/campaigns.ts'
import { leadsRouter } from './routes/leads.ts'
import { performanceRouter } from './routes/performance.ts'
import { projectsRouter } from './routes/projects.ts'
import { usersRouter } from './routes/users.ts'

export function createApp() {
  const app = express()

  app.disable('x-powered-by')
  app.use(
    cors({
      origin: (origin, done) => done(null, !origin || config.allowedOrigins.includes(origin)),
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Authorization', 'Content-Type'],
      maxAge: 600
    })
  )
  app.use(express.json({ limit: '1mb' }))

  app.get('/api/health', async (_req, res) => {
    const started = Date.now()
    const { error } = await db
      .from('users')
      .select('id')
      .limit(1)
      .abortSignal(AbortSignal.timeout(5000))

    res.status(error ? 503 : 200).json({
      ok: !error,
      database: error ? 'unreachable' : 'up',
      latencyMs: Date.now() - started,
      time: new Date().toISOString()
    })
  })

  const api = express.Router()
  api.use(authenticate)
  api.use('/leads', leadsRouter)
  api.use('/campaigns', campaignsRouter)
  api.use('/projects', projectsRouter)
  api.use('/performance', performanceRouter)
  api.use('/users', usersRouter)
  app.use('/api', api)

  app.use('/api', (_req, res) => {
    res.status(404).json({ ok: false, error: 'No such endpoint.' })
  })
  app.use(errorHandler)

  return app
}
