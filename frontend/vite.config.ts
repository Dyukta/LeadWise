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
  VITE_SUPABASE_PUBLISHABLE_KEY: 'SUPABASE_PUBLISHABLE_KEY',
  VITE_APP_NAME: 'APP_NAME',
  VITE_APP_TIME_ZONE: 'APP_TIME_ZONE',
  VITE_CONTACT_EMAIL: 'CONTACT_EMAIL',
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, BACKEND, '')
  for (const [vite, name] of Object.entries(SHARED)) {
    if (!process.env[vite]?.trim() && env[name]?.trim()) process.env[vite] = env[name]
  }
  const missing = Object.entries(SHARED)
    .filter(([vite]) => !process.env[vite]?.trim() && !env[vite]?.trim())
    .map(([, name]) => name)
  if (command === 'build' && missing.length > 0) {
    throw new Error(`Set these in backend/.env before building: ${missing.join(', ')}`)
  }
  const API_PROXY_TARGET = env.API_PROXY_TARGET || `http://localhost:${env.PORT || 4000}`

  return {
    envDir: BACKEND,
    plugins: [react(), tailwindcss()],
    // Pre-bundle everything up front: these are only reached through lazy() routes,
    // so without this Vite re-optimizes mid-session and the page ends up with two
    // React copies (stale ?v= hash still cached) -> "Invalid hook call".
    optimizeDeps: {
      include: [
        '@supabase/supabase-js',
        '@tanstack/react-query',
        'framer-motion',
        'libphonenumber-js/mobile',
        'lucide-react',
        'react',
        'react-dom/client',
        'react-router-dom',
      ],
    },
    server: {
      proxy: { '/api': API_PROXY_TARGET },
    },
    build: {
      assetsInlineLimit: (file) => (file.includes('flag-icons') ? false : undefined),
    },
    resolve: {
      alias: {
        '@app': src('app'),
        '@modules': src('modules'),
        '@platform': src('platform'),
        '@shared': src('shared'),
      },
    },
  }
})
