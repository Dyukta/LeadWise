import { FileSpreadsheet, Upload } from 'lucide-react'
import { useState } from 'react'

import { useImportLeads } from '@hooks/useLeadMutations'
import { hasPhoneColumn, leadRows, type ImportRow } from '@logic/leads/importRows'
import { pluralize } from '@shared/lib/format'
import { Button } from '@shared/ui/Button'

const MAX_BYTES = 5 * 1024 * 1024

export function UploadLeads() {
  const importing = useImportLeads()
  const [file, setFile] = useState<{ name: string; rows: ImportRow[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const busy = importing.isPending
  const noPhone = file ? file.rows.filter((row) => !row.phone).length : 0

  const pick = async (picked: File | undefined) => {
    setFile(null)
    setError(null)
    if (!picked) return
    if (!/\.xlsx$/i.test(picked.name)) return setError('Only Excel (.xlsx) files can be uploaded.')
    if (picked.size > MAX_BYTES) return setError('The file is larger than 5 MB.')
    const { default: readXlsxFile } = await import('read-excel-file/browser')
    const sheets = await readXlsxFile(picked).catch(() => null)
    if (!sheets) return setError('Could not read this file. Upload an Excel (.xlsx) file.')
    try {
      const rows = leadRows(sheets.find((sheet) => hasPhoneColumn(sheet.data))?.data ?? sheets[0].data)
      if (rows.length === 0) throw new Error('The file has no leads.')
      if (rows.length > 5000) throw new Error('Upload at most 5000 leads at a time.')
      setFile({ name: picked.name, rows })
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const upload = () => file && importing.mutate({ rows: file.rows, fileName: file.name }, { onSuccess: () => setFile(null) })

  return (
    <div className="space-y-5">
      <label className="relative flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-14 text-center text-sm transition-colors hover:border-brand-400 hover:bg-brand-50">
        <FileSpreadsheet className="h-10 w-10 text-brand-600" />
        <span className="text-base font-semibold text-ink">{file ? file.name : 'Choose an Excel file'}</span>
        <span className="text-xs text-slate-500">Excel (.xlsx) only · up to 5 MB · max 5000 leads</span>
        <input
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          disabled={busy}
          onChange={(event) => {
            void pick(event.target.files?.[0])
            event.target.value = ''
          }}
        />
      </label>
      {file && (
        <p className="text-sm text-slate-600">
          {pluralize(file.rows.length, 'lead')} found
          {noPhone > 0 && ` · ${noPhone} without a phone number will be skipped`}
        </p>
      )}
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <Button size="lg" className="w-full" onClick={upload} disabled={busy || !file}>
        <Upload className="h-4 w-4" />
        {busy ? 'Uploading…' : file ? `Upload ${pluralize(file.rows.length - noPhone, 'lead')}` : 'Upload'}
      </Button>
    </div>
  )
}
