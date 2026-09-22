import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ITable } from '../../interface/api.interface'
import { ObjectTree } from './ObjectTree'

const tables: ITable[] = [
  { name: 'users', type: 'table', columns: [] },
  { name: 'orders', type: 'table', columns: [] },
  { name: 'v_active', type: 'view', columns: [] },
]

describe('ObjectTree', () => {
  it('groups tables and views', () => {
    render(<ObjectTree tables={tables} onSelect={() => {}} />)
    expect(screen.getByText('Tables')).toBeTruthy()
    expect(screen.getByText('Views')).toBeTruthy()
    expect(screen.getByText('users')).toBeTruthy()
    expect(screen.getByText('v_active')).toBeTruthy()
  })

  it('emits onSelect with the clicked table', () => {
    const onSelect = vi.fn()
    render(<ObjectTree tables={tables} onSelect={onSelect} />)
    fireEvent.click(screen.getByText('orders'))
    expect(onSelect).toHaveBeenCalledWith(tables[1])
  })

  it('shows empty state', () => {
    render(<ObjectTree tables={[]} onSelect={() => {}} />)
    expect(screen.getByText('No objects')).toBeTruthy()
  })
})
