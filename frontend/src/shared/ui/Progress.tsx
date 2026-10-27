import { motion } from 'framer-motion'

import { cn } from '@shared/lib/cn'

type ProgressProps = {
  value: number
  max?: number
  color: string
  trackClassName?: string
  heightClassName?: string
  className?: string
}

export function Progress({
  value,
  max = 100,
  color,
  trackClassName = 'bg-white/60',
  heightClassName = 'h-2',
  className
}: ProgressProps) {
  const percent = Math.min(Math.max((value / max) * 100, 0), 100)

  return (
    <div
      className={cn('w-full overflow-hidden rounded-full', heightClassName, trackClassName, className)}
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${percent}%` }}
        transition={{ duration: 1.4, ease: 'easeOut' }}
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
      />
    </div>
  )
}
