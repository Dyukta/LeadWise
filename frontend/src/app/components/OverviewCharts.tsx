import { useState } from 'react'

function ChartTip({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold shadow-md">
      <p className="text-slate-400">{title}</p>
      <p className="text-ink">{value}</p>
    </div>
  )
}

const TREND_H = 200
const TREND_PAD = { top: 10, right: 12, bottom: 22, left: 28 }

export function TeamScoreTrend({ points }: { points: Array<{ label: string; score: number }> }) {
  const [hover, setHover] = useState<number | null>(null)

  const plotH = TREND_H - TREND_PAD.top - TREND_PAD.bottom
  const y = (score: number) => TREND_PAD.top + plotH - (Math.min(100, score) / 100) * plotH
  const xPct = (index: number) =>
    points.length <= 1 ? 50 : (index / (points.length - 1)) * 100

  return (
    <div className="relative h-[200px] w-full" onMouseLeave={() => setHover(null)}>
      <svg width="100%" height={TREND_H} preserveAspectRatio="none" className="absolute inset-0">
        {[0, 25, 50, 75, 100].map((tick) => (
          <line
            key={tick}
            x1="0"
            x2="100%"
            y1={y(tick)}
            y2={y(tick)}
            stroke="var(--color-slate-100)"
            strokeDasharray="3 3"
          />
        ))}
      </svg>

      <svg width="100%" height={TREND_H} className="absolute inset-0">
        {[0, 25, 50, 75, 100].map((tick) => (
          <text key={tick} x={2} y={y(tick) + 4} fontSize={11} fill="var(--color-slate-400)">
            {tick}
          </text>
        ))}
      </svg>

      <div className="absolute inset-0" style={{ left: TREND_PAD.left, right: TREND_PAD.right }}>
        <svg
          width="100%"
          height={TREND_H}
          viewBox={`0 0 100 ${TREND_H}`}
          preserveAspectRatio="none"
          className="absolute inset-0"
        >
          <polyline
            points={points.map((point, index) => `${xPct(index)},${y(point.score)}`).join(' ')}
            fill="none"
            stroke="var(--color-brand-500)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <svg width="100%" height={TREND_H} className="relative overflow-visible">
          {points.map((point, index) => (
            <circle
              key={point.label}
              cx={`${xPct(index)}%`}
              cy={y(point.score)}
              r={hover === index ? 6 : 3.5}
              fill="var(--color-brand-500)"
              stroke="var(--color-surface)"
              strokeWidth={1.5}
            />
          ))}
          {points.map((point, index) => (
            <text
              key={`l-${point.label}`}
              x={`${xPct(index)}%`}
              y={TREND_H - 6}
              textAnchor="middle"
              fontSize={11}
              fill="var(--color-slate-400)"
            >
              {point.label}
            </text>
          ))}
          {points.map((point, index) => (
            <rect
              key={`h-${point.label}`}
              x={`${Math.max(0, xPct(index) - 50 / Math.max(1, points.length))}%`}
              y={0}
              width={`${100 / Math.max(1, points.length)}%`}
              height={TREND_H}
              fill="transparent"
              onMouseEnter={() => setHover(index)}
            />
          ))}
        </svg>

        {hover !== null && points[hover] && (
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2"
            style={{ left: `${xPct(hover)}%` }}
          >
            <ChartTip
              title={points[hover].label}
              value={`${Math.round(points[hover].score)} avg score`}
            />
          </div>
        )}
      </div>
    </div>
  )
}
