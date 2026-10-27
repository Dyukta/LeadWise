import type { LucideIcon } from 'lucide-react'

import { cn } from '@shared/lib/cn'
import { Skeleton } from '@shared/ui/Skeleton'

const statTones = {
  indigo: 'bg-brand-50 text-brand-600',
  amber: 'bg-amber-50 text-amber-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  sky: 'bg-sky-50 text-sky-600',
  rose: 'bg-rose-50 text-rose-600',
  violet: 'bg-violet-50 text-violet-600'
}

export function StatTile({
  label,
  value,
  loading,
  tone,
  icon: Icon,
  hint,
  highlight = false
}: {
  label: string
  value: number | undefined
  loading: boolean
  tone: keyof typeof statTones
  icon: LucideIcon
  hint?: string
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        'block rounded-2xl border p-4 shadow-sm sm:p-5',
        highlight ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className={cn('text-sm font-medium', highlight ? 'text-white/90' : 'text-slate-500')}>
          {label}
        </p>
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
            highlight ? 'bg-white/20 text-white' : statTones[tone]
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-14" />
      ) : (
        <p
          className={cn(
            'mt-2 text-3xl font-bold tabular-nums',
            highlight ? 'text-white' : 'text-ink'
          )}
        >
          {value ?? 'N/A'}
        </p>
      )}
      {hint && (
        <p className={cn('mt-2 text-xs', highlight ? 'text-white/85' : 'text-slate-400')}>{hint}</p>
      )}
    </div>
  )
}
