import { Briefcase, Calendar, Search, User, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import type { PerformanceSummary } from '@modules/performance/api/performanceTypes'
import { ALL_DEPARTMENTS, dedupeDepartments, normalizeDepartment } from '@modules/performance/domain/departments'
import { filterByQuery, hasActiveFilters, type PerformanceFilters } from '@modules/performance/domain/filters'
import { cn } from '@shared/lib/cn'
import { periodOptions } from '@shared/lib/date'
import { Dropdown } from '@shared/ui/Dropdown'

export function PerformanceFilterBar({
  filters,
  onChange,
  team,
  months,
  focusedName,
  extra
}: {
  filters: PerformanceFilters
  onChange: (filters: PerformanceFilters) => void
  team: PerformanceSummary[]
  months: string[]
  focusedName: string | null
  extra?: ReactNode
}) {
  const monthOptions = useMemo(() => periodOptions(months), [months])

  const departmentOptions = useMemo(() => {
    const departments = dedupeDepartments(
      team.flatMap((person) =>
        person.departments.length ? person.departments : [normalizeDepartment(null)]
      )
    ).sort((a, b) => a.localeCompare(b))

    return [
      { label: ALL_DEPARTMENTS, value: ALL_DEPARTMENTS },
      ...departments.map((value) => ({ label: value, value }))
    ]
  }, [team])

  const matching = filterByQuery(team, filters.query)
  const focusedId = filters.focusedUserId ?? team[0]?.userId ?? ''

  const employeeOptions = useMemo(() => {
    const focused = team.find((person) => person.userId === focusedId)
    const source =
      focused && !matching.some((person) => person.userId === focused.userId)
        ? [focused, ...matching]
        : matching
    return source.map((person) => ({ label: person.userName, value: person.userId }))
  }, [team, matching, focusedId])

  const [isSuggestOpen, setIsSuggestOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) setIsSuggestOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  const select = (userId: string) => {
    onChange({ ...filters, focusedUserId: userId, query: '' })
    setIsSuggestOpen(false)
  }

  const onSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isSuggestOpen || matching.length === 0) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlight((index) => (index + 1) % matching.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlight((index) => (index - 1 + matching.length) % matching.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      select(matching[highlight]!.userId)
    } else if (event.key === 'Escape') {
      setIsSuggestOpen(false)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink sm:text-3xl">Team Performance</h1>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
        <Dropdown
          className="w-full sm:w-44"
          icon={Calendar}
          value={filters.period}
          onChange={(value) => onChange({ ...filters, period: value })}
          options={monthOptions}
        />
        <div ref={searchRef} className="relative order-first col-span-2 h-12 w-full sm:order-none sm:col-span-1 sm:h-10 sm:w-44">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
            <Search className="h-3.5 w-3.5" />
          </span>
          <input
            type="text"
            value={filters.query}
            onChange={(event) => {
              onChange({ ...filters, query: event.target.value })
              setHighlight(0)
              setIsSuggestOpen(true)
            }}
            onFocus={() => filters.query && setIsSuggestOpen(true)}
            onKeyDown={onSearchKeyDown}
            placeholder="Search people"
            aria-label="Search employees"
            className="h-full w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-7 text-xs font-bold text-slate-600 transition-colors placeholder:font-medium placeholder:normal-case placeholder:text-slate-400 hover:bg-slate-50 focus:border-brand-400 focus:outline-none"
          />
          {filters.query && (
            <button
              type="button"
              onClick={() => {
                onChange({ ...filters, query: '' })
                setIsSuggestOpen(false)
              }}
              aria-label="Clear employee search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {isSuggestOpen && filters.query && (
            <div className="scrollbar-thin absolute left-0 top-full z-50 mt-1.5 max-h-60 w-72 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg">
              {matching.length === 0 ? (
                <p className="px-3 py-2 text-xs font-medium text-slate-400">
                  No employees match “{filters.query}”
                </p>
              ) : (
                matching.map((person, index) => (
                  <button
                    key={person.userId}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => select(person.userId)}
                    onMouseEnter={() => setHighlight(index)}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold text-slate-700',
                      index === highlight ? 'bg-brand-50 text-brand-700' : 'hover:bg-slate-50',
                      person.userId === focusedId && 'font-bold'
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{person.userName}</span>
                    <span className="shrink-0 whitespace-nowrap text-2xs font-semibold uppercase tracking-wide text-slate-400">
                      {person.departments.join(', ') || normalizeDepartment(null)}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        <Dropdown
          className="w-full sm:w-44"
          icon={User}
          value={focusedId}
          onChange={(value) => onChange({ ...filters, focusedUserId: value })}
          options={employeeOptions}
          placeholder="Person"
          emptyMessage="No one has data for this period"
        />
        <Dropdown
          className="w-full sm:w-52"
          icon={Briefcase}
          value={filters.department}
          onChange={(value) => onChange({ ...filters, department: value })}
          options={departmentOptions}
        />
        {extra}
      </div>
      <ActiveFilterPills filters={filters} onChange={onChange} focusedName={focusedName} />
    </div>
  )
}

function ActiveFilterPills({
  filters,
  onChange,
  focusedName
}: {
  filters: PerformanceFilters
  onChange: (filters: PerformanceFilters) => void
  focusedName: string | null
}) {
  if (!hasActiveFilters(filters)) return null

  const pill = 'inline-flex items-center gap-1.5 rounded-lg border py-1 pl-2.5 pr-1.5 text-2xs font-semibold uppercase tracking-wide transition-colors'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-2xs font-semibold uppercase tracking-wide text-slate-400">
        Filtering by
      </span>

      {filters.department !== ALL_DEPARTMENTS && (
        <button
          type="button"
          onClick={() => onChange({ ...filters, department: ALL_DEPARTMENTS })}
          className={cn(pill, 'border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100')}
        >
          <Briefcase className="h-3 w-3" />
          {filters.department}
          <X className="h-3 w-3" />
        </button>
      )}

      {filters.focusedUserId !== null && focusedName && (
        <button
          type="button"
          onClick={() => onChange({ ...filters, focusedUserId: null })}
          className={cn(
            pill,
            'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          )}
        >
          <User className="h-3 w-3" />
          {focusedName}
          <X className="h-3 w-3" />
        </button>
      )}

      {filters.query.trim().length > 0 && (
        <button
          type="button"
          onClick={() => onChange({ ...filters, query: '' })}
          className={cn(pill, 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100')}
        >
          <Search className="h-3 w-3" />
          “{filters.query}”
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}
