const values = import.meta.env as unknown as Record<string, string | undefined>

export function requireEnv(name: string): string {
  const value = values[name]?.trim()
  if (!value) throw new Error(`Missing environment variable ${name}.`)
  return value
}

const optional = (name: string) => values[name]?.trim() || null

export type DemoAccount = { role: 'Owner' | 'Employee'; email: string }

function demoAccounts(): DemoAccount[] {
  const accounts: DemoAccount[] = []
  const owner = optional('VITE_DEMO_OWNER_EMAIL')
  const employee = optional('VITE_DEMO_EMPLOYEE_EMAIL')
  if (owner) {
    accounts.push({ role: 'Owner', email: owner })
  }
  if (employee) {
    accounts.push({ role: 'Employee', email: employee })
  }
  return accounts
}

export const env = {
  appName: requireEnv('VITE_APP_NAME'),
  timeZone: requireEnv('VITE_APP_TIME_ZONE'),
  contactEmail: requireEnv('VITE_CONTACT_EMAIL'),
  demo: { accounts: demoAccounts(), password: optional('VITE_DEMO_PASSWORD') }
}
