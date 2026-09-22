import { useCallback, useMemo, useRef, useState, useEffect } from 'react'
import { applyFilters, applySort, cycleSort, type EFilterOperator, type ESortDirection, type IFilterRule, type ISortRule } from '../../../utils/grid-transform.util'
import { exportRows, downloadText, type EExportFormat } from '../../../utils/grid-export.util'
import type { IQueryResult } from '../../../interface/api.interface'

// ponytail: manual virtualization via fixed row height + scroll offset.
// Replaces pagination (QE-012 subset). @tanstack/react-virtual deferred —
// add when variable-height rows or column virtualization are needed.
export const GRID_ROW_HEIGHT = 28

export function useDataGridHooks(result: IQueryResult | null) {
  const [sortRules, setSortRules] = useState<ISortRule[]>([])
  const [filterRules, setFilterRules] = useState<IFilterRule[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'text'>('grid')
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(600)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => (result ? applyFilters(result.rows, filterRules) : []), [result, filterRules])
  const sorted = useMemo(() => applySort(filtered, sortRules), [filtered, sortRules])
  const totalRows = sorted.length

  const overscan = 10
  const startIdx = Math.max(0, Math.floor(scrollTop / GRID_ROW_HEIGHT) - overscan)
  const endIdx = Math.min(totalRows, Math.ceil((scrollTop + viewportHeight) / GRID_ROW_HEIGHT) + overscan)
  const visibleRows = useMemo(() => sorted.slice(startIdx, endIdx), [sorted, startIdx, endIdx])
  const offsetTop = startIdx * GRID_ROW_HEIGHT
  const totalHeight = totalRows * GRID_ROW_HEIGHT

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      setViewportHeight(entries[0]?.contentRect.height ?? 600)
    })
    ro.observe(el)
    setViewportHeight(el.clientHeight)
    return () => ro.disconnect()
  }, [])

  const scroll = useCallback(() => {
    const el = containerRef.current
    if (el && typeof el.scrollTo === 'function') el.scrollTo({ top: 0 })
  }, [])

  const onHeaderClick = useCallback(
    (column: number, additive: boolean) => {
      setSortRules((rules) => cycleSort(rules, column, additive))
      scroll()
    },
    [scroll],
  )

  const onFilterChange = useCallback((column: number, operator: EFilterOperator, value: string) => {
    setFilterRules((rules) => [
      ...rules.filter((r) => r.column !== column),
      ...(operator === 'is_null' || value !== '' ? [{ column, operator, value }] : []),
    ])
    scroll()
  }, [scroll])

  const onSort = useCallback((direction: ESortDirection, column: number) => {
    setSortRules([{ column, direction }])
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
    setScrollTop(0)
    scroll()
  }, [scroll])

  return {
    sortRules,
    filterRules,
    visibleRows,
    totalRows,
    totalHeight,
    offsetTop,
    viewMode,
    setViewMode,
    onHeaderClick,
    onFilterChange,
    onSort,
    onExport,
    onScroll,
    containerRef,
    reset,
  }
}
