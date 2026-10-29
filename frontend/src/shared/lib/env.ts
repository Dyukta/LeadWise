const values = import.meta.env as unknown as Record<string, string | undefined>

const read = (name: string, fallback: string) => values[name]?.trim() || fallback
const optional = (name: string) => values[name]?.trim() || null

const demoPassword = optional('VITE_DEMO_PASSWORD')
const demoAccounts = demoPassword
  ? [
      { role: 'owner', email: optional('VITE_DEMO_OWNER_EMAIL'), name: 'Demo owner' },
      { role: 'employee', email: optional('VITE_DEMO_EMPLOYEE_EMAIL'), name: 'Demo employee' }
    ].flatMap((account) => (account.email ? [{ ...account, email: account.email, password: demoPassword }] : []))
  : []

export const env = {
  appName: read('VITE_APP_NAME', 'Leadwise'),
  timeZone: read('VITE_APP_TIME_ZONE', 'Asia/Kolkata'),
  apiUrl: optional('VITE_API_URL'),
  supabaseUrl: optional('VITE_SUPABASE_URL'),
  supabaseKey: optional('VITE_SUPABASE_ANON_KEY'),
  demoAccounts
}
