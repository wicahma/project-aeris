import { create } from 'zustand'
import { buildDDL, validateSpec, type IColumnSpec, type ITableSpec } from '../../utils/ddl-builder.util'
import { api } from '../../services/database/api.service'
import { useAerisStore } from '../aeris.store'

function emptyColumn(name = ''): IColumnSpec {
  return { name, type: 'TEXT', notNull: false, primaryKey: false, unique: false, defaultValue: null, referencesTable: '', referencesColumn: '', onDelete: '' }
}

function initial(): ITableSpec {
  return { name: '', columns: [emptyColumn('id')] }
}

interface ISchemaBuilderState {
  open: boolean
  spec: ITableSpec
  submitting: boolean
  submitError: string | null
  setOpen: (open: boolean) => void
  setName: (name: string) => void
  setColumn: (i: number, patch: Partial<IColumnSpec>) => void
  addColumn: () => void
  removeColumn: (i: number) => void
  reset: () => void
  submit: (db: string) => Promise<void>
}

export const useSchemaBuilderStore = create<ISchemaBuilderState>((set, get) => ({
  open: false,
  spec: initial(),
  submitting: false,
  submitError: null,

  setOpen: (open) => set({ open, submitError: null }),
  setName: (name) => set((s) => ({ spec: { ...s.spec, name } })),
  setColumn: (i, patch) =>
    set((s) => ({ spec: { ...s.spec, columns: s.spec.columns.map((c, j) => (j === i ? { ...c, ...patch } : c)) } })),
  addColumn: () => set((s) => ({ spec: { ...s.spec, columns: [...s.spec.columns, emptyColumn()] } })),
  removeColumn: (i) => set((s) => ({ spec: { ...s.spec, columns: s.spec.columns.filter((_, j) => j !== i) } })),
  reset: () => set({ spec: initial(), submitError: null }),

  submit: async (db) => {
    const { spec } = get()
    if (validateSpec(spec)) return
    set({ submitting: true, submitError: null })
    try {
      await api.createTable(db, spec)
      await useAerisStore.getState().selectDb(db)
      set({ open: false, spec: initial() })
    } catch (e) {
      set({ submitError: (e as Error).message })
    } finally {
      set({ submitting: false })
    }
  },
}))

export const selectValidationError = (s: ISchemaBuilderState) => validateSpec(s.spec)
export const selectDDL = (s: ISchemaBuilderState) => (validateSpec(s.spec) ? '' : buildDDL(s.spec))
