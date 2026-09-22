import { useCallback, useMemo, useState } from 'react'
import {
  applyFilters,
  applySort,
  cycleSort,
  type EFilterOperator,
  type ESortDirection,
  type IFilterRule,
  type ISortRule,
} from '../../../utils/grid-transform.util'
import { exportRows, downloadText, type EExportFormat } from '../../../utils/grid-export.util'
import type { IQueryResult } from '../../../interface/api.interface'

const PAGE_SIZE = 100

export function useDataGridHooks(result: IQueryResult | null) {
  const [sortRules, setSortRules] = useState<ISortRule[]>([])
  const [filterRules, setFilterRules] = useState<IFilterRule[]>([])
  const [page, setPage] = useState(0)
  const [viewMode, setViewMode] = useState<'grid' | 'text'>('grid')

  const filtered = useMemo(() => (result ? applyFilters(result.rows, filterRules) : []), [result, filterRules])
  const sorted = useMemo(() => applySort(filtered, sortRules), [filtered, sortRules])
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const pageRows = useMemo(() => sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [sorted, page])

  const onHeaderClick = useCallback(
    (column: number, additive: boolean) => {
      setSortRules((rules) => cycleSort(rules, column, additive))
      setPage(0)
    },
    [],
  )

  const onFilterChange = useCallback((column: number, operator: EFilterOperator, value: string) => {
    setFilterRules((rules) => [
      ...rules.filter((r) => r.column !== column),
      ...(operator === 'is_null' || value !== '' ? [{ column, operator, value }] : []),
    ])
    setPage(0)
  }, [])

  const onSort = useCallback((direction: ESortDirection, column: number) => {
    setSortRules([{ column, direction }])
    setPage(0)
  }, [])

  const onExport = useCallback(
    (format: EExportFormat) => {
      if (!result) return
      const content = exportRows(format, result.columns, sorted)
      if (format === 'tsv') {
        navigator.clipboard.writeText(content)
        return
      }
      const mimes: Record<string, string> = {
        csv: 'text/csv',
        json: 'application/json',
        markdown: 'text/markdown',
      }
      downloadText(`aeris-result.${format}`, content, mimes[format])
    },
    [result, sorted],
  )

  const reset = useCallback(() => {
    setSortRules([])
    setFilterRules([])
    setPage(0)
  }, [])

  return {
    sortRules,
    filterRules,
    page,
    pageCount,
    pageRows,
    totalRows: sorted.length,
    viewMode,
    setViewMode,
    onHeaderClick,
    onFilterChange,
    onSort,
    onExport,
    setPage,
    reset,
  }
}
