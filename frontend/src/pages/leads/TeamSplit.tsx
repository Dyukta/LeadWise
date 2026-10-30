import { Check } from 'lucide-react'

import type { useTeamSplit } from '@hooks/useTeamSplit'
import { cn } from '@shared/lib/cn'
import { pluralize } from '@shared/lib/format'

type Person = { id: string; name: string }

export function TeamSplitPicker({
  split,
  team,
  heading,
  noun,
  rest,
  busy
}: {
  split: ReturnType<typeof useTeamSplit>
  team: Person[]
  heading: string
  noun: string
  rest: string
  busy: boolean
}) {
  const allPicked = team.length > 0 && split.picked.length === team.length

  return (
    <>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-700">{heading}</p>
        {team.length > 1 && (
          <button
            type="button"
            disabled={busy}
            onClick={() => split.pick(allPicked ? [] : team.map((person) => person.id))}
            className="text-sm font-semibold text-brand-700 hover:text-brand-800"
          >
            {allPicked ? 'Clear all' : 'Select all'}
          </button>
        )}
      </div>
      {team.length === 0 && <p className="text-sm text-slate-500">No active users yet. Add one on the Users page.</p>}
      <ul className="scrollbar-thin max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
        {team.map((person) => {
          const on = split.picked.includes(person.id)
          return (
            <li key={person.id} className={cn('flex items-center pr-3', on && 'bg-brand-50')}>
              <button
                type="button"
                disabled={busy}
                aria-pressed={on}
                onClick={() => split.toggle(person.id)}
                className={cn(
                  'flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors',
                  !on && 'hover:bg-slate-50'
                )}
              >
                <span
                  className={cn(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                    on ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300'
                  )}
                >
                  {on && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium text-ink">{person.name}</span>
              </button>
              {on && (
                <label className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-brand-700">
                  <input
                    type="text"
                    inputMode="numeric"
                    disabled={busy}
                    value={split.countFor(person.id)}
                    onChange={(event) => split.setCount(person.id, event.target.value)}
                    aria-label={`Leads for ${person.name}`}
                    className="w-14 rounded-lg border border-slate-300 bg-white px-2 py-1 text-center text-sm text-ink outline-none focus:border-brand-500"
                  />
                  leads
                </label>
              )}
            </li>
          )
        })}
      </ul>
      {split.picked.length > 0 && (
        <div className="mt-3 flex items-center justify-between gap-3 text-xs">
          {split.over > 0 ? (
            <p role="alert" className="font-medium text-red-600">
              {pluralize(split.over, 'lead')} more than the {split.size} {noun}. Lower a number.
            </p>
          ) : (
            <p className="text-slate-500">
              {split.total} of {split.size} assigned
              {split.total < split.size && ` · ${split.size - split.total} ${rest}`}
            </p>
          )}
          {split.custom && (
            <button
              type="button"
              disabled={busy}
              onClick={split.splitEqually}
              className="shrink-0 font-semibold text-brand-700 hover:text-brand-800"
            >
              Split equally
            </button>
          )}
        </div>
      )}
    </>
  )
}
