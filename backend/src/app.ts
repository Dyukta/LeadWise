import cors from 'cors'
import express from 'express'

import { config } from './config.ts'
import { db } from './db.ts'
import { errorHandler } from './lib/errors.ts'
import { rpcRouter } from './routes/rpc.ts'

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
  // The frontend posts JSON as text/plain.
  app.use(express.json({ limit: '5mb', type: ['application/json', 'text/plain'] }))

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

  app.use('/api/rpc', rpcRouter)

  app.use('/api', (_req, res) => {
    res.status(404).json({ ok: false, error: 'No such endpoint.' })
  })
  app.use(errorHandler)

  return app
}
