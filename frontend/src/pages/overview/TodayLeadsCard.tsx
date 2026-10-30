import { ArrowRight, Shuffle, Timer, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useShareLeads } from '@hooks/useLeadMutations'
import { useLeads } from '@hooks/useLeads'
import { useTeamSplit } from '@hooks/useTeamSplit'
import { TeamSplitPicker } from '@pages/leads/TeamSplit'
import { formatDate, todayKey } from '@shared/lib/date'
import { pluralize } from '@shared/lib/format'
import { Button } from '@shared/ui/Button'
import { Modal } from '@shared/ui/Modal'
import { Skeleton } from '@shared/ui/Skeleton'

const CARD =
  'rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-4 text-white shadow-lg shadow-brand-900/20 sm:p-6'

const pad = (n: number) => String(n).padStart(2, '0')

const SYNC_EVERY = 60 * 60_000

function SyncTimer({ syncedAt }: { syncedAt: string | null }) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])
  if (!syncedAt) return null
  const left = Math.max(0, Math.floor((Date.parse(syncedAt) + SYNC_EVERY - now) / 1000))

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white">
      <Timer className="h-3.5 w-3.5" />
      {left > 0 ? (
        <>
          New leads in <span className="tabular-nums">{pad(Math.floor(left / 60))}:{pad(left % 60)}</span>
        </>
      ) : (
        'Fetching new leads…'
      )}
    </span>
  )
}

function CardTitle({ syncedAt }: { syncedAt: string | null }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <h2 className="text-lg font-bold text-white">
        Today&apos;s leads <span className="font-semibold text-white/70">· {formatDate(new Date())}</span>
      </h2>
      <SyncTimer syncedAt={syncedAt} />
    </div>
  )
}

const isToday = (iso: string | null, today: string) => iso !== null && todayKey(new Date(iso)) === today

export function MyTodayLeadsCard() {
  const leads = useLeads('all')
  const today = todayKey()

  const mine = leads.leads.filter(
    (lead) =>
      lead.view === 'mine' &&
      (isToday(lead.createdAt, today) || lead.history.some((entry) => isToday(entry.at, today)))
  )
  const open = leads.leads.filter((lead) => lead.view === 'unassigned' && isToday(lead.createdAt, today))

  return (
    <section className={CARD}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <CardTitle syncedAt={leads.syncedAt} />
          {leads.isPending ? (
            <Skeleton className="mt-2 h-10 w-40 bg-white/20" />
          ) : (
            <p className="mt-1 text-sm text-white/80">
              <span className="text-4xl font-bold text-white">{mine.length}</span>
              <span className="ml-2">
                assigned to you today
                {open.length > 0 && (
                  <>
                    {' · '}
                    <span className="rounded-full bg-white/15 px-2 py-0.5 font-semibold text-white">
                      {open.length} new to pick up
                    </span>
                  </>
                )}
              </span>
            </p>
          )}
        </div>
        <Link
          to="/leads?view=mine"
          className="inline-flex items-center gap-2 rounded-xl !bg-white px-4 py-2 text-sm font-semibold !text-brand-700 transition-colors hover:!bg-brand-50"
        >
          Open my leads
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  )
}

export function TodayLeadsCard() {
  const leads = useLeads('all')
  const sharing = useShareLeads()
  const [open, setOpen] = useState(false)
  const busy = sharing.isPending

  const today = todayKey()
  const todays = useMemo(
    () => leads.leads.filter((lead) => lead.createdAt && todayKey(new Date(lead.createdAt)) === today),
    [leads.leads, today]
  )
  const waiting = todays.filter((lead) => lead.view === 'unassigned')
  const team = leads.roster
  const split = useTeamSplit(waiting.map((lead) => lead.id))
  const plan = split.plan

  const close = () => {
    setOpen(false)
    split.pick([])
  }

  const distribute = () => sharing.mutate(plan, { onSuccess: close })

  return (
    <section className={CARD}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <CardTitle syncedAt={leads.syncedAt} />
          {leads.isPending ? (
            <Skeleton className="mt-2 h-10 w-40 bg-white/20" />
          ) : (
            <p className="mt-1 text-sm text-white/80">
              <span className="text-4xl font-bold text-white">{todays.length}</span>
              <span className="ml-2">
                came in today · <span className="rounded-full bg-white/15 px-2 py-0.5 font-semibold text-white">{waiting.length} unassigned</span>
              </span>
            </p>
          )}
        </div>
        <Button
          onClick={() => setOpen(true)}
          disabled={leads.isPending || waiting.length === 0}
          className="!bg-white !text-brand-700 hover:!bg-brand-50"
        >
          <Users className="h-4 w-4" />
          Select team
        </Button>
      </div>
      {waiting.length === 0 && !leads.isPending && (
        <p className="mt-3 text-sm text-white/75">
          {todays.length === 0 ? 'No leads have come in today.' : 'Every lead from today is already assigned.'}
        </p>
      )}

      {open && (
        <Modal
          open
          onClose={close}
          title={`Share ${pluralize(waiting.length, 'lead')}`}
          footer={
            <>
              <Button variant="secondary" onClick={close} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={distribute} disabled={busy || plan.length === 0 || split.over > 0}>
                <Shuffle className="h-4 w-4" />
                {busy ? 'Distributing…' : 'Distribute'}
              </Button>
            </>
          }
        >
          <TeamSplitPicker
            split={split}
            team={team}
            heading="Pick who gets today's leads"
            noun="waiting"
            rest="stay unassigned"
            busy={busy}
          />
        </Modal>
      )}
    </section>
  )
}
