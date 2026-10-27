import { getCountryCallingCode, type CountryCode } from 'libphonenumber-js/mobile'
import { ArrowLeft, FileSpreadsheet, Plus, TriangleAlert, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import type { NewLead } from '@modules/leads/api/leadTypes'
import { ImportLeadsDialog } from '@modules/leads/components/ImportLeadsDialog'
import { POSSESSION_BANDS } from '@modules/leads/domain/possession'
import { priorityLabel } from '@modules/leads/domain/priority'
import { formatBudget, parseBudget } from '@modules/leads/domain/requirements'
import { useCreateLeads } from '@modules/leads/hooks/useLeadMutations'
import { useActiveProjectNames } from '@modules/leads/hooks/useProjects'
import { COUNTRIES, DEFAULT_COUNTRY } from '@shared/lib/countries'
import { todayKey } from '@shared/lib/date'
import { Button } from '@shared/ui/Button'
import { Card } from '@shared/ui/Card'
import { DatePicker } from '@shared/ui/DatePicker'
import { Input } from '@shared/ui/Input'
import { Select, type SelectOption } from '@shared/ui/Select'

const DIAL_OPTIONS: SelectOption[] = COUNTRIES.map((country) => ({
  value: country.code,
  label: `${country.name} ${country.dial}`,
  short: country.dial,
  icon: <span className={`${country.flag} shrink-0 rounded-xs`} aria-hidden />
}))

const POSSESSION_OPTIONS: SelectOption[] = POSSESSION_BANDS.map((band) => ({
  value: band.value,
  label: `${band.value} (${priorityLabel(band.priority)} priority)`,
  short: band.value
}))

type Row = NewLead & { key: string; country: CountryCode; phoneTouched: boolean }

let nextKey = 0

function blankRow(): Row {
  return {
    key: `row-${nextKey++}`,
    date: todayKey(),
    name: '',
    country: DEFAULT_COUNTRY,
    phone: '',
    phoneTouched: false,
    source: '',
    sourceName: '',
    project: '',
    budget: '',
    configuration: '',
    possession: ''
  }
}

const digitsOnly = (value: string) => value.replace(/\D/g, '')

const maxDigits = (country: CountryCode) =>
  country === DEFAULT_COUNTRY ? 10 : 15 - getCountryCallingCode(country).length

const phoneOk = (row: Row) => {
  const digits = digitsOnly(row.phone)
  return row.country === DEFAULT_COUNTRY ? /^[6-9]\d{9}$/.test(digits) : digits.length >= 6
}

function problemWith(row: Row): string | null {
  if (!phoneOk(row)) {
    return row.country === DEFAULT_COUNTRY
      ? 'needs a valid 10 digit mobile number'
      : 'needs a valid phone number'
  }
  if (row.budget.trim() !== '' && parseBudget(row.budget) === null) {
    return 'has a budget that cannot be read (try 67 lakh, 1.5 cr or 6700000)'
  }
  return null
}

const isBlank = (row: Row) =>
  !row.name.trim() && !row.phone.trim() && !row.project.trim() && !row.budget.trim()

export function NewLeadsPage() {
  const navigate = useNavigate()
  const create = useCreateLeads()
  const projectNames = useActiveProjectNames()
  const [rows, setRows] = useState<Row[]>(() => [blankRow()])
  const [uploading, setUploading] = useState(false)

  const projectOptions: SelectOption[] = projectNames.map((name) => ({ value: name, label: name }))

  const filled = rows.filter((row) => !isBlank(row))
  const faults = filled
    .map((row, index) => ({ index, problem: problemWith(row) }))
    .filter((entry) => entry.problem !== null)

  const duplicate = filled.find((row, index) =>
    filled.some(
      (other, otherIndex) =>
        otherIndex < index &&
        digitsOnly(other.phone) !== '' &&
        other.country === row.country &&
        digitsOnly(other.phone) === digitsOnly(row.phone)
    )
  )

  const months = [...new Set(filled.map((row) => (row.date || todayKey()).slice(0, 7)))].sort()

  const blocked =
    filled.length === 0
      ? 'Fill in at least one lead.'
      : faults.length > 0
        ? `Lead ${faults[0]!.index + 1} ${faults[0]!.problem}.`
        : duplicate
          ? `${digitsOnly(duplicate.phone)} is entered twice.`
          : months.length > 1
            ? `Add leads one month at a time. This batch spans ${months.join(' and ')}.`
            : null

  const patch = (key: string, change: Partial<Row>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...change } : row)))

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (blocked || create.isPending) return

    create.mutate(
      filled.map((row) => ({
        date: row.date || todayKey(),
        name: row.name.trim(),
        phone:
          row.country === DEFAULT_COUNTRY
            ? digitsOnly(row.phone)
            : `+${getCountryCallingCode(row.country)}${digitsOnly(row.phone)}`,
        source: row.source.trim(),
        sourceName: row.sourceName.trim(),
        project: row.project.trim(),
        budget: row.budget.trim() === '' ? '' : String(parseBudget(row.budget)),
        configuration: row.configuration.trim(),
        possession: row.possession.trim()
      }))
    )
    navigate('/leads?view=all')
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <header>
        <Link
          to="/leads?view=all"
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All leads
        </Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-ink sm:text-3xl">Add leads</h1>
          <Button variant="secondary" size="sm" onClick={() => setUploading(true)}>
            <FileSpreadsheet className="h-4 w-4" />
            Upload Excel
          </Button>
        </div>
      </header>
      {uploading && <ImportLeadsDialog onClose={() => setUploading(false)} />}

      <form id="new-leads" className="space-y-4" onSubmit={submit} noValidate>
        {rows.map((row, index) => (
          <Card key={row.key} padding="sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-2xs font-semibold uppercase tracking-wide text-slate-400">
                Lead {index + 1}
              </p>
              <button
                type="button"
                aria-label={`Remove lead ${index + 1}`}
                disabled={rows.length === 1}
                onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DatePicker
                label="Date"
                max={todayKey()}
                value={row.date}
                onChange={(value) => patch(row.key, { date: value })}
              />
              <Input
                label="Name"
                value={row.name}
                onChange={(event) => patch(row.key, { name: event.target.value })}
              />
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-slate-700">
                  Phone <span className="text-red-600">*</span>
                </span>
                <div className="flex gap-2">
                  <Select
                    searchable
                    placeholder=""
                    options={DIAL_OPTIONS}
                    value={row.country}
                    onChange={(value) => patch(row.key, { country: value as CountryCode })}
                    className="w-28 shrink-0"
                  />
                  <div className="flex-1">
                    <Input
                      aria-label="Phone number"
                      inputMode="numeric"
                      maxLength={maxDigits(row.country)}
                      value={row.phone}
                      onChange={(event) =>
                        patch(row.key, {
                          phone: digitsOnly(event.target.value).slice(0, maxDigits(row.country)),
                          phoneTouched: false
                        })
                      }
                      onBlur={() => patch(row.key, { phoneTouched: true })}
                      error={
                        row.phoneTouched && row.phone !== '' && !phoneOk(row)
                          ? row.country === DEFAULT_COUNTRY
                            ? 'Enter a valid 10 digit mobile number starting with 6, 7, 8 or 9.'
                            : 'Enter a valid phone number.'
                          : undefined
                      }
                    />
                  </div>
                </div>
              </div>
              <Input
                label="Source"
                value={row.source}
                onChange={(event) => patch(row.key, { source: event.target.value })}
              />
              <Input
                label="Source name"
                value={row.sourceName}
                onChange={(event) => patch(row.key, { sourceName: event.target.value })}
              />
              <Select
                label="Project"
                placeholder="Pick a project"
                options={projectOptions}
                value={row.project}
                searchable={projectOptions.length > 8}
                onChange={(value) => patch(row.key, { project: value })}
              />
              <Input
                label="Budget"
                value={row.budget}
                onChange={(event) => patch(row.key, { budget: event.target.value })}
                error={
                  row.budget.trim() !== '' && parseBudget(row.budget) === null
                    ? 'Try 67 lakh, 1.5 cr or 6700000'
                    : undefined
                }
                rightSlot={
                  parseBudget(row.budget) !== null && (
                    <span className="pointer-events-none pr-1 text-xs font-semibold text-slate-400">
                      {formatBudget(parseBudget(row.budget))}
                    </span>
                  )
                }
              />
              <Input
                label="Configuration"
                value={row.configuration}
                onChange={(event) => patch(row.key, { configuration: event.target.value })}
              />
              <Select
                label="Possession"
                options={POSSESSION_OPTIONS}
                value={row.possession}
                onChange={(value) => patch(row.key, { possession: value })}
              />
            </div>
          </Card>
        ))}

        <Button
          variant="secondary"
          className="w-full"
          onClick={() => setRows((current) => [...current, blankRow()])}
        >
          <Plus className="h-4 w-4" />
          Add another lead
        </Button>
      </form>

      <div className="flex flex-wrap items-center gap-3">
        {blocked && (
          <p
            role="alert"
            className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 ring-1 ring-amber-200"
          >
            <TriangleAlert className="h-4 w-4 shrink-0" />
            {blocked}
          </p>
        )}
        <div className="ml-auto flex gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate('/leads?view=all')}
          >
            Cancel
          </Button>
          <Button type="submit" form="new-leads" disabled={Boolean(blocked)}>
            {`Save ${filled.length || ''} ${filled.length === 1 ? 'lead' : 'leads'}`.trim()}
          </Button>
        </div>
      </div>
    </div>
  )
}
