import { useCallback, useState } from 'react'
import { useAerisStore } from '../../../store/aeris.store'
import { useEditorStore } from '../../../store/global-states/editor.store'
import { formatSql } from '../../../utils/sql-format.util'

export function useQueryEditorHooks() {
  const { tabs, activeTabId, updateSql } = useEditorStore()
  const { activeDb, loading } = useAerisStore()
  const [editorError, setEditorError] = useState<string | null>(null)
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0]

  const runSql = useCallback(
    async (text: string) => {
      const sql = text.trim()
      if (!sql) {
        setEditorError('ERR_EMPTY_QUERY: Cannot execute empty query string.')
        return
      }
      if (!useAerisStore.getState().activeDb) {
        setEditorError('ERR_DB_NOT_SELECTED: No target database selected for execution.')
        return
      }
      setEditorError(null)
      await useAerisStore.getState().runQuery(sql)
    },
    [],
  )

  const handleRun = useCallback(
    (selection?: string) => runSql(selection ?? activeTab.sql),
    [activeTab, runSql],
  )

  const handleFormat = useCallback(() => {
    updateSql(activeTab.id, formatSql(activeTab.sql))
  }, [activeTab, updateSql])

  return { activeTab, activeDb, loading, editorError, handleRun, handleFormat, runSql, updateSql }
}
