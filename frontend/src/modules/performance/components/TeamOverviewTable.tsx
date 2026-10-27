import { ArrowUpDown, Award, Check, ChevronDown, Users } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import type { PerformanceSummary } from '@modules/performance/api/performanceTypes'
import { sortAuditRows, type AuditRow, type AuditSortKey, type AuditSortState } from '@modules/performance/domain/audit'
import { GRADE_TONES, type GradeLetter } from '@modules/performance/domain/grading'
import { cn } from '@shared/lib/cn'
import { formatPercent } from '@shared/lib/format'
import { Badge } from '@shared/ui/Badge'
import { Card } from '@shared/ui/Card'
import { EmptyState } from '@shared/ui/EmptyState'
import { ScrollHint } from '@shared/ui/ScrollHint'
import { useAnchoredPanel } from '@shared/ui/useAnchoredPanel'

type TeamRow = AuditRow<PerformanceSummary>

const COLUMNS: Array<{
  key: AuditSortKey | null
  label: string
  align?: 'left' | 'center'
}> = [
  { key: 'name', label: 'Employee name' },
  { key: 'performancePct', label: 'Monthly Avg', align: 'center' },
  { key: 'weeklyAvg', label: 'Weekly Performance', align: 'center' },
  { key: null, label: 'Grade', align: 'center' },
  { key: 'absences', label: 'Absences', align: 'center' }
]

const gradeTextClass: Record<GradeLetter, string> = {
  A: 'text-emerald-700',
  B: 'text-amber-700',
  C: 'text-red-700'
}

export function TeamOverviewTable({ team }: { team: PerformanceSummary[] }) {
  const [sort, setSort] = useState<AuditSortState>({ key: 'performancePct', direction: 'desc' })

  const rows = useMemo<TeamRow[]>(
    () =>
      team
        .filter((person) => person.score !== null)
        .map((person) => ({
          userId: person.userId,
          name: person.userName,
          person
        })),
    [team]
  )

  const scroller = useRef<HTMLDivElement>(null)

  const sortedRows = useMemo(() => sortAuditRows(rows, sort), [rows, sort])

  const toggleSort = (key: AuditSortKey) => {
    setSort((previous) =>
      previous.key === key
        ? { key, direction: previous.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'desc' }
    )
  }

  return (
    <Card padding="none">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 p-4 sm:p-6">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-lg font-bold text-ink">
              Team Overview
            </h3>
            <SortMenu sort={sort} onChange={setSort} />
          </div>
        </div>
        <Users className="h-7 w-7 text-slate-300" />
      </div>

      {sortedRows.length === 0 ? (
        <EmptyState icon={Users} title="No employees match this filter" />
      ) : (
        <div className="relative">
          <ScrollHint target={scroller} />
          <div ref={scroller} className="scrollbar-thin overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="border-b border-slate-200 bg-slate-50 text-2xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                {COLUMNS.map((column) => (
                  <th
                    key={column.label}
                    onClick={column.key ? () => toggleSort(column.key!) : undefined}
                    className={cn(
                      'whitespace-nowrap px-4 py-4 sm:px-8',
                      column.align === 'center' ? 'text-center' : 'text-left',
                      column.key && 'cursor-pointer select-none'
                    )}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedRows.map((row) => (
                <Row key={row.userId} row={row} />
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </Card>
  )
}

function Row({ row }: { row: TeamRow }) {
  const { person } = row

  return (
    <tr className="whitespace-nowrap text-sm font-semibold transition-colors hover:bg-slate-50">
      <td className="px-4 py-5 text-ink sm:px-8">{row.name}</td>
      <td className="px-4 py-5 text-center tabular-nums text-brand-600 sm:px-8">
        {person.score === null ? 'N/A' : formatPercent(person.score)}
      </td>
      <td className="px-4 py-5 text-center tabular-nums text-slate-500 sm:px-8">
        {person.weeklyAvg === null ? 'N/A' : formatPercent(person.weeklyAvg)}{' '}
        {person.weeklyGrade && (
          <span className={gradeTextClass[person.weeklyGrade]}>{person.weeklyGrade}</span>
        )}
      </td>
      <td className="px-4 py-5 text-center sm:px-8">
        {person.grade && (
          <Badge size="sm" tone={GRADE_TONES[person.grade]}>
            <Award className="h-3 w-3" />
            Grade {person.grade}
          </Badge>
        )}
      </td>
      <td className="px-4 py-5 text-center tabular-nums text-red-600">
        {person.attendance?.absences ?? 0}
      </td>
    </tr>
  )
}

const FIELD_OPTIONS: Array<{ key: AuditSortKey; label: string }> = [
  { key: 'name', label: 'Name' },
  { key: 'performancePct', label: 'Grade' }
]

function SortMenu({
  sort,
  onChange
}: {
  sort: AuditSortState
  onChange: (sort: AuditSortState) => void
}) {
  const { isOpen, setIsOpen, position, triggerRef, panelRef } = useAnchoredPanel()

  const item = (active: boolean) =>
    cn(
      'flex w-full items-center justify-between px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50',
      active && 'bg-brand-50 font-bold text-brand-700'
    )

  return (
    <div className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1 text-2xs font-bold uppercase tracking-wide text-slate-600 transition-colors hover:bg-slate-50 focus:border-brand-400 focus:outline-none"
      >
        <ArrowUpDown className="h-3 w-3" />
        Sort By
        <ChevronDown className={cn('h-3 w-3 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: 'fixed', top: position.top, left: position.left, width: 176 }}
            className="z-[100] overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg"
          >
            <p className="px-3 pb-1 pt-1 text-2xs font-bold uppercase tracking-wide text-slate-400">
              Field
            </p>
            {FIELD_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() =>
                  onChange({
                    key: option.key,
                    direction: sort.key === option.key ? sort.direction : 'desc'
                  })
                }
                className={item(option.key === sort.key)}
              >
                {option.label}
                {option.key === sort.key && <Check className="h-3.5 w-3.5" />}
              </button>
            ))}

            <div className="my-1.5 border-t border-slate-100" />
            <p className="px-3 pb-1 pt-1 text-2xs font-bold uppercase tracking-wide text-slate-400">
              Order
            </p>
            {(['desc', 'asc'] as const).map((direction) => (
              <button
                key={direction}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange({ key: sort.key, direction })
                  setIsOpen(false)
                }}
                className={item(sort.direction === direction)}
              >
                {direction === 'desc' ? 'High' : 'Low'}
                {sort.direction === direction && <Check className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  )
}
