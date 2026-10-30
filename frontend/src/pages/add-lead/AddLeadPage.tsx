import { FileSpreadsheet, Loader2, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'

import { useAddLead } from '@hooks/useLeadMutations'
import { useLeads } from '@hooks/useLeads'
import { useSession } from '@hooks/useSession'
import { downloadTemplate } from '@logic/leads/exportLeads'
import { LEAD_STATUSES, isTerminalStatus, statusLabel } from '@logic/rules/statuses'
import { DownloadLeads } from '@pages/add-lead/DownloadLeads'
import { UploadLeads } from '@pages/add-lead/UploadLeads'
import { pluralize } from '@shared/lib/format'
import { toast } from '@shared/lib/toast'
import { Button } from '@shared/ui/Button'
import { Card } from '@shared/ui/Card'
import { DatePicker } from '@shared/ui/DatePicker'
import { Input } from '@shared/ui/Input'
import { SegmentedControl } from '@shared/ui/SegmentedControl'
import { Select } from '@shared/ui/Select'

const NEW_SOURCE = '__new'
const sourceOptions = ['Facebook', 'Instagram', 'Referral', 'WhatsApp', 'Call'].map((value) => ({ value, label: value }))
const statusOptions = LEAD_STATUSES.filter((value) => !isTerminalStatus(value)).map((value) => ({
  value,
  label: statusLabel(value)
}))

const tabs = [
  { value: 'form', label: 'Add lead' },
  { value: 'upload', label: 'Upload leads' },
  { value: 'download', label: 'Download leads' }
]

type Entry = {
  key: string
  name: string
  phone: string
  source: string
  newSource: string
  status: string
  notes: string
  followUp: string
  assigneeId: string
  error?: string
}

type Field = Exclude<keyof Entry, 'key' | 'error'>

const blank = (): Entry => ({
  key: crypto.randomUUID(),
  name: '',
  phone: '',
  source: '',
  newSource: '',
  status: 'new',
  notes: '',
  followUp: '',
  assigneeId: ''
})

function LeadFields({
  entry,
  number,
  people,
  onChange,
  onRemove
}: {
  entry: Entry
  number: number | null
  people: { value: string; label: string }[]
  onChange: (field: Field, value: string) => void
  onRemove: (() => void) | null
}) {
  const set = (field: Field) => (value: string) => onChange(field, value)
  const custom = entry.source === NEW_SOURCE
  const sourceToggle = (
    <button
      type="button"
      onClick={() => set('source')(custom ? '' : NEW_SOURCE)}
      className="text-xs font-semibold text-sky-600 underline underline-offset-2 hover:text-sky-700"
    >
      {custom ? 'Pick from list' : '+ Add new'}
    </button>
  )

  return (
    <fieldset className="space-y-5">
      {number !== null && (
        <legend className="flex w-full items-center justify-between pb-1">
          <span className="text-base font-bold text-ink">Lead {number}</span>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remove lead ${number}`}
              className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </legend>
      )}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6">
        <Input label="Name" value={entry.name} onChange={(event) => set('name')(event.target.value)} autoFocus />
        <Input
          label="Phone *"
          type="tel"
          inputMode="tel"
          required
          value={entry.phone}
          onChange={(event) => set('phone')(event.target.value)}
        />
        {custom ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor={`source-${entry.key}`} className="text-sm font-medium text-slate-700">
                Source
              </label>
              {sourceToggle}
            </div>
            <Input
              id={`source-${entry.key}`}
              placeholder="Type the new source"
              value={entry.newSource}
              onChange={(event) => set('newSource')(event.target.value)}
              autoFocus
            />
          </div>
        ) : (
          <Select
            label="Source"
            action={sourceToggle}
            placeholder="Pick a source"
            options={sourceOptions}
            value={entry.source}
            onChange={set('source')}
          />
        )}
        <Select label="Status" clearable={false} options={statusOptions} value={entry.status} onChange={set('status')} />
        <DatePicker label="Next follow up" value={entry.followUp} onChange={set('followUp')} />
        <Select label="Assigned to" placeholder="Unassigned" options={people} value={entry.assigneeId} onChange={set('assigneeId')} />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`notes-${entry.key}`} className="text-sm font-medium text-slate-700">
          Notes
        </label>
        <textarea
          id={`notes-${entry.key}`}
          value={entry.notes}
          onChange={(event) => set('notes')(event.target.value)}
          className="scrollbar-thin h-28 w-full resize-none overflow-y-auto wrap-break-word rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
      </div>
      {entry.error && <p className="text-sm font-semibold text-red-600">{entry.error}</p>}
    </fieldset>
  )
}

export function AddLeadPage() {
  const adding = useAddLead()
  const { session } = useSession()
  const { roster } = useLeads('mine')
  const [searchParams, setSearchParams] = useSearchParams()
  const mode = tabs.find((tab) => tab.value === searchParams.get('tab'))?.value ?? 'form'
  const [entries, setEntries] = useState<Entry[]>(() => [blank()])
  const [saving, setSaving] = useState(false)

  const people = roster
    .filter((person) => session?.role === 'owner' || person.id === session?.userId)
    .map((person) => ({ value: person.id, label: person.name }))

  const update = (key: string, field: Field, value: string) =>
    setEntries((current) => current.map((entry) => (entry.key === key ? { ...entry, [field]: value, error: undefined } : entry)))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    const failed: Entry[] = []
    for (const entry of entries) {
      try {
        await adding.mutateAsync({
          name: entry.name.trim(),
          phone: entry.phone.trim(),
          source: entry.source === NEW_SOURCE ? entry.newSource.trim() : entry.source,
          status: entry.status,
          notes: entry.notes.trim(),
          nextFollowUpAt: entry.followUp ? new Date(`${entry.followUp}T09:00:00`).toISOString() : null,
          assigneeId: entry.assigneeId
        })
      } catch (error) {
        failed.push({ ...entry, error: (error as Error).message })
      }
    }
    const added = entries.length - failed.length
    if (added) toast(`${pluralize(added, 'lead')} added`)
    if (failed.length) toast(`${pluralize(failed.length, 'lead')} not added`, 'error')
    setEntries(failed.length ? failed : [blank()])
    setSaving(false)
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">Leads</h1>
        <Button
          className="max-sm:h-8 max-sm:gap-1.5 max-sm:px-2.5 max-sm:text-xs"
          onClick={() => downloadTemplate().catch((error: Error) => toast(error.message))}
        >
          <FileSpreadsheet className="h-4 w-4" />
          Download template
        </Button>
      </header>
      <SegmentedControl value={mode} onChange={(tab) => setSearchParams({ tab })} options={tabs} />
      <Card className="space-y-6">
        {mode === 'upload' ? (
          <UploadLeads />
        ) : mode === 'download' ? (
          <DownloadLeads />
        ) : (
          <form onSubmit={submit} className="space-y-6">
            {entries.map((entry, index) => (
              <div key={entry.key} className={index > 0 ? 'border-t border-slate-200 pt-6' : undefined}>
                <LeadFields
                  entry={entry}
                  number={entries.length > 1 ? index + 1 : null}
                  people={people}
                  onChange={(field, value) => update(entry.key, field, value)}
                  onRemove={entries.length > 1 ? () => setEntries((current) => current.filter((item) => item.key !== entry.key)) : null}
                />
              </div>
            ))}
            <div className="grid grid-cols-1 gap-3">
              <Button variant="secondary" size="lg" disabled={saving} onClick={() => setEntries((current) => [...current, blank()])}>
                <Plus className="h-4 w-4" />
                Add another lead
              </Button>
              <Button type="submit" size="lg" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? 'Submitting…' : 'Submit'}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  )
}
