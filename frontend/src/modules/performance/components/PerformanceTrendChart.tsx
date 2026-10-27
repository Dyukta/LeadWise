import { LineChart } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { buildWeeks, type TrendPoint } from '@modules/performance/domain/trend'
import { Card } from '@shared/ui/Card'
import { EmptyState } from '@shared/ui/EmptyState'
import { ScrollHint } from '@shared/ui/ScrollHint'
import { SegmentedControl } from '@shared/ui/SegmentedControl'

type Grain = 'weekly' | 'monthly'

const H = 280
const PAD = { top: 16, right: 16, bottom: 26, left: 36 }

function yScale(max: number): { top: number; ticks: number[] } {
  const step = Math.max(1, Math.ceil(max / 4))
  const top = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let value = 0; value <= top; value += step) ticks.push(value)
  return { top, ticks }
}

export function PerformanceTrendChart({ title, days }: { title: string; days: TrendPoint[] }) {
  const [grain, setGrain] = useState<Grain>('monthly')
  const [hover, setHover] = useState<number | null>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const [available, setAvailable] = useState(0)

  const data = grain === 'weekly' ? buildWeeks(days) : days
  const filed = data.filter((point) => point.hasRecord).length

  useEffect(() => {
    const element = wrap.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setAvailable(entry.contentRect.width)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [filed])

  const scale = yScale(Math.max(1, ...data.map((point) => point.achieved ?? 0)))
  const minBand = data.some((point) => point.label.includes(' ')) ? 52 : 26
  const width = Math.max(available, data.length * minBand + PAD.left + PAD.right, 320)

  const plotW = width - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  const band = plotW / Math.max(data.length, 1)
  const x = (index: number) => PAD.left + band * (index + 0.5)
  const y = (value: number) => PAD.top + plotH - (value / scale.top) * plotH

  const plotted = data
    .map((point, index) => ({ point, index }))
    .filter(({ point }) => point.achieved !== null)

  const line = plotted
    .map(({ point, index }, seen) => `${seen === 0 ? 'M' : 'L'}${x(index)} ${y(point.achieved!)}`)
    .join(' ')

  const area =
    plotted.length < 2
      ? ''
      : `${line} L${x(plotted[plotted.length - 1]!.index)} ${y(0)} L${x(plotted[0]!.index)} ${y(0)} Z`

  return (
    <Card>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-3 text-lg font-bold text-ink">
          <LineChart className="h-5 w-5 text-brand-600" />
          {title}
        </h3>
        <SegmentedControl
          value={grain}
          onChange={setGrain}
          options={[
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' }
          ]}
        />
      </div>

      {data.length === 0 ? (
        <div className="h-[200px]">
          <EmptyState icon={LineChart} title="No records in this range yet" />
        </div>
      ) : (
        <>
          <ScrollHint target={wrap} />
          <div ref={wrap} className="scrollbar-thin relative overflow-x-auto overflow-y-hidden">
            <svg
              width={width}
              height={H}
              role="img"
              aria-label={title}
              onMouseLeave={() => setHover(null)}
            >
              {scale.ticks.map((value) => (
                <g key={`y-${value}`}>
                  <line
                    x1={PAD.left}
                    x2={width - PAD.right}
                    y1={y(value)}
                    y2={y(value)}
                    stroke="var(--color-slate-200)"
                    strokeDasharray={value === 0 ? undefined : '3 3'}
                  />
                  <text
                    x={PAD.left - 8}
                    y={y(value) + 4}
                    textAnchor="end"
                    fontSize={11}
                    fill="var(--color-slate-400)"
                  >
                    {value}
                  </text>
                </g>
              ))}

              {area && <path d={area} fill="var(--color-brand-500)" opacity={0.08} />}

              <path
                d={line}
                fill="none"
                stroke="var(--color-brand-500)"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {data.map((point, index) =>
                point.achieved === null ? null : (
                  <circle
                    key={`dot-${point.caption}`}
                    cx={x(index)}
                    cy={y(point.achieved)}
                    r={point.isAbsent ? 4 : hover === index ? 5 : 3.5}
                    fill={
                      point.isAbsent
                        ? 'var(--color-red-500)'
                        : point.hasRecord
                          ? 'var(--color-brand-500)'
                          : 'var(--color-slate-300)'
                    }
                    stroke="var(--color-surface)"
                    strokeWidth={1.5}
                  />
                )
              )}

              {data.map((point, index) =>
                point.isOff ? (
                  <g key={`offmark-${point.caption}`}>
                    <circle
                      cx={x(index)}
                      cy={y(0)}
                      r={3.5}
                      fill="var(--color-surface)"
                      stroke="var(--color-slate-300)"
                      strokeWidth={1.5}
                    />
                    <text
                      x={x(index)}
                      y={y(0) - 10}
                      textAnchor="middle"
                      fontSize={9}
                      fontWeight={700}
                      fill="var(--color-slate-400)"
                    >
                      OFF
                    </text>
                  </g>
                ) : null
              )}

              {data.map((point, index) => (
                <text
                  key={`x-${point.caption}`}
                  x={x(index)}
                  y={H - 8}
                  textAnchor="middle"
                  fontSize={11}
                  fill={hover === index ? 'var(--color-ink)' : 'var(--color-slate-400)'}
                >
                  {point.label}
                </text>
              ))}

              {hover !== null && (
                <line
                  x1={x(hover)}
                  x2={x(hover)}
                  y1={PAD.top}
                  y2={PAD.top + plotH}
                  stroke="var(--color-slate-300)"
                  strokeWidth={1}
                />
              )}

              {data.map((point, index) => (
                <rect
                  key={`hit-${point.caption}`}
                  x={x(index) - band / 2}
                  y={PAD.top}
                  width={band}
                  height={plotH}
                  fill="transparent"
                  onMouseEnter={() => setHover(index)}
                />
              ))}
            </svg>

            {hover !== null && data[hover] && (
              <TrendTooltip point={data[hover]} left={x(hover)} />
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <Key color="var(--color-brand-500)" label="Achieved" />
            <Key color="var(--color-red-500)" label="Absent" />
            <Key color="var(--color-slate-300)" label="No report filed" />
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full border-[1.5px] border-slate-300 bg-surface" />
              Weekly off
            </span>
          </div>
        </>
      )}
    </Card>
  )
}

function Key({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}

function TrendTooltip({ point, left }: { point: TrendPoint; left: number }) {
  const text = point.isOff
    ? 'Weekly off'
    : point.isAbsent
      ? 'Absent'
      : !point.hasRecord
        ? point.achieved === null
          ? 'Not yet'
          : 'No report filed'
        : `${point.achieved} achieved`

  return (
    <div
      className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold shadow-md"
      style={{ left }}
    >
      <p className="text-slate-400">{point.caption}</p>
      <p className="text-ink">{text}</p>
    </div>
  )
}
