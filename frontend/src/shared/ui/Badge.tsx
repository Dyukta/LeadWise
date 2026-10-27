import type { ReactNode } from 'react'

import { cn } from '@shared/lib/cn'

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'
type BadgeSize = 'sm' | 'md'

const tones: Record<BadgeTone, string> = {
  neutral: 'text-slate-600 bg-slate-100 border-slate-200',
  info: 'text-blue-700 bg-blue-50 border-blue-200',
  success: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  warning: 'text-amber-700 bg-amber-50 border-amber-200',
  danger: 'text-red-700 bg-red-50 border-red-200'
}

const sizes: Record<BadgeSize, string> = {
  sm: 'px-2.5 py-1 text-2xs',
  md: 'px-3.5 py-1.5 text-xs'
}

type BadgeProps = {
  children: ReactNode
  tone?: BadgeTone
  size?: BadgeSize
  color?: string
  className?: string
}

export function Badge({
  children,
  tone = 'neutral',
  size = 'md',
  color,
  className
}: BadgeProps) {
  const style = color
    ? { color, backgroundColor: `${color}15`, borderColor: `${color}50` }
    : undefined

  return (
    <span
      style={style}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-semibold tracking-normal',
        sizes[size],
        !color && tones[tone],
        className
      )}
    >
      {children}
    </span>
  )
}
