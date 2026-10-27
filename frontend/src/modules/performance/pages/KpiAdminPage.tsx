import { CalendarRange, Calendar, ChevronRight, Loader2, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { CatalogueKpi, Period } from '@modules/performance/api/performanceTypes'
import { usePerformanceMonths } from '@modules/performance/hooks/usePerformance'
import { useKpiCatalogue, useSaveKpiCatalogue } from '@modules/performance/hooks/useReport'
import { currentPeriod, makePeriod, parsePeriod, periodLabel, periodOptions } from '@shared/lib/date'
import { Button } from '@shared/ui/Button'
import { Card } from '@shared/ui/Card'
import { Dropdown } from '@shared/ui/Dropdown'
import { Input } from '@shared/ui/Input'
import { Loading } from '@shared/ui/Loading'
import { Modal } from '@shared/ui/Modal'

type Line = { key: string; label: string; target: string }

let nextKey = 0
const newLine = (label = '', target = ''): Line => ({ key: `line-${nextKey++}`, label, target })

function nextPeriod(period: Period): Period {
  const { year, month } = parsePeriod(period)
  const date = new Date(year, month, 1)
  return makePeriod(date.getFullYear(), date.getMonth() + 1)
}

function sinceLabel(kpi: CatalogueKpi, month: Period): string {
  if (kpi.from === month) return 'changed this month'
  if (!kpi.from) return 'unchanged'
  return `unchanged since ${periodLabel(kpi.from)}`
}

export function KpiAdminPage() {
  const months = usePerformanceMonths()
  const [month, setMonth] = useState<Period>(currentPeriod)
  const [open, setOpen] = useState<string | null>(null)
  const catalogue = useKpiCatalogue(month)

  const options = useMemo(() => {
    const known = [...(months.data ?? []), currentPeriod(), nextPeriod(currentPeriod())]
    return periodOptions([...new Set(known)].sort().reverse())
  }, [months.data])

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink sm:text-3xl">KPIs &amp; departments</h1>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto sm:gap-3">
          <Dropdown
            className="min-w-0 flex-1 sm:w-48 sm:flex-none"
            icon={Calendar}
            value={month}
            onChange={setMonth}
            options={options}
          />
          <Button
            className="h-12 min-w-0 flex-1 whitespace-nowrap sm:h-10 sm:flex-none"
            disabled={catalogue.isPending}
            onClick={() => setOpen('')}
          >
            <Plus className="h-4 w-4" />
            New department
          </Button>
        </div>
      </header>

      <Card padding="sm" tone="brand">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-200 bg-white text-brand-600">
            <CalendarRange className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-2xs font-semibold uppercase tracking-wide text-brand-700">
              Targets for
            </p>
            <p className="text-lg font-bold leading-tight text-ink">{periodLabel(month)}</p>
            <p className="mt-1 text-sm text-slate-600">
              Changes start from {periodLabel(month)}. Earlier months keep their old targets.
            </p>
          </div>
        </div>
      </Card>

      {catalogue.isPending ? (
        <Loading />
      ) : catalogue.isError ? (
        <p className="text-sm text-red-600">{(catalogue.error as Error).message}</p>
      ) : (
        <Catalogue
          key={month}
          month={month}
          saved={catalogue.data ?? []}
          open={open}
          onOpenChange={setOpen}
        />
      )}
    </div>
  )
}

