import { useState } from 'react'

import { cn } from '@shared/lib/cn'

export type BarRow = { name: string; value: number; color: string }

export function HorizontalBars({
  rows,
  axisMax,
  ticks,
  format
}: {
  rows: BarRow[]
  axisMax: number
  ticks: number[]
  format: (value: number) => string
}) {
  const [hover, setHover] = useState<string | null>(null)

  return (
    <div>
      {rows.map((row) => (
        <div
          key={row.name}
          className="relative grid h-11 grid-cols-[3.5rem_1fr] sm:grid-cols-[5.75rem_1fr] items-center gap-2 rounded-lg px-1 hover:bg-slate-50"
          onMouseEnter={() => setHover(row.name)}
          onMouseLeave={() => setHover(null)}
        >
          <span className="truncate text-right text-xs text-slate-400" title={row.name}>
            {row.name}
          </span>

          <div className="relative h-6">
            {ticks.map((tick) => (
              <span
                key={`grid-${tick}`}
                aria-hidden
                className="absolute top-0 h-full border-l border-dashed border-slate-100"
                style={{ left: `${(tick / axisMax) * 100}%` }}
              />
            ))}
            <div
              className="absolute inset-y-0 left-0 rounded-r-lg"
              style={{
                width: `${Math.min(100, Math.max(0, (row.value / axisMax) * 100))}%`,
                backgroundColor: row.color
              }}
            />
            {hover === row.name && (
              <div className="pointer-events-none absolute -top-1 left-2 z-10 -translate-y-full rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-md">
                <p className="mb-0.5 text-2xs font-semibold uppercase tracking-wide text-slate-500">
                  {row.name}
                </p>
                <p className="text-sm font-bold text-ink">{format(row.value)}</p>
              </div>
            )}
          </div>
        </div>
      ))}

      <div className="relative mt-1 grid h-4 grid-cols-[3.5rem_1fr] sm:grid-cols-[5.75rem_1fr] gap-2 px-1">
        <span />
        <div className="relative">
          {ticks.map((tick) => (
            <span
              key={`tick-${tick}`}
              className={cn(
                'absolute text-2xs text-slate-400',
                tick === axisMax ? '-translate-x-full' : '-translate-x-1/2'
              )}
              style={{ left: `${(tick / axisMax) * 100}%` }}
            >
              {tick}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
