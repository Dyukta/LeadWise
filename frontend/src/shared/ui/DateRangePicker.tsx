import { CalendarRange } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@shared/lib/cn'
import { fromKey, monthGrid, toKey, todayKey } from '@shared/lib/date'
import { MonthNav, PanelNav, TitleButton, WeekdayHeader } from '@shared/ui/Calendar'
import { useAnchoredPanel } from '@shared/ui/useAnchoredPanel'

const dayFormatter = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' })

const shortMonth = new Intl.DateTimeFormat('en-IN', { month: 'short' })
const MONTHS = Array.from({ length: 12 }, (_, index) => index)

type DateRange = { from: string; to: string }

const periodKey = (year: number, index: number) => `${year}-${String(index + 1).padStart(2, '0')}`

function periodText(period: string): string | undefined {
  const [year, month] = period.split('-').map(Number)
  if (!year || !month) return undefined
  return `${shortMonth.format(new Date(year, month - 1, 1))} ${year}`
}

export function DateRangePicker({
  value,
  onChange,
  onClear,
  label = 'Custom',
  className,
  period = '',
  onPeriodChange
}: {
  value: DateRange | null
  onChange: (range: DateRange) => void
  onClear: () => void
  label?: string
  className?: string
  period?: string
  onPeriodChange?: (period: string) => void
}) {
  const { isOpen, setIsOpen, position, triggerRef, panelRef } = useAnchoredPanel()

  const [pendingStart, setPendingStart] = useState<string | null>(null)
  const [draft, setDraft] = useState<DateRange | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [month, setMonth] = useState(() => (value ? (fromKey(value.from) ?? new Date()) : new Date()))
  const [view, setView] = useState<'days' | 'months' | 'years'>('days')

  const today = todayKey()
  const periodLabel = periodText(period)
  const year = month.getFullYear()
  const decade = Math.floor(year / 12) * 12
  const thisMonth = periodKey(new Date().getFullYear(), new Date().getMonth())

  const pickMonth = (index: number) => {
    if (onPeriodChange) {
      onPeriodChange(periodKey(year, index))
      setPendingStart(null)
      setDraft(null)
      setIsOpen(false)
      return
    }
    setMonth(new Date(year, index, 1))
    setView('days')
  }

  const shown = draft ?? value
  const preview = pendingStart ? (hovered ?? pendingStart) : null
  const start = pendingStart ? (pendingStart < preview! ? pendingStart : preview!) : shown?.from
  const end = pendingStart ? (pendingStart < preview! ? preview! : pendingStart) : shown?.to

  const choose = (date: Date) => {
    const key = toKey(date)

    if (!pendingStart) {
      setPendingStart(key)
      setDraft(null)
      return
    }

    setDraft(pendingStart <= key ? { from: pendingStart, to: key } : { from: key, to: pendingStart })
    setPendingStart(null)
    setHovered(null)
  }

  const apply = () => {
    const chosen = draft ?? (pendingStart ? { from: pendingStart, to: pendingStart } : null)
    if (!chosen) return
    onChange(chosen)
    setPendingStart(null)
    setDraft(null)
    setHovered(null)
    setIsOpen(false)
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => {
          setPendingStart(null)
          setDraft(null)
          setMonth(value ? (fromKey(value.from) ?? new Date()) : new Date())
          setView('days')
          setIsOpen((open) => !open)
        }}
        className={cn(
          'flex h-10 shrink-0 items-center gap-2 rounded-xl border bg-white px-3 text-sm font-semibold transition-colors',
          value || periodLabel ? 'border-brand-300 text-brand-700' : 'border-slate-300 text-slate-600',
          'hover:bg-slate-50 focus:border-brand-400 focus:outline-none',
          isOpen && 'border-brand-400',
          className
        )}
      >
        <CalendarRange className="h-4 w-4 shrink-0 text-slate-400" />
        <span className="min-w-0 truncate">
          {value
            ? value.from === value.to
              ? dayFormatter.format(fromKey(value.from)!)
              : `${dayFormatter.format(fromKey(value.from)!)} to ${dayFormatter.format(fromKey(value.to)!)}`
            : (periodLabel ?? label)}
        </span>
      </button>

      {isOpen &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Choose a date or date range"
            style={{ position: 'fixed', top: position.top, left: position.left }}
            className="z-[100] w-[19rem] max-w-[calc(100vw-1rem)] rounded-xl border border-slate-200 bg-white p-3 shadow-lg"
          >
            {view === 'days' && (
              <>
                <MonthNav
                  month={month}
                  onShift={(by) => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + by, 1))}
                  onPickMonth={() => setView('months')}
                  onPickYear={() => setView('years')}
                />
                <div className="grid grid-cols-7 text-center" onMouseLeave={() => setHovered(null)}>
                  <WeekdayHeader />

                  {monthGrid(month).map((date) => {
                    const key = toKey(date)
                    const isStart = key === start
                    const isEnd = key === end
                    const inRange = start !== undefined && end !== undefined && key > start && key < end
                    const isEdge = isStart || isEnd

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => choose(date)}
                        onMouseEnter={() => setHovered(key)}
                        className={cn(
                          'flex h-9 items-center justify-center text-sm transition-colors',
                          date.getMonth() === month.getMonth() ? 'text-slate-700' : 'text-slate-300',
                          inRange && 'bg-brand-50 text-brand-700',
                          isEdge && 'bg-brand-600 font-semibold text-white',
                          isStart && !isEnd && 'rounded-l-lg',
                          isEnd && !isStart && 'rounded-r-lg',
                          isStart && isEnd && 'rounded-lg',
                          !isEdge && !inRange && 'rounded-lg hover:bg-slate-100',
                          key === today && !isEdge && 'font-bold text-brand-600'
                        )}
                      >
                        {date.getDate()}
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {view === 'months' && (
              <>
                <PanelNav
                  prevLabel="Previous year"
                  nextLabel="Next year"
                  onPrev={() => setMonth(new Date(year - 1, month.getMonth(), 1))}
                  onNext={() => setMonth(new Date(year + 1, month.getMonth(), 1))}
                >
                  <TitleButton onClick={() => setView('years')}>{year}</TitleButton>
                </PanelNav>
                <div className="grid grid-cols-3 gap-1.5">
                  {MONTHS.map((index) => {
                    const key = periodKey(year, index)
                    const on = onPeriodChange ? !value && key === period : index === month.getMonth()
                    return (
                      <GridCell key={key} on={on} now={key === thisMonth} onClick={() => pickMonth(index)}>
                        {shortMonth.format(new Date(year, index, 1))}
                      </GridCell>
                    )
                  })}
                </div>
              </>
            )}

            {view === 'years' && (
              <>
                <PanelNav
                  prevLabel="Earlier years"
                  nextLabel="Later years"
                  onPrev={() => setMonth(new Date(year - 12, month.getMonth(), 1))}
                  onNext={() => setMonth(new Date(year + 12, month.getMonth(), 1))}
                >
                  <span className="px-2 py-1">
                    {decade} to {decade + 11}
                  </span>
                </PanelNav>
                <div className="grid grid-cols-3 gap-1.5">
                  {MONTHS.map((index) => {
                    const option = decade + index
                    return (
                      <GridCell
                        key={option}
                        on={option === year}
                        now={option === new Date().getFullYear()}
                        onClick={() => {
                          setMonth(new Date(option, month.getMonth(), 1))
                          setView('months')
                        }}
                      >
                        {option}
                      </GridCell>
                    )
                  })}
                </div>
              </>
            )}
            <p className="mt-2 text-center text-2xs font-semibold uppercase tracking-wide text-slate-400">
              {view === 'months'
                ? 'Pick a month'
                : view === 'years'
                  ? 'Pick a year'
                  : pendingStart
                ? 'Pick the end date, or Apply for this one day'
                : draft
                  ? draft.from === draft.to
                    ? 'Tap Apply to use this day'
                    : 'Tap Apply to use this range'
                  : 'Pick a date'}
            </p>
            <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
              <button
                type="button"
                onClick={() => {
                  setPendingStart(null)
                  setDraft(null)
                  setHovered(null)
                  onClear()
                  onPeriodChange?.('')
                  setIsOpen(false)
                }}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={apply}
                disabled={!draft && !pendingStart}
                className="rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Apply
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}

function GridCell({ on, now, onClick, children }: { on: boolean; now: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-11 items-center justify-center rounded-lg text-sm transition-colors',
        on ? 'bg-brand-600 font-semibold text-white' : 'text-slate-700 hover:bg-slate-100',
        now && !on && 'font-bold text-brand-600'
      )}
    >
      {children}
    </button>
  )
}
