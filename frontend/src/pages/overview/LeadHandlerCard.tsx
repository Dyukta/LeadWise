import type { Lead } from '@logic/leads/leadTypes'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}

export function LeadHandlerCard({ name, leads }: { name: string; leads: Lead[] }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 sm:gap-3 sm:px-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700 sm:h-10 sm:w-10">
        {initials(name)}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{name}</span>
      <span className="shrink-0 border-l border-slate-200 pl-2 text-right sm:pl-3">
        <span className="block text-lg font-bold leading-none tabular-nums text-ink">{leads.length}</span>
        <span className="block text-2xs uppercase tracking-wide text-slate-400">leads</span>
      </span>
    </div>
  )
}
