import { create } from 'zustand'
import { api } from '../../services/database/api.service'
import { addEdit, emptyPending, pendingCount, toBatchOps, type IPendingState, type ITableDataResponse } from '../../utils/data-pending.util'

interface IExplorerState {
  table: string | null
  data: ITableDataResponse | null
  pending: IPendingState
  page: number
  pageSize: number
  loading: boolean
  committing: boolean
  error: string | null
  openTable: (db: string, table: string) => Promise<void>
  close: () => void
  setPage: (db: string, page: number) => Promise<void>
  editCell: (rowId: number, column: string, value: unknown) => void
  addRow: () => void
  setInsertValue: (idx: number, column: string, value: unknown) => void
  removeInsert: (idx: number) => void
  deleteRow: (rowId: number) => void
  clearPending: () => void
  commit: (db: string) => Promise<void>
}

export const useExplorerStore = create<IExplorerState>((set, get) => ({
  table: null,
  data: null,
  pending: emptyPending(),
  page: 1,
  pageSize: 50,
  loading: false,
  committing: false,
  error: null,

  openTable: async (db, table) => {
    set({ table, page: 1, pending: emptyPending(), loading: true, error: null })
    try {
      const data = await api.browseTable(db, table, { page: 1, page_size: get().pageSize })
      set({ data, loading: false })
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  close: () => set({ table: null, data: null, pending: emptyPending(), error: null }),

  setPage: async (db, page) => {
    const { table, pageSize } = get()
    if (!table) return
    set({ loading: true, error: null })
    try {
      const data = await api.browseTable(db, table, { page, page_size: pageSize })
      set({ data, page: data.page, loading: false })
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  editCell: (rowId, column, value) => set((s) => ({ pending: addEdit(s.pending, { rowId, column, value }) })),

  addRow: () => set((s) => ({ pending: { ...s.pending, inserts: [...s.pending.inserts, {}] } })),

  setInsertValue: (idx, column, value) =>
    set((s) => ({
      pending: {
        ...s.pending,
        inserts: s.pending.inserts.map((r, i) => (i === idx ? { ...r, [column]: value } : r)),
      },
    })),

  removeInsert: (idx) =>
    set((s) => ({ pending: { ...s.pending, inserts: s.pending.inserts.filter((_, i) => i !== idx) } })),

  deleteRow: (rowId) =>
    set((s) => ({
      pending: {
        ...s.pending,
        deletes: s.pending.deletes.includes(rowId) ? s.pending.deletes : [...s.pending.deletes, rowId],
      },
    })),

  clearPending: () => set({ pending: emptyPending() }),

  commit: async (db) => {
    const { table, pending, page, pageSize } = get()
    if (!table || pendingCount(pending) === 0) return
    set({ committing: true, error: null })
    try {
      await api.batchTable(db, table, toBatchOps(pending))
      const data = await api.browseTable(db, table, { page, page_size: pageSize })
      set({ data, pending: emptyPending(), committing: false })
    } catch (e) {
      set({ error: (e as Error).message, committing: false })
      throw e
    }
  },
}))
