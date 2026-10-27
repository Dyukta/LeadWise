import { Card } from '@shared/ui/Card'
import { Skeleton } from '@shared/ui/Skeleton'

const WHITE = 'bg-white/25'

function ScoreCardSkeleton() {
  return (
    <Card tone="brandGlow" className="flex flex-col gap-5">
      <div>
        <Skeleton className="h-2.5 w-24" tone={WHITE} />
        <Skeleton className="mt-2 h-7 w-2/3 sm:h-8" tone={WHITE} />
      </div>

      <div className="my-auto">
        <Skeleton className="h-12 w-48 sm:h-14" tone={WHITE} />
        <Skeleton className="mt-5 h-2.5 w-full" tone="bg-white/20" rounded="rounded-full" />
        <div className="mt-2.5 flex items-center justify-between gap-3">
          <Skeleton className="h-2.5 w-28" tone="bg-white/20" />
          <Skeleton className="h-2.5 w-20" tone="bg-white/20" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-[68px]" tone="bg-white/15" rounded="rounded-xl" />
        <Skeleton className="h-[68px]" tone="bg-white/15" rounded="rounded-xl" />
      </div>
    </Card>
  )
}

function AttendanceCardSkeleton() {
  return (
    <Card className="flex flex-col">
      <Skeleton className="mb-4 h-2.5 w-24" />
      <div className="grid flex-1 grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[72px]" />
        ))}
        <Skeleton className="col-span-2 h-[72px]" />
      </div>
    </Card>
  )
}

function TargetRowSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6 sm:py-5">
      <div className="flex items-center gap-3 sm:gap-4">
        <Skeleton className="h-9 w-9 shrink-0 sm:h-10 sm:w-10" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Skeleton className="h-3.5 w-2/5" />
              <Skeleton className="mt-2 h-3 w-1/4" />
            </div>
            <Skeleton className="h-5 w-14 shrink-0" />
          </div>
          <Skeleton className="mt-2 h-2 w-full" rounded="rounded-full" />
          <div className="mt-2 flex items-center justify-between gap-2">
            <Skeleton className="h-2.5 w-24" />
            <Skeleton className="h-2.5 w-28" />
          </div>
        </div>
      </div>
    </div>
  )
}

function ChartCardSkeleton({ children }: { children?: React.ReactNode }) {
  return (
    <Card>
      <div className="mb-6 flex items-center gap-3">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-4 w-40" />
      </div>
      {children ?? <Skeleton className="h-[260px] w-full sm:h-[300px]" rounded="rounded-xl" />}
    </Card>
  )
}

function BarRowsSkeleton() {
  return (
    <div>
      {['w-3/4', 'w-1/2', 'w-5/6'].map((width, index) => (
        <div
          key={index}
          className="grid h-11 grid-cols-[3.5rem_1fr] items-center gap-2 px-1 sm:grid-cols-[5.75rem_1fr]"
        >
          <Skeleton className="ml-auto h-3 w-3/4" />
          <Skeleton className={`h-6 ${width}`} rounded="rounded-r-lg" />
        </div>
      ))}
      <Skeleton className="ml-[4rem] mt-1 h-2.5 w-2/3 sm:ml-[6.5rem]" />
    </div>
  )
}

export function PerformanceSkeleton({ full = false }: { full?: boolean }) {
  return (
    <div className="space-y-5 sm:space-y-8" aria-busy="true" aria-label="Loading performance data">
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <ScoreCardSkeleton />
        <AttendanceCardSkeleton />
      </div>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Skeleton className="h-3.5 w-3.5" />
          <Skeleton className="h-2.5 w-24" />
        </div>
        <div className="space-y-3">
          <TargetRowSkeleton />
          <TargetRowSkeleton />
          <TargetRowSkeleton />
        </div>
      </section>

      <ChartCardSkeleton />

      {full && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
            <ChartCardSkeleton>
              <BarRowsSkeleton />
            </ChartCardSkeleton>
            <ChartCardSkeleton>
              <BarRowsSkeleton />
            </ChartCardSkeleton>
          </div>

          <Card padding="none">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-9 w-28" rounded="rounded-xl" />
              </div>
              <Skeleton className="h-7 w-7" rounded="rounded-md" />
            </div>
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center gap-4 px-4 py-5 sm:px-8">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-3 w-1/6" />
                  <Skeleton className="h-3 w-1/6" />
                  <Skeleton className="h-6 w-10" rounded="rounded-full" />
                  <Skeleton className="ml-auto h-4 w-8" />
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
