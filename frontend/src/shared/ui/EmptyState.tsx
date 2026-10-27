import type { LucideIcon } from 'lucide-react'

import { cn } from '@shared/lib/cn'

export function EmptyState({
  icon: Icon,
  title,
  description,
  className
}: {
  icon: LucideIcon
  title: string
  description?: string
  className?: string
}) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-3 py-12 text-center', className)}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && <p className="max-w-xs text-xs text-slate-400">{description}</p>}
    </div>
  )
}