function Catalogue({
  month,
  saved,
  open,
  onOpenChange
}: {
  month: Period
  saved: CatalogueKpi[]
  open: string | null
  onOpenChange: (department: string | null) => void
}) {
  const save = useSaveKpiCatalogue(month)

  const departments = useMemo(() => {
    const seen: string[] = []
    for (const kpi of saved) if (!seen.includes(kpi.department)) seen.push(kpi.department)
    return seen.sort((a, b) => a.localeCompare(b))
  }, [saved])

  const close = () => {
    save.reset()
    onOpenChange(null)
  }

  const commit = (was: string, rows: CatalogueKpi[]) => {
    save.mutate({ department: was, rows }, { onSuccess: close })
  }

  return (
    <div className="space-y-5">
      {save.isError && open === null && (
        <p role="alert" className="text-sm text-red-600">
          {(save.error as Error).message}
        </p>
      )}

      {departments.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">
            No departments yet. Create one and give it the KPIs its team is measured on.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {departments.map((department) => {
            const kpis = saved.filter((kpi) => kpi.department === department)

            return (
              <button
                key={department}
                type="button"
                onClick={() => onOpenChange(department)}
                className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all sm:p-5 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-base font-bold text-ink">{department}</h2>
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-brand-600" />
                </div>
                <ul className="mt-4 space-y-1.5">
                  {kpis.map((kpi) => (
                    <li
                      key={kpi.label}
                      className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-700">
                          {kpi.label}
                        </span>
                        <span className="block text-2xs text-slate-400">{sinceLabel(kpi, month)}</span>
                      </span>
                      <span className="shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-bold tabular-nums text-brand-700">
                        {kpi.target}/mo
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs font-medium text-slate-400 transition-colors group-hover:text-brand-600">
                  {kpis.length} {kpis.length === 1 ? 'KPI' : 'KPIs'} · click to edit
                </p>
              </button>
            )
          })}
        </div>
      )}

      {open !== null && (
        <DepartmentDialog
          key={open}
          month={month}
          department={open}
          kpis={saved.filter((kpi) => kpi.department === open)}
          taken={departments.filter((name) => name !== open)}
          busy={save.isPending}
          error={save.isError ? (save.error as Error).message : null}
          onClose={close}
          onSave={(rows) => commit(open, rows)}
        />
      )}
    </div>
  )
}

function DepartmentDialog({
  month,
  department,
  kpis,
  taken,
  busy,
  error,
  onClose,
  onSave
}: {
  month: Period
  department: string
  kpis: CatalogueKpi[]
  taken: string[]
  busy: boolean
  error: string | null
  onClose: () => void
  onSave: (rows: CatalogueKpi[]) => void
}) {
  const isNew = department === ''

  const [name, setName] = useState(department)
  const [lines, setLines] = useState<Line[]>(() =>
    kpis.length > 0 ? kpis.map((kpi) => newLine(kpi.label, String(kpi.target))) : [newLine()]
  )
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const patch = (key: string, change: Partial<Line>) =>
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...change } : line)))

  const filled = lines.filter((line) => line.label.trim() !== '' || line.target.trim() !== '')

  const duplicate = filled.find((line, index) =>
    filled.some(
      (other, otherIndex) =>
        otherIndex < index && other.label.trim().toLowerCase() === line.label.trim().toLowerCase()
    )
  )

  const blocked = !name.trim()
    ? 'Name the department.'
    : taken.some((other) => other.toLowerCase() === name.trim().toLowerCase())
      ? 'A department already goes by that name.'
      : filled.length === 0
        ? 'Add at least one KPI.'
        : filled.some((line) => !line.label.trim())
          ? 'Every KPI needs a name.'
          : filled.some((line) => !(Number(line.target) > 0) || !Number.isInteger(Number(line.target)))
            ? 'Every KPI needs a whole number monthly target above zero.'
            : duplicate
              ? `"${duplicate.label}" is listed twice.`
              : null

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (blocked) return
    onSave(
      filled.map((line) => ({
        department: name.trim(),
        label: line.label.trim(),
        target: Number(line.target),
        unit: '',
        period: 'monthly'
      }))
    )
  }

  const renamed =
    !isNew && name.trim() !== '' && name.trim().toLowerCase() !== department.toLowerCase()
  const dropped = isNew
    ? []
    : kpis.filter(
        (kpi) =>
          !filled.some((line) => line.label.trim().toLowerCase() === kpi.label.toLowerCase())
      )
  const fromLabel = periodLabel(month)

  return (
    <Modal open onClose={onClose} title={isNew ? 'New department' : department}>
      <form id="dept-form" className="space-y-4" onSubmit={submit} noValidate>
        <Input
          label="Department"
          autoFocus={isNew}
          value={name}
          disabled={busy}
          onChange={(event) => setName(event.target.value)}
        />
        {renamed && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Renaming {department} to {name.trim()}. From {fromLabel} its KPIs move to{' '}
            {name.trim()}; earlier months stay under {department}. To add a separate department,
            close this and use New department instead.
          </p>
        )}
        {!renamed && dropped.length > 0 && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {dropped.map((kpi) => kpi.label).join(', ')}{' '}
            {dropped.length === 1 ? 'stops' : 'stop'} counting from {fromLabel}.
          </p>
        )}
        <div className="space-y-2">
          <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_auto] sm:grid-cols-[minmax(0,1fr)_7rem_auto] items-center gap-2">
            <span className="text-sm font-medium text-slate-700">KPI</span>
            <span className="text-sm font-medium text-slate-700">Monthly target</span>
            <span className="w-8" />
          </div>

          {lines.map((line) => (
            <div key={line.key} className="grid grid-cols-[minmax(0,1fr)_4.5rem_auto] sm:grid-cols-[minmax(0,1fr)_7rem_auto] items-center gap-2">
              <Input
                value={line.label}
                disabled={busy}
                onChange={(event) => patch(line.key, { label: event.target.value })}
              />
              <Input
                inputMode="numeric"
                value={line.target}
                disabled={busy}
                onChange={(event) =>
                  patch(line.key, { target: event.target.value.replace(/\D/g, '') })
                }
              />
              <button
                type="button"
                aria-label="Remove KPI"
                disabled={busy || lines.length === 1}
                onClick={() => setLines((current) => current.filter((row) => row.key !== line.key))}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => setLines((current) => [...current, newLine()])}
          >
            <Plus className="h-3.5 w-3.5" />
            Add KPI
          </Button>
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {confirmingDelete && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">
              Delete {department} and its {kpis.length} {kpis.length === 1 ? 'KPI' : 'KPIs'}?
              Reports already filed are kept; nobody can file against them again.
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => setConfirmingDelete(false)}
              >
                Keep
              </Button>
              <Button variant="danger" size="sm" disabled={busy} onClick={() => onSave([])}>
                {busy ? 'Deleting…' : 'Delete department'}
              </Button>
            </div>
          </div>
        )}
      </form>
      <footer className="mt-5 flex flex-wrap items-center gap-2">
        {!isNew && !confirmingDelete && (
          <Button
            variant="ghostDanger"
            disabled={busy}
            onClick={() => setConfirmingDelete(true)}
          >
            Delete
          </Button>
        )}

        {blocked && <p className="text-sm text-slate-500">{blocked}</p>}

        <div className="ml-auto flex gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form="dept-form" disabled={Boolean(blocked) || busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </footer>
    </Modal>
  )
}
