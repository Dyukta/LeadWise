import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

const src = (p: string) => fileURLToPath(new URL(`./src/${p}`, import.meta.url))

// The app has one .env, in backend/. Only the values mapped here reach the browser,
// so the secret key never does. VITE_* names set by a host still win.
const BACKEND = fileURLToPath(new URL('../backend', import.meta.url))
const SHARED = {
  VITE_SUPABASE_URL: 'SUPABASE_URL',
  VITE_SUPABASE_ANON_KEY: 'SUPABASE_PUBLISHABLE_KEY',
  VITE_APP_NAME: 'APP_NAME',
  VITE_APP_TIME_ZONE: 'APP_TIME_ZONE',
  VITE_DEMO_OWNER_EMAIL: 'DEMO_OWNER_EMAIL',
  VITE_DEMO_EMPLOYEE_EMAIL: 'DEMO_EMPLOYEE_EMAIL',
  VITE_DEMO_PASSWORD: 'DEMO_PASSWORD'
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, BACKEND, '')
  for (const [vite, name] of Object.entries(SHARED)) {
    if (!process.env[vite]?.trim() && env[name]?.trim()) process.env[vite] = env[name].trim()
  }
  // The API serves the Lead DGC actions at /api/rpc; in development Vite forwards /api to it.
  process.env.VITE_API_URL ||= env.VITE_API_URL || '/api/rpc'

  return {
    envDir: BACKEND,
    plugins: [react(), tailwindcss()],
    optimizeDeps: {
      include: ['@supabase/supabase-js', '@tanstack/react-query', 'lucide-react', 'react', 'react-dom/client', 'react-router-dom']
    },
    server: {
      proxy: { '/api': env.API_PROXY_TARGET || `http://localhost:${env.PORT || 4000}` }
    },
    resolve: {
      alias: {
        '@app': src('app'),
        '@hooks': src('hooks'),
        '@logic': src('logic'),
        '@pages': src('pages'),
        '@shared': src('shared')
      }
    }
  }
})
