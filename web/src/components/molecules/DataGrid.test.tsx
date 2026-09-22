import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { IQueryResult } from '../../interface/api.interface'
import { DataGrid } from './DataGrid'

const result: IQueryResult = {
  columns: ['id', 'name'],
  rows: [
    [3, 'charlie'],
    [1, 'alice'],
    [2, null],
  ],
  rowsAffected: 0,
  durationMs: 1.5,
}

describe('DataGrid', () => {
  it('renders columns and rows', () => {
    render(<DataGrid result={result} />)
    expect(screen.getAllByText('id').length).toBeGreaterThan(0)
    expect(screen.getByText('alice')).toBeTruthy()
    expect(screen.getByText('null')).toBeTruthy()
    expect(screen.getByText(/3 row\(s\)/)).toBeTruthy()
  })

  it('shows affected rows for non-select results', () => {
    const write: IQueryResult = { columns: [], rows: [], rowsAffected: 3, durationMs: 0.4 }
    render(<DataGrid result={write} />)
    expect(screen.getByText(/3 row\(s\) affected/)).toBeTruthy()
  })

  it('click header sorts asc then desc', () => {
    render(<DataGrid result={result} />)
    const idHeader = screen.getByRole('columnheader', { name: /id/ })
    const firstCell = () => screen.getAllByRole('row')[1].querySelector('td')!.textContent

    expect(firstCell()).toBe('3')
    fireEvent.click(idHeader)
    expect(firstCell()).toBe('1')
    fireEvent.click(idHeader)
    expect(firstCell()).toBe('3')
  })

  it('filters rows via FilterBar', () => {
    render(<DataGrid result={result} />)
    fireEvent.change(screen.getByLabelText('Filter column'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Filter value'), { target: { value: 'ali' } })
    fireEvent.click(screen.getByText('Apply'))
    expect(screen.queryByText('charlie')).toBeNull()
    expect(screen.getByText('alice')).toBeTruthy()
    expect(screen.getByText(/1 row\(s\) of 3/)).toBeTruthy()
  })

  it('text view renders raw rows', () => {
    const { container } = render(<DataGrid result={result} />)
    fireEvent.click(screen.getByText('Text'))
    expect(container.querySelector('pre')!.textContent).toContain('3\tcharlie')
  })

  it('shows empty state when filter matches nothing', () => {
    render(<DataGrid result={result} />)
    fireEvent.change(screen.getByLabelText('Filter value'), { target: { value: 'zzz' } })
    fireEvent.click(screen.getByText('Apply'))
    expect(screen.getByText('No rows match the filter')).toBeTruthy()
  })
})
