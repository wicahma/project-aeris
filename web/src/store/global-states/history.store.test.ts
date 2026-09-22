import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useHistoryStore } from './history.store'
import { api } from '../../services/database/api.service'
import type { IHistoryEntry, ISavedQuery } from '../../interface/api.interface'

vi.mock('../../services/database/api.service', () => ({
  api: {
    history: vi.fn(),
    listSaved: vi.fn(),
    saveQuery: vi.fn(),
    deleteSaved: vi.fn(),
  },
}))

const mockHistory = api.history as ReturnType<typeof vi.fn>
const mockListSaved = api.listSaved as ReturnType<typeof vi.fn>
const mockSaveQuery = api.saveQuery as ReturnType<typeof vi.fn>
const mockDeleteSaved = api.deleteSaved as ReturnType<typeof vi.fn>

const entry: IHistoryEntry = {
  queryId: 'q1', snippet: 'SELECT 1', queryText: 'SELECT 1', statementType: 'SELECT',
  status: 'SUCCESS', durationMs: 1, rowsAffected: 0, rowsReturned: 1,
  errorMessage: '', executedAt: 1, pinned: false,
}

const saved: ISavedQuery = {
  id: 's1', title: 'T', category: 'General', queryText: 'SELECT 1', createdAt: 1, updatedAt: 1,
}

describe('history.store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useHistoryStore.setState({ entries: [], saved: [], filters: { limit: 50 }, loading: false, error: null })
  })

  it('loads history with filters', async () => {
    mockHistory.mockResolvedValue([entry])
    await useHistoryStore.getState().setFilters('app', { status: 'FAILED', limit: 50 })
    expect(mockHistory).toHaveBeenCalledWith('app', { status: 'FAILED', limit: 50 })
    expect(useHistoryStore.getState().entries).toEqual([entry])
  })

  it('sets error on failure', async () => {
    mockHistory.mockRejectedValue(new Error('boom'))
    await useHistoryStore.getState().load('app')
    expect(useHistoryStore.getState().error).toBe('boom')
    expect(useHistoryStore.getState().loading).toBe(false)
  })

  it('saves then refreshes saved list', async () => {
    mockSaveQuery.mockResolvedValue(saved)
    mockListSaved.mockResolvedValue([saved])
    await useHistoryStore.getState().saveCurrent('app', 'T', 'General', 'SELECT 1')
    expect(mockSaveQuery).toHaveBeenCalledWith('app', 'T', 'General', 'SELECT 1')
    expect(useHistoryStore.getState().saved).toEqual([saved])
  })

  it('propagates duplicate error to caller', async () => {
    mockSaveQuery.mockRejectedValue(new Error('ERR_SAVED_QUERY_DUPLICATE'))
    await expect(
      useHistoryStore.getState().saveCurrent('app', 'T', '', 'SELECT 1'),
    ).rejects.toThrow('ERR_SAVED_QUERY_DUPLICATE')
    expect(useHistoryStore.getState().error).toContain('ERR_SAVED_QUERY_DUPLICATE')
  })

  it('deletes then refreshes', async () => {
    mockDeleteSaved.mockResolvedValue(undefined)
    mockListSaved.mockResolvedValue([])
    await useHistoryStore.getState().removeSaved('app', 's1')
    expect(mockDeleteSaved).toHaveBeenCalledWith('app', 's1')
    expect(useHistoryStore.getState().saved).toEqual([])
  })
})
