import { describe, expect, it } from 'vitest'
import { buildAddColumnDDL, buildDDL, validateIdent, validateSpec, type ITableSpec } from './ddl-builder.util'

const base: ITableSpec = {
  name: 'users',
  columns: [
    { name: 'id', type: 'integer', notNull: false, primaryKey: true, unique: false, defaultValue: null },
    { name: 'email', type: 'TEXT', notNull: true, primaryKey: false, unique: true, defaultValue: null },
  ],
}

describe('validateIdent', () => {
  it('accepts valid', () => expect(validateIdent('my_table_1')).toBeNull())
  it('rejects empty', () => expect(validateIdent('')).toBe('ERR_TABLE_NAME_INVALID'))
  it('rejects leading digit', () => expect(validateIdent('9x')).toBe('ERR_TABLE_NAME_INVALID'))
  it('rejects space', () => expect(validateIdent('a b')).toBe('ERR_TABLE_NAME_INVALID'))
  it('rejects 64 chars', () => expect(validateIdent('x'.repeat(64))).toBe('ERR_TABLE_NAME_INVALID'))
  it('accepts 63 chars', () => expect(validateIdent('x'.repeat(63))).toBeNull())
  it('rejects reserved sqlite_', () => expect(validateIdent('sqlite_x')).toBe('ERR_TABLE_NAME_RESERVED'))
  it('rejects reserved _system_ case-insensitive', () => expect(validateIdent('_System_foo')).toBe('ERR_TABLE_NAME_RESERVED'))
})

describe('validateSpec', () => {
  it('accepts base', () => expect(validateSpec(base)).toBeNull())
  it('rejects no columns', () => expect(validateSpec({ ...base, columns: [] })).toBe('ERR_TABLE_COLUMNS_EMPTY'))
  it('rejects dup column case-insensitive', () => {
    expect(validateSpec({ ...base, columns: [...base.columns, { ...base.columns[0], name: 'ID', primaryKey: false }] })).toBe('ERR_DUPLICATE_COLUMN')
  })
  it('rejects bad type', () => {
    expect(validateSpec({ ...base, columns: [{ ...base.columns[0], type: 'VARCHAR' }] })).toBe('ERR_TYPE_UNSUPPORTED')
  })
  it('rejects 2 PKs', () => {
    expect(validateSpec({ ...base, columns: [base.columns[0], { ...base.columns[1], name: 'email2', primaryKey: true }] })).toBe('ERR_PK_MULTIPLE')
  })
})

describe('buildDDL', () => {
  it('builds full DDL', () => {
    const ddl = buildDDL(base)
    expect(ddl).toContain('CREATE TABLE "users"')
    expect(ddl).toContain('"id" INTEGER PRIMARY KEY')
    expect(ddl).toContain('"email" TEXT NOT NULL UNIQUE')
  })
  it('includes DEFAULT when set', () => {
    const ddl = buildDDL({ ...base, columns: [{ ...base.columns[0], defaultValue: '0', primaryKey: false, notNull: true }] })
    expect(ddl).toContain('DEFAULT 0')
  })
})

describe('buildAddColumnDDL', () => {
  it('builds ALTER ADD COLUMN', () => {
    expect(buildAddColumnDDL('t', { name: 'age', type: 'integer', notNull: false, primaryKey: false, unique: false, defaultValue: null }))
      .toBe('ALTER TABLE "t" ADD COLUMN "age" INTEGER')
  })
})
