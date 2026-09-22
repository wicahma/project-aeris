export interface IColumnSpec {
  name: string
  type: string
  notNull: boolean
  primaryKey: boolean
  unique: boolean
  defaultValue: string | null
  referencesTable?: string
  referencesColumn?: string
  onDelete?: string
}

export interface ITableSpec {
  name: string
  columns: IColumnSpec[]
}

const AFFINITIES = ['INTEGER', 'TEXT', 'REAL', 'BLOB'] as const
const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/

export function validateIdent(name: string): string | null {
  if (!IDENT_RE.test(name)) return 'ERR_TABLE_NAME_INVALID'
  const lower = name.toLowerCase()
  if (lower.startsWith('_system_') || lower.startsWith('sqlite_')) return 'ERR_TABLE_NAME_RESERVED'
  return null
}

export function validateSpec(spec: ITableSpec): string | null {
  if (validateIdent(spec.name)) return validateIdent(spec.name)
  if (spec.columns.length === 0) return 'ERR_TABLE_COLUMNS_EMPTY'
  const seen = new Set<string>()
  let pkCount = 0
  for (const c of spec.columns) {
    if (!IDENT_RE.test(c.name)) return 'ERR_COLUMN_NAME_INVALID'
    if (seen.has(c.name.toLowerCase())) return 'ERR_DUPLICATE_COLUMN'
    seen.add(c.name.toLowerCase())
    if (!AFFINITIES.includes(c.type.toUpperCase() as (typeof AFFINITIES)[number])) return 'ERR_TYPE_UNSUPPORTED'
    if (c.primaryKey) pkCount++
  }
  if (pkCount > 1) return 'ERR_PK_MULTIPLE'
  return null
}

function columnSql(c: IColumnSpec): string {
  const parts = [`"${c.name}"`, c.type.toUpperCase()]
  if (c.primaryKey) parts.push('PRIMARY KEY')
  else if (c.notNull) parts.push('NOT NULL')
  if (c.unique) parts.push('UNIQUE')
  if (c.defaultValue) parts.push(`DEFAULT ${c.defaultValue}`)
  if (c.referencesTable && c.referencesColumn) {
    parts.push(`REFERENCES "${c.referencesTable}"("${c.referencesColumn}")`)
    if (c.onDelete) parts.push(`ON DELETE ${c.onDelete}`)
  }
  return parts.join(' ')
}

export function buildDDL(spec: ITableSpec): string {
  return `CREATE TABLE "${spec.name}" (${spec.columns.map(columnSql).join(', ')})`
}

export function buildAddColumnDDL(table: string, col: IColumnSpec): string {
  return `ALTER TABLE "${table}" ADD COLUMN ${columnSql(col)}`
}
