import { describe, expect, it } from 'vitest'
import { addEdit, applyEdits, emptyPending, pendingCount, toBatchOps } from './data-pending.util'

describe('data-pending.util', () => {
  it('addEdit dedupes by rowId+column', () => {
    let p = emptyPending()
    p = addEdit(p, { rowId: 1, column: 'a', value: 'x' })
    p = addEdit(p, { rowId: 1, column: 'a', value: 'y' })
    expect(p.edits).toHaveLength(1)
    expect(p.edits[0].value).toBe('y')
  })

  it('toBatchOps merges edits per row', () => {
    let p = emptyPending()
    p = addEdit(p, { rowId: 1, column: 'a', value: 'x' })
    p = addEdit(p, { rowId: 1, column: 'b', value: 'y' })
    p = addEdit(p, { rowId: 2, column: 'a', value: 'z' })
    p.inserts.push({ a: 'new' })
    p.deletes.push(9)
    const ops = toBatchOps(p)
    expect(ops.filter((o) => o.op === 'update')).toHaveLength(2)
    expect(ops.filter((o) => o.op === 'insert')).toHaveLength(1)
    expect(ops.filter((o) => o.op === 'delete')).toHaveLength(1)
    const upd1 = ops.find((o) => o.op === 'update' && o.rowId === 1)
    expect(upd1?.values).toEqual({ a: 'x', b: 'y' })
  })

  it('applyEdits shows edited + inserted rows, hides deleted', () => {
    const rows = [[1, 'a'], [2, 'b'], [3, 'c']]
    const rowIds = [11, 12, 13]
    const cols = ['id', 'name']
    let p = emptyPending()
    p = addEdit(p, { rowId: 12, column: 'name', value: 'B!' })
    p.deletes.push(13)
    p.inserts.push({ id: 99, name: 'new' })
    const out = applyEdits(rows, rowIds, cols, p)
    expect(out).toHaveLength(3)
    expect(out[0]).toEqual([1, 'a'])
    expect(out[1]).toEqual([2, 'B!'])
    expect(out[2]).toEqual([99, 'new'])
  })

  it('pendingCount sums all', () => {
    const p = emptyPending()
    p.edits.push({ rowId: 1, column: 'a', value: 1 })
    p.inserts.push({})
    p.deletes.push(2)
    expect(pendingCount(p)).toBe(3)
  })
})
