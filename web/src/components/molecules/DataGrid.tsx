import { useEffect } from 'react'
import type { IQueryResult } from '../../interface/api.interface'
import { useDataGridHooks } from '../../hooks/page/query/useDataGridHooks'
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
          {grid.totalRows} row(s)
          {grid.totalRows !== result.rows.length && ` of ${result.rows.length}`} · {formatDuration(result.durationMs)}
        </span>
      </div>

      {grid.viewMode === 'text' ? (
        <pre className="flex-1 overflow-auto p-3 font-mono text-xs text-text">
          {grid.pageRows.map((r) => r.map((c) => (c === null ? 'NULL' : String(c))).join('\t')).join('\n')}
        </pre>
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {result.columns.map((c, i) => {
                  const rule = grid.sortRules.find((r) => r.column === i)
                  return (
                    <th
                      key={c}
                      onClick={(e) => grid.onHeaderClick(i, e.shiftKey)}
                      className="sticky top-0 cursor-pointer select-none border border-border bg-panel px-2 py-1 text-left text-xs text-heading hover:bg-hover"
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
              {grid.pageRows.map((row, i) => (
                <tr key={i} className={i % 2 ? 'bg-canvas' : 'bg-panel'}>
                  {row.map((cell, j) => (
                    <td key={j} className="max-w-96 truncate border border-border px-2 py-1">
                      <CellValue value={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {grid.pageRows.length === 0 && <p className="p-4 text-sm text-disabled">No rows match the filter</p>}
        </div>
      )}

      {grid.pageCount > 1 && (
        <div className="flex items-center gap-2 border-t border-border bg-panel px-2 py-1 text-xs text-muted">
          <IconButton disabled={grid.page === 0} onClick={() => grid.setPage(0)}>
            «
          </IconButton>
          <IconButton disabled={grid.page === 0} onClick={() => grid.setPage(grid.page - 1)}>
            ‹
          </IconButton>
          <span>
            page {grid.page + 1} / {grid.pageCount}
          </span>
          <IconButton disabled={grid.page >= grid.pageCount - 1} onClick={() => grid.setPage(grid.page + 1)}>
            ›
          </IconButton>
          <IconButton disabled={grid.page >= grid.pageCount - 1} onClick={() => grid.setPage(grid.pageCount - 1)}>
            »
          </IconButton>
        </div>
      )}
    </div>
  )
}
