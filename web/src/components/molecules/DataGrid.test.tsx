import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { IQueryResult } from '../../interface/api.interface'
import { DataGrid } from './DataGrid'

const result: IQueryResult = {
  columns: ['id', 'name'],
  rows: [
    [1, 'alice'],
    [2, null],
  ],
  rowsAffected: 0,
  durationMs: 1.5,
}

describe('DataGrid', () => {
  it('renders columns and rows', () => {
    render(<DataGrid result={result} />)
    expect(screen.getByText('id')).toBeTruthy()
    expect(screen.getByText('name')).toBeTruthy()
    expect(screen.getByText('alice')).toBeTruthy()
    expect(screen.getByText('NULL')).toBeTruthy()
    expect(screen.getByText(/2 row\(s\) in 1\.5ms/)).toBeTruthy()
  })

  it('shows affected rows for non-select results', () => {
    const write: IQueryResult = { columns: [], rows: [], rowsAffected: 3, durationMs: 0.4 }
    render(<DataGrid result={write} />)
    expect(screen.getByText(/3 row\(s\) affected/)).toBeTruthy()
  })
})
