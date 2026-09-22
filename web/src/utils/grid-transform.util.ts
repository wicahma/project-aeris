export type ESortDirection = 'asc' | 'desc'

export interface ISortRule {
  column: number
  direction: ESortDirection
}

export type EFilterOperator = 'contains' | 'eq' | 'gt' | 'lt' | 'is_null'

export interface IFilterRule {
  column: number
  operator: EFilterOperator
  value: string
}

function compareCell(a: unknown, b: unknown): number {
  if (a === null || a === undefined) return 1
  if (b === null || b === undefined) return -1
  const na = Number(a)
  const nb = Number(b)
  if (!Number.isNaN(na) && !Number.isNaN(nb) && a !== '' && b !== '') return na - nb
  return String(a).localeCompare(String(b))
}

export function applySort<T extends unknown[]>(rows: T[], rules: ISortRule[]): T[] {
  if (rules.length === 0) return rows
  return [...rows].sort((ra, rb) => {
    for (const rule of rules) {
      const cmp = compareCell(ra[rule.column], rb[rule.column])
      if (cmp !== 0) return rule.direction === 'asc' ? cmp : -cmp
    }
    return 0
  })
}

export function applyFilters<T extends unknown[]>(rows: T[], rules: IFilterRule[]): T[] {
  const active = rules.filter((r) => r.operator === 'is_null' || r.value !== '')
  if (active.length === 0) return rows
  return rows.filter((row) =>
    active.every((rule) => {
      const cell = row[rule.column]
      switch (rule.operator) {
        case 'is_null':
          return cell === null || cell === undefined
        case 'eq':
          return String(cell) === rule.value
        case 'gt':
          return compareCell(cell, rule.value) > 0
        case 'lt':
          return compareCell(cell, rule.value) < 0
        default:
          return String(cell ?? '').toLowerCase().includes(rule.value.toLowerCase())
      }
    }),
  )
}

export function cycleSort(rules: ISortRule[], column: number, additive: boolean): ISortRule[] {
  const existing = rules.find((r) => r.column === column)
  const next: ESortDirection | null = !existing ? 'asc' : existing.direction === 'asc' ? 'desc' : null
  const rest = additive ? rules.filter((r) => r.column !== column) : []
  return next ? [...rest, { column, direction: next }] : rest
}
