export type EExportFormat = 'csv' | 'tsv' | 'json' | 'markdown'

function escapeDelimited(value: unknown, delimiter: string): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (s.includes(delimiter) || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function toDelimited(columns: string[], rows: unknown[][], delimiter: string): string {
  const head = columns.map((c) => escapeDelimited(c, delimiter)).join(delimiter)
  const body = rows.map((r) => r.map((c) => escapeDelimited(c, delimiter)).join(delimiter))
  return [head, ...body].join('\n')
}

export function toJsonRows(columns: string[], rows: unknown[][]): string {
  const objects = rows.map((r) => Object.fromEntries(columns.map((c, i) => [c, r[i]])))
  return JSON.stringify(objects, null, 2)
}

export function toMarkdown(columns: string[], rows: unknown[][]): string {
  const cell = (v: unknown) => (v === null || v === undefined ? '' : String(v).replace(/\|/g, '\\|'))
  const head = `| ${columns.map(cell).join(' | ')} |`
  const sep = `| ${columns.map(() => '---').join(' | ')} |`
  const body = rows.map((r) => `| ${r.map(cell).join(' | ')} |`)
  return [head, sep, ...body].join('\n')
}

export function exportRows(format: EExportFormat, columns: string[], rows: unknown[][]): string {
  switch (format) {
    case 'csv':
      return toDelimited(columns, rows, ',')
    case 'tsv':
      return toDelimited(columns, rows, '\t')
    case 'json':
      return toJsonRows(columns, rows)
    case 'markdown':
      return toMarkdown(columns, rows)
  }
}

export function downloadText(filename: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
