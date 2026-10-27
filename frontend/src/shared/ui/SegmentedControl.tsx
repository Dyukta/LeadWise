import { motion } from 'framer-motion'
import { useId } from 'react'

import { cn } from '@shared/lib/cn'

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className
}: {
  value: T
  onChange: (value: T) => void
  options: Array<{ value: T; label: string }>
  className?: string
}) {
  const id = useId()

  return (
    <div
      className={cn(
        'inline-flex shrink-0 rounded-xl border border-slate-200 bg-white p-1',
        className
      )}
    >
      {options.map((option) => {
        const active = option.value === value

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'relative shrink-0 grow whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors sm:py-1.5',
              active ? 'text-white' : 'text-slate-500 hover:text-slate-900'
            )}
          >
            {active && (
              <motion.span
                layoutId={`segment-${id}`}
                className="absolute inset-0 rounded-xl bg-brand-600 shadow-sm shadow-brand-950/30"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative z-10">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
