import { Loader2 } from 'lucide-react'

import { cn } from '@shared/lib/cn'

export function Loading({ className }: { className?: string }) {
  return (
    <div className={cn('flex w-full flex-1 items-center justify-center py-12', className)}>
      <Loader2 className="h-6 w-6 animate-spin text-brand-600" aria-label="Loading" />
    </div>
  )
}
