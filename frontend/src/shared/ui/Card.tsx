import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '@shared/lib/cn'

type CardTone = 'default' | 'brand' | 'brandGlow' | 'gradeA' | 'gradeB' | 'gradeC'
type CardPadding = 'none' | 'sm' | 'md' | 'lg'

const tones: Record<CardTone, string> = {
  default: 'bg-white border border-slate-200',
  brand: 'bg-gradient-to-br from-brand-50 to-brand-100 border border-brand-200',
  brandGlow:
    'bg-gradient-to-br from-brand-500 to-brand-600 border border-brand-600 text-white',
  gradeA:
    'bg-gradient-to-br from-[var(--color-grade-a)] to-[var(--color-grade-a-deep)] border border-[var(--color-grade-a-deep)] text-white',
  gradeB:
    'bg-gradient-to-br from-[var(--color-grade-b)] to-[var(--color-grade-b-deep)] border border-[var(--color-grade-b-deep)] text-white',
  gradeC:
    'bg-gradient-to-br from-[var(--color-grade-c)] to-[var(--color-grade-c-deep)] border border-[var(--color-grade-c-deep)] text-white'
}

const paddings: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3 sm:p-5',
  md: 'p-4 sm:p-7',
  lg: 'p-5 sm:p-8'
}

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
  tone?: CardTone
  padding?: CardPadding
  rounded?: string
  hoverLift?: boolean
}

export function Card({
  children,
  tone = 'default',
  padding = 'md',
  rounded = 'rounded-2xl',
  hoverLift = false,
  className,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden',
        'shadow-sm',
        rounded,
        tones[tone],
        paddings[padding],
        hoverLift &&
          'transition-shadow hover:shadow-md',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
}
