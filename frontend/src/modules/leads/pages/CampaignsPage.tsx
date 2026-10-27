import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Megaphone, Plug, RefreshCw, Trophy, Unplug, Users } from 'lucide-react'

import { formatDate, formatDateTime } from '@shared/lib/date'
import { formatPercent } from '@shared/lib/format'
import { endpoints, http, unwrap } from '@shared/lib/http'
import { queryKeys } from '@shared/lib/queryKeys'
import { toast } from '@shared/lib/toast'
import { Button } from '@shared/ui/Button'
import { StatTile } from '@shared/ui/StatTile'
import { Table, type Column } from '@shared/ui/Table'

type Campaign = {
  id: string
  name: string
  platform: string
  stopped: boolean
  startedOn: string
  leads: number
  open: number
  won: number
  lost: number
}

type CampaignsResponse = {
  ok: boolean
  error?: string
  campaigns: Campaign[]
  meta: { configured: boolean; connected: boolean; syncedAt: string | null; error: string | null }
}

type WriteInput = { action: 'stop' | 'start'; id: string } | { action: 'connect'; on: boolean } | { action: 'sync' }

const conversion = (campaign: Campaign) => (campaign.leads ? formatPercent((campaign.won / campaign.leads) * 100) : 'N/A')

export function CampaignsPage() {
  const queryClient = useQueryClient()
  const list = useQuery({
    queryKey: queryKeys.campaigns,
    queryFn: async ({ signal }) => unwrap(await http.post<CampaignsResponse>(endpoints.campaigns, {}, signal))
  })
  const write = useMutation({
    mutationFn: async (input: WriteInput) =>
      unwrap(await http.post<{ ok: boolean; error?: string; added?: number }>(endpoints.campaignWrite, input)),
    onError: (error) => toast((error as Error).message, 'error'),
    onSuccess: (result, input) => {
      if (input.action === 'sync') toast(`Meta sync added ${result.added ?? 0} leads`)
      void queryClient.invalidateQueries({ queryKey: queryKeys.campaigns })
      void queryClient.invalidateQueries({ queryKey: queryKeys.leads.all })
    }
  })

  const campaigns = list.data?.campaigns ?? []
  const meta = list.data?.meta
  const loading = list.isPending
  const best = campaigns.filter((c) => c.leads >= 5).sort((a, b) => b.won / b.leads - a.won / a.leads)[0]

  const columns: Column<Campaign>[] = [
    {
      key: 'name',
      header: 'Campaign',
      cell: (c) => (
        <div className="min-w-0">
          <p className="font-semibold text-ink">{c.name}</p>
          <p className="text-xs text-slate-500">
            {c.platform} · since {formatDate(c.startedOn)}
          </p>
        </div>
      )
    },
    { key: 'leads', header: 'Leads', className: 'tabular-nums', cell: (c) => c.leads },
    { key: 'open', header: 'Working', className: 'tabular-nums', cell: (c) => c.open },
    { key: 'won', header: 'Booked', className: 'tabular-nums', cell: (c) => c.won },
    { key: 'lost', header: 'Lost', className: 'tabular-nums', cell: (c) => c.lost },
    { key: 'rate', header: 'Conversion', className: 'tabular-nums', cell: conversion },
    {
      key: 'state',
      header: '',
      cell: (c) => (
        <Button
          size="sm"
          variant={c.stopped ? 'secondary' : 'ghostDanger'}
          disabled={write.isPending}
          onClick={() => write.mutate({ action: c.stopped ? 'start' : 'stop', id: c.id })}
        >
          {c.stopped ? 'Resume' : 'Pause'}
        </Button>
      )
    }
  ]

  return (
    <div className="space-y-5 sm:space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">Campaigns</h1>
      </header>

      <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">Meta Lead Ads</p>
          <p className="text-xs text-slate-500">Facebook and Instagram lead forms, pulled every 15 minutes</p>
          {meta?.error ? (
            <p className="mt-1 text-xs font-semibold text-red-600">{meta.error}</p>
          ) : (
            <p className="mt-1 text-xs text-slate-500">
              {!meta?.configured
                ? 'Set META_PAGE_TOKEN on the API to connect.'
                : meta.connected
                  ? `Connected · last sync ${meta.syncedAt ? formatDateTime(meta.syncedAt) : 'not yet'}`
                  : 'Not connected'}
            </p>
          )}
        </div>
        {meta?.connected && (
          <Button size="sm" variant="secondary" disabled={write.isPending} onClick={() => write.mutate({ action: 'sync' })}>
            <RefreshCw className="h-4 w-4" />
            Sync now
          </Button>
        )}
        <Button
          size="sm"
          variant={meta?.connected ? 'ghostDanger' : 'primary'}
          disabled={!meta?.configured || write.isPending}
          onClick={() => write.mutate({ action: 'connect', on: !meta?.connected })}
        >
          {meta?.connected ? <Unplug className="h-4 w-4" /> : <Plug className="h-4 w-4" />}
          {meta?.connected ? 'Disconnect' : 'Connect'}
        </Button>
      </section>

      {list.isError && <p className="text-sm text-red-600">{list.error.message}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
        <StatTile
          label="Leads from campaigns"
          value={campaigns.reduce((sum, c) => sum + c.leads, 0)}
          loading={loading}
          tone="indigo"
          icon={Users}
        />
        <StatTile
          label="Active campaigns"
          value={campaigns.filter((c) => !c.stopped).length}
          loading={loading}
          tone="emerald"
          icon={Megaphone}
        />
        <StatTile
          label="Best conversion %"
          value={best ? Math.round((best.won / best.leads) * 100) : undefined}
          hint={best?.name}
          loading={loading}
          tone="amber"
          icon={Trophy}
        />
      </div>

      <Table columns={columns} rows={campaigns} rowKey={(c) => c.id} isLoading={loading} emptyMessage="No campaigns yet." />
    </div>
  )
}
