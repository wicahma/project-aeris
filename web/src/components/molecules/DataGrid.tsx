import type { IQueryResult } from '../../interface/api.interface'
import { formatDuration } from '../../utils/format.util'

export function DataGrid({ result }: { result: IQueryResult }) {
  if (!result.columns || result.columns.length === 0) {
    return (
      <p className="p-3 text-sm text-muted">
        {result.rowsAffected} row(s) affected in {formatDuration(result.durationMs)}
      </p>
    )
  }
  return (
    <div className="overflow-auto">
      <table className="w-full border-collapse font-mono text-xs">
        <thead>
          <tr>
            {result.columns.map((c) => (
              <th key={c} className="sticky top-0 border border-border bg-panel px-2 py-1 text-left text-heading">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, i) => (
            <tr key={i} className={i % 2 ? 'bg-canvas' : 'bg-panel'}>
              {row.map((cell, j) => (
                <td key={j} className="border border-border px-2 py-1 text-text">
                  {cell === null ? <span className="italic text-disabled">NULL</span> : String(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="p-2 text-xs text-muted">
        {result.rows.length} row(s) in {formatDuration(result.durationMs)}
      </p>
    </div>
  )
}
