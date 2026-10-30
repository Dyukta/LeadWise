import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

import { percent, type Breakdown } from '@logic/rules/performance'
import { cn } from '@shared/lib/cn'
import { compactMoney, formatMoney, niceTop, pluralize } from '@shared/lib/format'
import { Skeleton } from '@shared/ui/Skeleton'

const H = 240
const PAD = { top: 28, right: 24, bottom: 28, left: 56 }
const TOP_BARS = 8
const SERIES = [
  { stroke: 'stroke-brand-600', fill: 'fill-brand-600', swatch: 'bg-brand-600' },
  { stroke: 'stroke-amber-500', fill: 'fill-amber-500', swatch: 'bg-amber-500' },
  { stroke: 'stroke-rose-500', fill: 'fill-rose-500', swatch: 'bg-rose-500' },
  { stroke: 'stroke-sky-500', fill: 'fill-sky-500', swatch: 'bg-sky-500' },
  { stroke: 'stroke-violet-500', fill: 'fill-violet-500', swatch: 'bg-violet-500' },
  { stroke: 'stroke-emerald-500', fill: 'fill-emerald-500', swatch: 'bg-emerald-500' }
]

function useWidth() {
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(600)
  useLayoutEffect(() => {
    const element = box.current
    if (!element) return
    setWidth(Math.max(280, element.clientWidth))
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, entry!.contentRect.width)))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return [box, width] as const
}

export function ChartCard({ title, loading, children }: { title: string; loading: boolean; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      <h2 className="mb-4 text-lg font-bold text-ink">{title}</h2>
      {loading ? <Skeleton className="h-56 w-full" /> : children}
    </section>
  )
}

