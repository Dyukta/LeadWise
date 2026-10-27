import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@shared/lib/cn'
import { Card } from '@shared/ui/Card'

export function ChartCard({
  title,
  icon: Icon,
  iconClassName = 'text-brand-600',
  headerExtra,
  heightClassName = 'h-[260px] sm:h-[300px]',
  children
}: {
  title: string
  icon: LucideIcon
  iconClassName?: string
  headerExtra?: ReactNode
  heightClassName?: string
  children: ReactNode
}) {
  return (
    <Card>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h3 className="flex items-center gap-3 text-lg font-bold text-ink">
          <Icon className={cn('h-5 w-5', iconClassName)} />
          {title}
        </h3>
        {headerExtra}
      </div>
      <div className={heightClassName}>{children}</div>
    </Card>
  )
}
