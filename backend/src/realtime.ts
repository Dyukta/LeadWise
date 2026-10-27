import { config } from './config.ts'

export async function announceLeadsChanged(): Promise<void> {
  const key = config.supabaseSecretKey
  const headers: Record<string, string> = { apikey: key, 'Content-Type': 'application/json' }
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`

  try {
    const response = await fetch(`${config.supabaseUrl}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({
        messages: [{ topic: 'leads', event: 'changed', payload: {}, private: true }]
      })
    })
    if (!response.ok) console.warn(`Could not broadcast the lead change: HTTP ${response.status}`)
  } catch (error) {
    console.warn('Could not broadcast the lead change:', (error as Error).message)
  }
}
