import { describe, expect, it } from 'vitest'
import { applyFilters, applySort, cycleSort } from './grid-transform.util'

type Row = [number, string | null]
const rows: Row[] = [
  [3, 'charlie'],
  [1, 'alice'],
  [2, null],
  [10, 'bob'],
]

describe('applySort', () => {
  it('sorts numbers numerically, not lexicographically', () => {
    const out = applySort(rows, [{ column: 0, direction: 'asc' }])
    expect(out.map((r) => r[0])).toEqual([1, 2, 3, 10])
  })

  it('nulls last on asc, first on desc', () => {
    expect(applySort(rows, [{ column: 1, direction: 'asc' }]).at(-1)?.[1]).toBeNull()
    expect(applySort(rows, [{ column: 1, direction: 'desc' }])[0][1]).toBeNull()
  })

  it('multi-column: first rule is primary', () => {
    const dup: Row[] = [
      [1, 'b'],
      [1, 'a'],
      [0, 'z'],
    ]
    const out = applySort(dup, [
      { column: 0, direction: 'asc' },
      { column: 1, direction: 'asc' },
    ])
    expect(out).toEqual([
      [0, 'z'],
      [1, 'a'],
      [1, 'b'],
    ])
  })

  it('empty rules returns same order', () => {
    expect(applySort(rows, [])).toEqual(rows)
  })
})

describe('applyFilters', () => {
  it('contains is case-insensitive', () => {
    const out = applyFilters(rows, [{ column: 1, operator: 'contains', value: 'ALI' }])
    expect(out).toEqual([[1, 'alice']])
  })

  it('eq matches exactly', () => {
    expect(applyFilters(rows, [{ column: 1, operator: 'eq', value: 'bob' }])).toEqual([[10, 'bob']])
  })

  it('gt/lt compare numerically when possible', () => {
    expect(applyFilters(rows, [{ column: 0, operator: 'gt', value: '2' }]).length).toBe(2)
    expect(applyFilters(rows, [{ column: 0, operator: 'lt', value: '2' }])).toEqual([[1, 'alice']])
  })

  it('is_null finds nulls without a value', () => {
    expect(applyFilters(rows, [{ column: 1, operator: 'is_null', value: '' }])).toEqual([[2, null]])
  })

  it('empty value rules are ignored', () => {
    expect(applyFilters(rows, [{ column: 0, operator: 'contains', value: '' }])).toEqual(rows)
  })

  it('multiple rules AND together', () => {
    const out = applyFilters(rows, [
      { column: 0, operator: 'gt', value: '1' },
      { column: 1, operator: 'contains', value: 'o' },
    ])
    expect(out).toEqual([[10, 'bob']])
  })
})

describe('cycleSort', () => {
  it('cycles none -> asc -> desc -> none', () => {
    let rules = cycleSort([], 0, false)
    expect(rules).toEqual([{ column: 0, direction: 'asc' }])
    rules = cycleSort(rules, 0, false)
    expect(rules).toEqual([{ column: 0, direction: 'desc' }])
    rules = cycleSort(rules, 0, false)
    expect(rules).toEqual([])
  })

  it('additive mode keeps other columns', () => {
    const base = [{ column: 0, direction: 'asc' } as const]
    const out = cycleSort([...base], 1, true)
    expect(out).toEqual([
      { column: 0, direction: 'asc' },
      { column: 1, direction: 'asc' },
    ])
  })

  it('non-additive replaces other columns', () => {
    const base = [{ column: 0, direction: 'asc' } as const]
    const out = cycleSort([...base], 1, false)
    expect(out).toEqual([{ column: 1, direction: 'asc' }])
  })
})
