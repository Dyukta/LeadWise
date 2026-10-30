import { ChevronDown, type LucideIcon } from 'lucide-react'
import { createPortal } from 'react-dom'

import { cn } from '@shared/lib/cn'
import { useAnchoredPanel } from '@shared/ui/useAnchoredPanel'

export function Dropdown({
  icon: Icon,
  value,
  onChange,
  options,
  className,
  active = false
}: {
  icon: LucideIcon
  value: string
  onChange: (value: string) => void
  options: { label: string; value: string }[]
  className?: string
  active?: boolean
}) {
  const { isOpen, setIsOpen, position, triggerRef, panelRef } = useAnchoredPanel()
  const selected = options.find((option) => option.value === value)

  return (
    <div className={cn('relative min-h-10', className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          'relative flex h-full min-h-10 w-full items-center rounded-xl border py-2 pl-9 pr-8 text-xs font-bold uppercase tracking-wide transition-colors focus:outline-none',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
          active
            ? 'border-brand-600 bg-brand-600 text-white hover:bg-brand-700'
            : 'border-brand-300 bg-white text-brand-700 hover:border-brand-400 hover:bg-brand-50'
        )}
      >
        <Icon
          className={cn('pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2', active ? 'text-white' : 'text-brand-500')}
        />
        <span className="min-w-0 flex-1 text-left wrap-break-word">{selected?.label}</span>
        <ChevronDown
          className={cn(
            'pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 transition-transform',
            active ? 'text-white/80' : 'text-brand-400',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: 'fixed', top: position.top, left: position.left, width: Math.max(position.width, 144) }}
            className="scrollbar-thin z-[100] max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg"
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                className={cn(
                  'flex w-full items-center px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50',
                  option.value === value && 'bg-brand-50 text-brand-700'
                )}
              >
                <span className="min-w-0 flex-1 wrap-break-word">{option.label}</span>
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  )
}
