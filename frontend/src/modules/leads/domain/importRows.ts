export type ImportRow = { name: string; phone: string; source: string; project: string }

const text = (value: unknown) => (value === null || value === undefined ? '' : String(value).trim())

const COLUMNS: Record<keyof ImportRow, RegExp> = {
  phone: /phone|mobile|contact|number|whatsapp/i,
  name: /name/i,
  source: /source|campaign/i,
  project: /project|property/i
}

const isPhoneHeader = (cell: unknown) => COLUMNS.phone.test(text(cell)) && !COLUMNS.name.test(text(cell))

export const hasPhoneColumn = (sheet: unknown[][]) =>
  sheet.slice(0, 10).some((row) => row.some(isPhoneHeader))

export function readRows(sheet: unknown[][]): ImportRow[] {
  const at = sheet.slice(0, 10).findIndex((row) => row.some(isPhoneHeader))
  if (at < 0) throw new Error('No phone column found. Name the column "Phone" or "Mobile".')

  const header = sheet[at]!.map(text)
  const phone = header.findIndex(isPhoneHeader)
  const exactName = header.findIndex((cell) => /^(full\s*)?name$/i.test(cell))
  const index: Record<keyof ImportRow, number> = {
    phone,
    name: exactName >= 0 ? exactName : header.findIndex((cell, i) => i !== phone && COLUMNS.name.test(cell)),
    source: header.findIndex((cell) => COLUMNS.source.test(cell)),
    project: header.findIndex((cell) => COLUMNS.project.test(cell))
  }
  const cell = (row: unknown[], key: keyof ImportRow) => (index[key] < 0 ? '' : text(row[index[key]]))

  return sheet
    .slice(at + 1)
    .map((row) => ({ name: cell(row, 'name'), phone: cell(row, 'phone'), source: cell(row, 'source'), project: cell(row, 'project') }))
    .filter((row) => row.phone.replace(/\D/g, '').length >= 6)
}
