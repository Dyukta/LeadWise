import { Megaphone, Share2, UserRound } from 'lucide-react'

import type { Period } from '@logic/rules/performance'
import type { Filters } from '@pages/performance/match'
import { cn } from '@shared/lib/cn'
import { DateRangePicker } from '@shared/ui/DateRangePicker'
import { Dropdown } from '@shared/ui/Dropdown'
import { SearchInput } from '@shared/ui/SearchInput'

const options =(all: string, values: string[]) => [{ value: '', label: all }, ...values.map((value) => ({ value, label: value }))]

export function PerformanceFilters({
  filters,
  onChange,
  period,
  onPeriodChange,
  sources,
  campaigns,
  people,
  placeholder
}: {
  filters: Filters
  onChange: (next: Filters) => void
  period: Period
  onPeriodChange: (next: Period) => void
  sources: string[]
  campaigns: string[]
  people?: { value: string; label: string }[]
  placeholder: string
}) {
  const set = (key: keyof Filters) => (value: string) => onChange({ ...filters, [key]: value })

  return (
    <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:gap-3">
      <SearchInput
        className="xl:flex-1"
        inputClassName="border-slate-200 bg-white shadow-sm"
        placeholder={placeholder}
        aria-label="Search"
        value={filters.search}
        onChange={(event) => set('search')(event.target.value)}
      />
      <div className={cn('grid grid-cols-1 gap-2 sm:gap-3', people ? 'sm:grid-cols-4' : 'sm:grid-cols-3')}>
        {people && (
          <Dropdown
            className="min-w-0 xl:w-auto xl:max-w-64"
            icon={UserRound}
            active={Boolean(filters.person)}
            value={filters.person}
            onChange={set('person')}
            options={[{ value: '', label: 'All' }, ...people]}
          />
        )}
        <Dropdown
          className="min-w-0 xl:w-auto xl:max-w-64"
          icon={Share2}
          active={Boolean(filters.source)}
          value={filters.source}
          onChange={set('source')}
          options={options('All sources', sources)}
        />
        <Dropdown
          className="min-w-0 xl:w-auto xl:max-w-64"
          icon={Megaphone}
          active={Boolean(filters.campaign)}
          value={filters.campaign}
          onChange={set('campaign')}
          options={options('All campaigns', campaigns)}
        />
        <DateRangePicker
          className="min-w-0 xl:w-auto xl:max-w-64"
          label="All months"
          value={period.range}
          onChange={(range) => onPeriodChange({ month: '', range })}
          onClear={() => onPeriodChange({ month: '', range: null })}
          period={period.month}
          onPeriodChange={(month) => onPeriodChange({ month, range: null })}
        />
      </div>
    </div>
  )
}
