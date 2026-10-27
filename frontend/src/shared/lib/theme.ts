import { useCallback, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'swr.theme'

type Theme = 'light' | 'dark'

const listeners = new Set<() => void>()

function read(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function setTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  try {
    window.localStorage.setItem(STORAGE_KEY, theme)
  } catch {}
  listeners.forEach((listener) => listener())
}

export function useTheme(): [Theme, () => void] {
  const theme = useSyncExternalStore(subscribe, read, () => 'light' as Theme)
  const toggle = useCallback(() => setTheme(read() === 'dark' ? 'light' : 'dark'), [])
  return [theme, toggle]
}
