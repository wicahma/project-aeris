import { describe, expect, it } from 'vitest'
import { formatSql } from './sql-format.util'

describe('formatSql', () => {
  it('uppercases keywords and breaks clauses', () => {
    const out = formatSql("select id, name from users where status = 'active' order by id")
    expect(out).toContain('SELECT')
    expect(out).toContain('FROM users')
    expect(out).toContain("WHERE status = 'active'")
    expect(out).toContain('ORDER BY id')
    expect(out.indexOf('SELECT')).toBeLessThan(out.indexOf('FROM'))
  })

  it('respects lower keyword case', () => {
    expect(formatSql('SELECT * FROM t', 2, 'lower')).toContain('select')
    expect(formatSql('SELECT * FROM t', 2, 'lower')).toContain('from t')
  })

  it('handles two-word clauses', () => {
    const out = formatSql('select * from a left join b on a.id = b.id')
    expect(out).toContain('LEFT JOIN b')
    expect(out).toContain('ON a.id = b.id')
  })

  it('indents parenthesised subqueries', () => {
    const out = formatSql('select * from (select id from t) x')
    expect(out).toContain('(\n')
    expect(out).toContain('SELECT id')
    expect(out).toContain('\n)')
  })

  it('does not touch keywords inside strings', () => {
    const out = formatSql("select 'from where' as x from t")
    expect(out).toContain("'from where'")
  })

  it('empty input yields empty output', () => {
    expect(formatSql('')).toBe('')
    expect(formatSql('   ')).toBe('')
  })
})
