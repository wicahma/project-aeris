import { useCallback, useEffect, useState } from 'react'
import { useHistoryStore } from '../../../store/global-states/history.store'
import { useAerisStore } from '../../../store/aeris.store'
import { useEditorStore } from '../../../store/global-states/editor.store'

export function useHistoryPanelHooks() {
  const { activeDb } = useAerisStore()
  const { entries, saved, filters, loading, error, load, loadSaved, setFilters, saveCurrent, removeSaved } =
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

  return {
    entries, saved, filters, loading, error, activeDb, promptOpen, activeSql, reuseSql,
    setPromptOpen, onFilter, onSave, onDeleteSaved,
  }
}
