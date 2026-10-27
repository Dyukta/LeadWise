import { createApp } from './app.ts'
import { config } from './config.ts'
import { syncMeta } from './services/meta.ts'

const server = createApp().listen(config.port, () => {
  console.log(`${config.appName} API listening on port ${config.port}`)
})

const metaTimer = config.meta.pageToken
  ? setInterval(() => {
      syncMeta()
        .then((added) => added > 0 && console.log(`Meta sync added ${added} leads`))
        .catch((error: Error) => console.warn('Meta sync failed:', error.message))
    }, 15 * 60_000)
  : null

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => {
    if (metaTimer) clearInterval(metaTimer)
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(1), 10_000).unref()
  })
}
