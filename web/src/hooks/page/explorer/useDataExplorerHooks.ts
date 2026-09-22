import { useCallback } from 'react'
import { useAerisStore } from '../../../store/aeris.store'
import { useExplorerStore } from '../../../store/global-states/explorer.store'
import { applyEdits, pendingCount } from '../../../utils/data-pending.util'

export function useDataExplorerHooks() {
  const { activeDb } = useAerisStore()
  const store = useExplorerStore()
  const { data, pending } = store

  const colNames = data?.columns.map((c) => c.name) ?? []
  const visibleRows = data ? applyEdits(data.rows, data.rowIds, colNames, pending) : []
  const dirty = pendingCount(pending)

  const onCellEdit = useCallback(
    (rowId: number, column: string, value: unknown) => store.editCell(rowId, column, value),
    [store],
  )
  const onCommit = useCallback(async () => {
    if (!activeDb) return
    await store.commit(activeDb)
  }, [activeDb, store])
  const onPage = useCallback(
    (p: number) => {
      if (activeDb) void store.setPage(activeDb, p)
    },
    [activeDb, store],
  )

  return { ...store, activeDb, colNames, visibleRows, dirty, onCellEdit, onCommit, onPage }
}
