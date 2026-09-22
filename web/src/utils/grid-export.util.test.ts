import { describe, expect, it } from 'vitest'
import { exportRows, toDelimited, toJsonRows, toMarkdown } from './grid-export.util'

const cols = ['id', 'name', 'note']
const rows: unknown[][] = [
  [1, 'alice', 'plain'],
  [2, 'bob "b"', 'has,comma'],
  [3, null, 'multi\nline'],
]

describe('toDelimited (RFC 4180)', () => {
  it('quotes values containing delimiter, quote, or newline', () => {
    const csv = toDelimited(cols, rows, ',')
    expect(csv).toContain('"bob ""b"""')
    expect(csv).toContain('"has,comma"')
    expect(csv).toContain('"multi\nline"')
  })

  it('null becomes empty field', () => {
    const csv = toDelimited(cols, [[3, null, 'x']], ',')
    expect(csv.split('\n')[1]).toBe('3,,x')
  })

  it('header is included', () => {
    expect(toDelimited(cols, [], ',')).toBe('id,name,note')
  })

  it('tsv uses tab delimiter', () => {
    expect(toDelimited(cols, [[1, 'a', 'b']], '\t')).toBe('id\tname\tnote\n1\ta\tb')
  })
})

describe('toJsonRows', () => {
  it('maps row arrays to keyed objects', () => {
    const parsed = JSON.parse(toJsonRows(cols, rows))
    expect(parsed[0]).toEqual({ id: 1, name: 'alice', note: 'plain' })
    expect(parsed[2].name).toBeNull()
  })
})

describe('toMarkdown', () => {
  it('emits header, separator, and escaped pipes', () => {
    const md = toMarkdown(['a', 'b'], [['x|y', 1]])
    const lines = md.split('\n')
    expect(lines[0]).toBe('| a | b |')
    expect(lines[1]).toBe('| --- | --- |')
    expect(lines[2]).toBe('| x\\|y | 1 |')
  })
})

describe('exportRows dispatch', () => {
  it('returns each format', () => {
    expect(exportRows('csv', cols, rows)).toContain('id,name,note')
    expect(exportRows('tsv', cols, rows)).toContain('\t')
    expect(exportRows('json', cols, rows)).toContain('"alice"')
    expect(exportRows('markdown', cols, rows)).toContain('| --- |')
  })
})
