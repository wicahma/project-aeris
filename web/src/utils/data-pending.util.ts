export type EDataOp = 'insert' | 'update' | 'delete'

export interface IBatchOp {
  op: EDataOp
  rowId?: number
  values?: Record<string, unknown>
}

export interface ITableDataResponse {
  columns: { name: string; type: string; nullable: boolean; primaryKey: boolean }[]
  rows: unknown[][]
  rowIds: number[]
  totalRows: number
  page: number
  pageSize: number
}

export interface ICellEdit {
  rowId: number
  column: string
  value: unknown
}

export interface IPendingState {
  edits: ICellEdit[]
  inserts: Record<string, unknown>[]
  deletes: number[]
}

export const emptyPending = (): IPendingState => ({ edits: [], inserts: [], deletes: [] })

export function pendingCount(p: IPendingState): number {
  return p.edits.length + p.inserts.length + p.deletes.length
}

export function addEdit(p: IPendingState, edit: ICellEdit): IPendingState {
  const others = p.edits.filter((e) => !(e.rowId === edit.rowId && e.column === edit.column))
  return { ...p, edits: [...others, edit] }
}

export function toBatchOps(p: IPendingState): IBatchOp[] {
  const byRow = new Map<number, Record<string, unknown>>()
  for (const e of p.edits) {
    const cur = byRow.get(e.rowId) ?? {}
    cur[e.column] = e.value
    byRow.set(e.rowId, cur)
  }
  const ops: IBatchOp[] = []
  for (const [rowId, values] of byRow) {
    ops.push({ op: 'update', rowId, values })
  }
  for (const values of p.inserts) {
    ops.push({ op: 'insert', values })
  }
  for (const rowId of p.deletes) {
    ops.push({ op: 'delete', rowId })
  }
  return ops
}

export function applyEdits(rows: unknown[][], rowIds: number[], columns: string[], p: IPendingState): unknown[][] {
  const colIdx = new Map(columns.map((c, i) => [c, i]))
  const rowIdx = new Map(rowIds.map((r, i) => [r, i]))
  const editMap = new Map<string, unknown>()
  for (const e of p.edits) editMap.set(`${e.rowId}|${e.column}`, e.value)
  const deleteSet = new Set(p.deletes)
  const out: unknown[][] = []
  for (let i = 0; i < rows.length; i++) {
    const rid = rowIds[i]
    if (deleteSet.has(rid)) continue
    const row = [...rows[i]]
    for (const [key, val] of editMap) {
      const [ridStr, col] = key.split('|')
      if (Number(ridStr) === rid) {
        const ci = colIdx.get(col)
        if (ci !== undefined) row[ci] = val
      }
    }
    out.push(row)
  }
  for (const ins of p.inserts) {
    const row: unknown[] = columns.map((c) => ins[c] ?? null)
    out.push(row)
  }
  return out
}