export function LeadsVsClosedChart({ rows }: { rows: Breakdown[] }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const shown = rows.slice(0, TOP_BARS)
  const top = niceTop(shown[0]?.leads ?? 0, 2)
  if (shown.length === 0) return <p className="py-10 text-center text-sm text-slate-500">No leads in this period.</p>

  return (
    <div>
      <ul className="mb-3 flex gap-4 text-xs text-slate-600">
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-700" />
          Leads
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-950" />
          Closed
        </li>
      </ul>
      <div className="relative h-52">
        {[0, 50, 100].map((at) => (
          <div key={at} className="absolute inset-x-0 border-t border-slate-200" style={{ top: `${at}%` }} />
        ))}
        <div className="relative flex h-full items-end justify-around gap-2" onMouseLeave={() => setHovered(null)}>
          {shown.map((row, index) => (
            <div
              key={row.name}
              tabIndex={0}
              aria-label={`${row.name}: ${pluralize(row.leads, 'lead')}, ${row.closed} closed, ${percent(row)} conversion`}
              onMouseEnter={() => setHovered(index)}
              onFocus={() => setHovered(index)}
              onBlur={() => setHovered(null)}
              className={cn(
                'relative flex h-full min-w-0 flex-1 items-end justify-center gap-1 outline-none transition-opacity',
                hovered !== null && hovered !== index && 'opacity-40'
              )}
            >
              {hovered === index && (
                <div
                  className={cn(
                    'pointer-events-none absolute bottom-full z-20 mb-2 w-56 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-lg',
                    index === 0 ? 'left-0' : index === shown.length - 1 ? 'right-0' : 'left-1/2 -translate-x-1/2'
                  )}
                >
                  <p className="mb-2 font-semibold wrap-break-word text-ink">{row.name}</p>
                  <dl className="space-y-1 text-slate-600">
                    {[
                      ['Leads', row.leads],
                      ['Closed', row.closed],
                      ['Conversion', percent(row)]
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between gap-3">
                        <dt>{label}</dt>
                        <dd className="font-semibold tabular-nums text-ink">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
              {[
                { value: row.leads, color: 'bg-emerald-700' },
                { value: row.closed, color: 'bg-emerald-950' }
              ].map((bar, index) => (
                <div key={index} className="flex h-full w-full max-w-6 flex-col items-center justify-end">
                  <span className="mb-1 whitespace-nowrap text-2xs font-semibold tabular-nums text-slate-600">{bar.value}</span>
                  <div
                    className={cn('w-full rounded-t', bar.color)}
                    style={{ height: `${(bar.value / top) * 100}%`, minHeight: bar.value ? 3 : 0 }}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex justify-around gap-2">
        {shown.map((row) => (
          <p key={row.name} title={row.name} className="min-w-0 flex-1 text-center text-2xs leading-tight text-slate-600">
            <span className="line-clamp-2 wrap-break-word">{row.name}</span>
            <span className="font-semibold text-ink">{percent(row)}</span>
          </p>
        ))}
      </div>
    </div>
  )
}

export function LostReasonsChart({ rows }: { rows: Breakdown[] }) {
  const total = rows.reduce((sum, row) => sum + row.leads, 0)
  if (total === 0) return <p className="py-10 text-center text-sm text-slate-500">No lost leads in this period.</p>

  const share = (row: Breakdown) => Math.round((row.leads / total) * 100)
  const starts = rows.map((_, i) => rows.slice(0, i).reduce((sum, row) => sum + row.leads, 0))

  return (
    <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-2">
      <svg viewBox="0 0 64 64" className="mx-auto h-56 w-56 -rotate-90" role="img" aria-label="Lost reasons">
        {rows.map((row, i) => (
          <circle
            key={row.name}
            cx="32"
            cy="32"
            r="16"
            fill="none"
            strokeWidth="32"
            pathLength={total}
            strokeDasharray={`${row.leads} ${total}`}
            strokeDashoffset={-starts[i]!}
            className={SERIES[i % SERIES.length]!.stroke}
          >
            <title>{`${row.name}: ${pluralize(row.leads, 'time')} · ${share(row)}%`}</title>
          </circle>
        ))}
      </svg>
      <ul className="space-y-3">
        {rows.map((row, i) => (
          <li key={row.name} className="flex items-center gap-3 text-sm">
            <span className={cn('h-3 w-3 shrink-0 rounded-full', SERIES[i % SERIES.length]!.swatch)} />
            <span className="min-w-0 flex-1 truncate text-slate-700" title={row.name}>
              {row.name}
            </span>
            <span className="whitespace-nowrap tabular-nums text-slate-600">
              <span className="font-semibold text-ink">{pluralize(row.leads, 'time')}</span> · {share(row)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export type Month ={ key: string; label: string; amount: number; deals: number; total: number }

export function GrowthChart({ months }: { months: Month[] }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const [box, W] = useWidth()

  const top = niceTop(Math.max(...months.map((month) => month.total)), 100000)
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const slot = plotW / months.length
  const x = (index: number) => PAD.left + slot * index + slot / 2
  const y = (amount: number) => PAD.top + plotH - (amount / top) * plotH
  const base = PAD.top + plotH
  const line = `M${months.map((month, index) => `${x(index)},${y(month.total)}`).join('L')}`
  const active = hovered === null ? null : months[hovered]!

  return (
    <div ref={box} className="relative">
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="block"
        role="img"
        aria-label={`Total amount closed by month: ${months.map((month) => `${month.label} ${formatMoney(month.total)}`).join(', ')}`}
        onMouseLeave={() => setHovered(null)}
      >
        {[0, top / 2, top].map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} className="stroke-slate-200" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle" className="fill-slate-500 text-[11px]">
              {compactMoney(tick)}
            </text>
          </g>
        ))}
        <path d={line} fill="none" className="stroke-brand-600" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {hovered !== null && (
          <line x1={x(hovered)} x2={x(hovered)} y1={PAD.top} y2={base} className="stroke-slate-300" strokeWidth={1} />
        )}
        {months.map((month, index) => (
          <g key={month.key}>
            <circle cx={x(index)} cy={y(month.total)} r={hovered === index ? 6 : 4} className="fill-brand-600 stroke-surface" strokeWidth={2} />
            {index === months.length - 1 && (
              <text x={x(index)} y={y(month.total) - 12} textAnchor="middle" className="fill-ink text-[11px] font-semibold">
                {compactMoney(month.total)}
              </text>
            )}
            <text x={x(index)} y={H - 8} textAnchor="middle" className="fill-slate-500 text-[11px]">
              {month.label}
            </text>
            <rect x={PAD.left + slot * index} y={PAD.top} width={slot} height={plotH} fill="transparent" onMouseEnter={() => setHovered(index)} />
          </g>
        ))}
      </svg>
      {active && (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"
          style={{ left: Math.min(Math.max(x(hovered!), 80), W - 80) }}
        >
          <p className="font-semibold text-ink">{active.label}</p>
          <p className="text-slate-600">Total {formatMoney(active.total)}</p>
          <p className="text-slate-500">
            +{formatMoney(active.amount)} · {pluralize(active.deals, 'deal')}
          </p>
        </div>
      )}
    </div>
  )
}

const dayLabel = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' })

export function CallsChart({ days, series }: { days: string[]; series: { name: string; counts: number[] }[] }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const [box, W] = useWidth()
  const oneMonth = days[0]?.slice(0, 7) === days.at(-1)?.slice(0, 7)

  const top = niceTop(Math.max(0, ...series.flatMap((person) => person.counts)), 4)
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const slot = plotW / Math.max(1, days.length)
  const x = (index: number) => PAD.left + slot * index + slot / 2
  const y = (count: number) => PAD.top + plotH - (count / top) * plotH
  const every = Math.ceil(days.length / Math.max(1, Math.floor(plotW / (oneMonth ? 24 : 56))))
  const label = (day: string) => dayLabel.format(new Date(`${day}T00:00:00`))
  const tick = (day: string) => (oneMonth ? String(Number(day.slice(8))) : label(day))

  return (
    <div ref={box} className="relative">
      <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {series.map((person, index) => (
          <li key={person.name} className="flex items-center gap-1.5">
            <span className={cn('h-2.5 w-2.5 rounded-sm', SERIES[index % SERIES.length]!.swatch)} />
            {person.name}
          </li>
        ))}
      </ul>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block" role="img" aria-label="Calls per day by person" onMouseLeave={() => setHovered(null)}>
        {[0, top / 2, top].map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} className="stroke-slate-200" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle" className="fill-slate-500 text-[11px]">
              {tick}
            </text>
          </g>
        ))}
        {series.map((person, index) => (
          <path
            key={person.name}
            d={`M${person.counts.map((count, day) => `${x(day)},${y(count)}`).join('L')}`}
            fill="none"
            className={SERIES[index % SERIES.length]!.stroke}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {hovered !== null && <line x1={x(hovered)} x2={x(hovered)} y1={PAD.top} y2={PAD.top + plotH} className="stroke-slate-300" strokeWidth={1} />}
        {days.map((day, index) => (
          <g key={day}>
            {index % every === 0 && (
              <text x={x(index)} y={H - 8} textAnchor="middle" className="fill-slate-500 text-[11px]">
                {tick(day)}
              </text>
            )}
            <rect x={PAD.left + slot * index} y={PAD.top} width={slot} height={plotH} fill="transparent" onMouseEnter={() => setHovered(index)} />
          </g>
        ))}
      </svg>
      {hovered !== null && (
        <div
          className="pointer-events-none absolute top-8 -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"
          style={{ left: Math.min(Math.max(x(hovered), 80), W - 80) }}
        >
          <p className="font-semibold text-ink">{label(days[hovered]!)}</p>
          {series.map((person) => (
            <p key={person.name} className="text-slate-600">
              {person.name}: {pluralize(person.counts[hovered]!, 'call')}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
