function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing environment variable ${name}.`)
  return value
}

function optional(name: string): string | null {
  return process.env[name]?.trim() || null
}

function port(): number {
  const value = Number(process.env.PORT?.trim() || 4000)
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error('PORT must be a whole number between 1 and 65535.')
  }
  return value
}

function timeZone(): string {
  const zone = required('APP_TIME_ZONE')
  try {
    new Intl.DateTimeFormat('en', { timeZone: zone })
  } catch {
    throw new Error(`APP_TIME_ZONE "${zone}" is not a time zone. Use an IANA name such as Asia/Kolkata.`)
  }
  return zone
}

export const config = {
  port: port(),
  appName: required('APP_NAME'),
  timeZone: timeZone(),
  supabaseUrl: required('SUPABASE_URL').replace(/\/$/, ''),
  supabaseSecretKey: required('SUPABASE_SECRET_KEY'),
  allowedOrigins: required('ALLOWED_ORIGINS')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean),
  meta: {
    pageToken: optional('META_PAGE_TOKEN'),
    adsToken: optional('META_ADS_TOKEN'),
    adAccount: optional('META_AD_ACCOUNT'),
    formIds: (optional('META_FORM_IDS') ?? '').split(',').map((id) => id.trim()).filter(Boolean)
  }
}
