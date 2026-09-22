import { useEffect } from 'react'
import type { IQueryResult } from '../../interface/api.interface'
import { useDataGridHooks, GRID_ROW_HEIGHT } from '../../hooks/page/query/useDataGridHooks'
import { formatDuration } from '../../utils/format.util'
import { CellValue } from '../atoms/CellValue'
import { IconButton } from '../atoms/IconButton'
import { FilterBar } from './FilterBar'

export function DataGrid({ result }: { result: IQueryResult }) {
  const grid = useDataGridHooks(result)

  useEffect(() => {
    grid.reset()
  }, [result])

  if (!result.columns || result.columns.length === 0) {
    return (
      <p className="p-3 text-sm text-muted">
        {result.rowsAffected} row(s) affected in {formatDuration(result.durationMs)}
      </p>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <FilterBar columns={result.columns} onApply={grid.onFilterChange} />

      <div className="flex items-center gap-1 border-b border-border bg-panel px-2 py-1 text-xs">
        <IconButton active={grid.viewMode === 'grid'} onClick={() => grid.setViewMode('grid')}>
          Grid
        </IconButton>
        <IconButton active={grid.viewMode === 'text'} onClick={() => grid.setViewMode('text')}>
          Text
        </IconButton>
        <span className="mx-2 text-border">|</span>
        <IconButton onClick={() => grid.onExport('csv')}>CSV</IconButton>
        <IconButton onClick={() => grid.onExport('json')}>JSON</IconButton>
        <IconButton onClick={() => grid.onExport('markdown')}>MD</IconButton>
        <IconButton onClick={() => grid.onExport('tsv')} title="Copy as TSV to clipboard">
          Copy
        </IconButton>
        <span className="ml-auto text-muted">
          {grid.totalRows} row(s) · {formatDuration(result.durationMs)}
        </span>
      </div>

      {grid.viewMode === 'text' ? (
        <pre className="flex-1 overflow-auto p-3 font-mono text-xs text-text">
          {grid.visibleRows.map((r, i) => r.map((c) => (c === null ? 'NULL' : String(c))).join('\t')).join('\n')}
        </pre>
      ) : (
        <div
          ref={grid.containerRef}
          onScroll={grid.onScroll}
          className="flex-1 overflow-auto"
          style={{ height: '100%' }}
        >
          <div style={{ height: grid.totalHeight, position: 'relative' }}>
            <div style={{ transform: `translateY(${grid.offsetTop}px)` }}>
              <table className="border-collapse w-full">
                <thead>
                  <tr>
                    {result.columns.map((c, i) => {
                      const rule = grid.sortRules.find((r) => r.column === i)
                      return (
                        <th
                          key={c}
                          onClick={(e) => grid.onHeaderClick(i, e.shiftKey)}
                          className="sticky top-0 z-10 cursor-pointer select-none border border-border bg-panel px-2 py-1 text-left text-xs text-heading hover:bg-hover"
                          title="Click to sort, Shift+Click for multi-column"
                        >
                          {c}
                          {rule && (
                            <span className="ml-1 text-accent">
                              {rule.direction === 'asc' ? '▲' : '▼'}
                              {grid.sortRules.length > 1 && <sup>{grid.sortRules.indexOf(rule) + 1}</sup>}
                            </span>
                          )}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {grid.visibleRows.map((row, i) => (
                    <tr key={i} className={i % 2 ? 'bg-canvas' : 'bg-panel'} style={{ height: GRID_ROW_HEIGHT }}>
                      {row.map((cell, j) => (
                        <td key={j} className="max-w-96 truncate border border-border px-2" style={{ height: GRID_ROW_HEIGHT, lineHeight: `${GRID_ROW_HEIGHT}px` }}>
                          <CellValue value={cell} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {grid.visibleRows.length === 0 && <p className="p-4 text-sm text-disabled">No rows match the filter</p>}
        </div>
      )}
    </div>
  )
}
