import { create } from 'zustand'
import { api } from '../services/database/api.service'
import type { IQueryResult, ITable } from '../interface/api.interface'

interface IAerisState {
  databases: string[]
  activeDb: string | null
  schema: ITable[]
  result: IQueryResult | null
  loading: boolean
  error: string | null
  refreshDatabases: () => Promise<void>
  attach: (name: string, inMemory: boolean) => Promise<void>
  detach: (name: string) => Promise<void>
  selectDb: (name: string) => Promise<void>
  runQuery: (sql: string) => Promise<void>
}

export const useAerisStore = create<IAerisState>((set, get) => ({
  databases: [],
  activeDb: null,
  schema: [],
  result: null,
  loading: false,
  error: null,

  refreshDatabases: async () => {
    const databases = await api.listDatabases()
    set({ databases })
  },

  attach: async (name, inMemory) => {
    set({ loading: true, error: null })
    try {
      await api.attach(name, inMemory)
      await get().refreshDatabases()
      await get().selectDb(name)
    } catch (e) {
      set({ error: (e as Error).message })
    } finally {
      set({ loading: false })
    }
  },

  detach: async (name) => {
    await api.detach(name)
    set((s) => ({
      databases: s.databases.filter((d) => d !== name),
      activeDb: s.activeDb === name ? null : s.activeDb,
      schema: s.activeDb === name ? [] : s.schema,
    }))
  },

  selectDb: async (name) => {
    set({ activeDb: name, error: null })
    const schema = await api.schema(name)
    set({ schema })
  },

  runQuery: async (sql) => {
    const { activeDb } = get()
    if (!activeDb) return
    set({ loading: true, error: null })
    try {
      const result = await api.query(activeDb, sql)
      set({ result })
      if (!/^\s*(select|pragma|explain|with)/i.test(sql)) {
        set({ schema: await api.schema(activeDb) })
      }
    } catch (e) {
      set({ error: (e as Error).message })
    } finally {
      set({ loading: false })
    }
  },
}))
