import { useCallback, useState } from 'react'
import { useAerisStore } from '../../../store/aeris.store'
import { useEditorStore } from '../../../store/global-states/editor.store'
import { api } from '../../../services/database/api.service'
import type { IExplainNode } from '../../../interface/api.interface'
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

  const [plan, setPlan] = useState<IExplainNode[] | null>(null)
  const [planError, setPlanError] = useState<string | null>(null)

  const handleExplain = useCallback(async () => {
    const db = useAerisStore.getState().activeDb
    if (!db) {
      setPlanError('ERR_DB_NOT_SELECTED: No target database selected for execution.')
      return
    }
    const sql = activeTab.sql.trim()
    if (!sql) {
      setPlanError('ERR_EMPTY_QUERY: Cannot explain empty query string.')
      return
    }
    setPlanError(null)
    try {
      setPlan(await api.explain(db, sql))
    } catch (e) {
      setPlan(null)
      setPlanError((e as Error).message)
    }
  }, [activeTab])

  const closePlan = useCallback(() => setPlan(null), [])

  return { activeTab, activeDb, loading, editorError, handleRun, handleFormat, runSql, updateSql, plan, planError, handleExplain, closePlan }
}
