import { create } from 'zustand'
import { api } from '../../services/database/api.service'
import type { IHistoryEntry, IHistoryFilters, ISavedQuery } from '../../interface/api.interface'

interface IHistoryState {
  entries: IHistoryEntry[]
  saved: ISavedQuery[]
  filters: IHistoryFilters
  loading: boolean
  error: string | null
  load: (db: string) => Promise<void>
  loadSaved: (db: string) => Promise<void>
  setFilters: (db: string, filters: IHistoryFilters) => Promise<void>
  saveCurrent: (db: string, title: string, category: string, queryText: string) => Promise<void>
  removeSaved: (db: string, id: string) => Promise<void>
  togglePin: (db: string, id: string, pinned: boolean) => Promise<void>
  prune: (db: string, maxAgeDays?: number) => Promise<number>
}

export const useHistoryStore = create<IHistoryState>((set, get) => ({
  entries: [],
  saved: [],
  filters: { limit: 50 },
  loading: false,
  error: null,

  load: async (db) => {
    set({ loading: true, error: null })
    try {
      const entries = await api.history(db, get().filters)
      set({ entries })
    } catch (e) {
      set({ error: (e as Error).message })
    } finally {
      set({ loading: false })
    }
  },

  loadSaved: async (db) => {
    try {
      const saved = await api.listSaved(db)
      set({ saved })
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },

  setFilters: async (db, filters) => {
    set({ filters })
    await get().load(db)
  },

  saveCurrent: async (db, title, category, queryText) => {
    set({ error: null })
    try {
      await api.saveQuery(db, title, category, queryText)
      await get().loadSaved(db)
    } catch (e) {
      set({ error: (e as Error).message })
      throw e
    }
  },

  removeSaved: async (db, id) => {
    try {
      await api.deleteSaved(db, id)
      await get().loadSaved(db)
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },

  togglePin: async (db, id, pinned) => {
    try {
      await api.pinHistory(db, id, pinned)
      await get().load(db)
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },

  prune: async (db, maxAgeDays) => {
    try {
      const res = await api.pruneHistory(db, maxAgeDays)
      await get().load(db)
      return res.deleted
    } catch (e) {
      set({ error: (e as Error).message })
      return 0
    }
  },
}))
