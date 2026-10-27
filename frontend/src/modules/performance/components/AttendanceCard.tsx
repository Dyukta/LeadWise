import type { Attendance } from '@modules/performance/api/performanceTypes'
import { Card } from '@shared/ui/Card'

export function AttendanceCard({ attendance }: { attendance: Attendance }) {
  const { presentDays, halfDays, absences, weeklyOffs } = attendance
  const totalDays = presentDays + halfDays + absences + weeklyOffs

  return (
    <Card className="flex flex-col" hoverLift>
      <p className="mb-4 text-2xs font-semibold uppercase tracking-wide text-slate-500">
        Attendance
      </p>
      <div className="grid flex-1 grid-cols-2 gap-2">
        <Tile value={presentDays} label="Present" className="border-emerald-200 bg-emerald-50" valueClassName="text-emerald-600" labelClassName="text-emerald-700" />
        <Tile value={halfDays} label="Half Day" className="border-amber-200 bg-amber-50" valueClassName="text-amber-600" labelClassName="text-amber-700" />
        <Tile value={absences} label="Absent" className="border-red-200 bg-red-50" valueClassName="text-red-600" labelClassName="text-red-700" />
        <Tile value={weeklyOffs} label="Weekly Off" className="border-slate-200 bg-slate-50" valueClassName="text-slate-600" labelClassName="text-slate-600" />
        <Tile value={totalDays} label="Total Days" className="col-span-2 border-slate-200 bg-slate-50" valueClassName="text-ink" labelClassName="text-slate-500" />
      </div>
    </Card>
  )
}

function Tile({
  value,
  label,
  className,
  valueClassName,
  labelClassName
}: {
  value: number
  label: string
  className: string
  valueClassName: string
  labelClassName: string
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg border px-2 py-4 text-center ${className}`}
    >
      <p className={`text-2xl font-bold leading-none ${valueClassName}`}>{value}</p>
      <p className={`mt-1.5 text-2xs font-semibold uppercase tracking-wide ${labelClassName}`}>
        {label}
      </p>
    </div>
  )
}
