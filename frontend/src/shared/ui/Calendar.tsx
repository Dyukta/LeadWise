import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

const monthFormatter = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' })
const monthName = new Intl.DateTimeFormat('en-IN', { month: 'long' })

export function MonthNav({
  month,
  onShift,
  onPickMonth,
  onPickYear
}: {
  month: Date
  onShift: (by: number) => void
  onPickMonth?: () => void
  onPickYear?: () => void
}) {
  return (
    <PanelNav prevLabel="Previous month" nextLabel="Next month" onPrev={() => onShift(-1)} onNext={() => onShift(1)}>
      {onPickMonth && onPickYear ? (
        <>
          <TitleButton onClick={onPickMonth}>{monthName.format(month)}</TitleButton>
          <TitleButton onClick={onPickYear}>{month.getFullYear()}</TitleButton>
        </>
      ) : (
        monthFormatter.format(month)
      )}
    </PanelNav>
  )
}

export function PanelNav({
  children,
  prevLabel,
  nextLabel,
  onPrev,
  onNext
}: {
  children: ReactNode
  prevLabel: string
  nextLabel: string
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <div className="flex items-center justify-between px-1 pb-2">
      <NavButton label={prevLabel} icon={ChevronLeft} onClick={onPrev} />
      <div className="flex items-center gap-1.5 text-sm font-semibold text-ink">{children}</div>
      <NavButton label={nextLabel} icon={ChevronRight} onClick={onNext} />
    </div>
  )
}

export function TitleButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 py-1 pl-2.5 pr-1.5 text-sm font-semibold text-ink transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
    >
      {children}
      <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
    </button>
  )
}

function NavButton({
  label,
  icon: Icon,
  onClick
}: {
  label: string
  icon: typeof ChevronLeft
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}

export function WeekdayHeader() {
  return ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
    <span key={index} className="py-1 text-2xs font-semibold uppercase text-slate-400">
      {day}
    </span>
  ))
}
