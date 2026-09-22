import { useCallback, useEffect, useState } from 'react'
import { useHistoryStore } from '../../../store/global-states/history.store'
import { useAerisStore } from '../../../store/aeris.store'
import { useEditorStore } from '../../../store/global-states/editor.store'

export function useHistoryPanelHooks() {
  const { activeDb } = useAerisStore()
  const { entries, saved, filters, loading, error, load, loadSaved, setFilters, saveCurrent, removeSaved, togglePin, prune } =
    useHistoryStore()
  const [promptOpen, setPromptOpen] = useState(false)
  const activeSql = useEditorStore((s) => s.tabs.find((t) => t.id === s.activeTabId)?.sql ?? '')
  const loadIntoEditor = useEditorStore((s) => s.updateSql)
  const activeTabId = useEditorStore((s) => s.activeTabId)

  const reuseSql = useCallback(
    (sql: string) => loadIntoEditor(activeTabId, sql),
    [loadIntoEditor, activeTabId],
  )

  useEffect(() => {
    if (!activeDb) return
    void load(activeDb)
    void loadSaved(activeDb)
  }, [activeDb])

  const onFilter = useCallback(
    (patch: Partial<typeof filters>) => {
      if (activeDb) void setFilters(activeDb, { ...filters, ...patch })
    },
    [activeDb, filters, setFilters],
  )

  const onSave = useCallback(
    async (title: string, category: string, queryText: string) => {
      if (!activeDb) return
      await saveCurrent(activeDb, title, category, queryText)
    },
    [activeDb, saveCurrent],
  )

  const onDeleteSaved = useCallback(
    (id: string) => {
      if (activeDb) void removeSaved(activeDb, id)
    },
    [activeDb, removeSaved],
  )

  const onTogglePin = useCallback(
    (id: string, pinned: boolean) => {
      if (activeDb) void togglePin(activeDb, id, pinned)
    },
    [activeDb, togglePin],
  )

  const onPrune = useCallback(() => {
    if (!activeDb) return
    const days = window.prompt('Purge history older than N days (0 = only enforce 500-entry cap):', '0')
    if (days === null) return
    void prune(activeDb, parseInt(days, 10) || 0).then((n) => {
      window.alert(`Pruned ${n} history entries.`)
    })
  }, [activeDb, prune])

  return {
    entries, saved, filters, loading, error, activeDb, promptOpen, activeSql, reuseSql,
    setPromptOpen, onFilter, onSave, onDeleteSaved, onTogglePin, onPrune,
  }
}
