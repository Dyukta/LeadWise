import type { Lead } from '@logic/leads/leadTypes'
import { statusLabel } from '@logic/rules/statuses'
import { assigneeNames } from '@logic/rules/transfer'
import { formatDateTime, todayKey } from '@shared/lib/date'

export const campaignOf = (lead: Lead) => lead.campaign ?? lead.sourceName ?? 'No campaign'

const columns: [string, number, (lead: Lead) => string | null][] = [
  ['Name', 26, (lead) => lead.name],
  ['Phone', 18, (lead) => lead.phone],
  ['Source', 18, (lead) => lead.source],
  ['Status', 30, (lead) => statusLabel(lead.status)],
  ['Notes', 50, (lead) => lead.notes],
  ['Next follow up', 20, (lead) => (lead.nextFollowUpAt ? formatDateTime(lead.nextFollowUpAt) : null)],
  ['Assigned to', 26, (lead) => (lead.assignees.length === 0 ? 'Unassigned' : assigneeNames(lead.assignees))]
]

export async function downloadLeads(leads: Lead[], fileName = `leads-${todayKey()}`) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const header = columns.map(([title]) => ({
    value: title,
    fontWeight: 'bold' as const,
    textColor: '#FFFFFF',
    backgroundColor: '#0B3D2E',
    borderColor: '#06271D',
    borderStyle: 'thin' as const,
    align: 'left' as const,
    alignVertical: 'center' as const,
    height: 22
  }))
  const body = leads.map((lead) => columns.map(([, , pick]) => ({ value: pick(lead) ?? undefined, align: 'left' as const })))
  await writeXlsxFile([header, ...body], {
    columns: columns.map(([, width]) => ({ width })),
    stickyRowsCount: 1
  }).toFile(`${fileName}.xlsx`)
}

export const downloadTemplate = () => downloadLeads([], 'leads-template')
