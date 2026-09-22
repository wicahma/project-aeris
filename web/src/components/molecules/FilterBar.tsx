import type { EFilterOperator } from '../../utils/grid-transform.util'
import { useState } from 'react'

const OPERATORS: { value: EFilterOperator; label: string }[] = [
  { value: 'contains', label: 'contains' },
  { value: 'eq', label: '=' },
  { value: 'gt', label: '>' },
  { value: 'lt', label: '<' },
  { value: 'is_null', label: 'is null' },
]

export function FilterBar({
  columns,
  onApply,
}: {
  columns: string[]
  onApply: (column: number, operator: EFilterOperator, value: string) => void
}) {
  const [column, setColumn] = useState(0)
  const [operator, setOperator] = useState<EFilterOperator>('contains')
  const [value, setValue] = useState('')

  return (
    <div className="flex items-center gap-1 border-b border-border bg-panel px-2 py-1 text-xs">
      <span className="text-muted">Filter</span>
      <select
        aria-label="Filter column"
        className="rounded-control border border-border bg-canvas px-1 py-0.5 text-text"
        value={column}
        onChange={(e) => setColumn(Number(e.target.value))}
      >
        {columns.map((c, i) => (
          <option key={c} value={i}>
            {c}
          </option>
        ))}
      </select>
      <select
        aria-label="Filter operator"
        className="rounded-control border border-border bg-canvas px-1 py-0.5 text-text"
        value={operator}
        onChange={(e) => setOperator(e.target.value as EFilterOperator)}
      >
        {OPERATORS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {operator !== 'is_null' && (
        <input
          aria-label="Filter value"
          className="w-32 rounded-control border border-border bg-canvas px-1 py-0.5 text-text outline-none focus:border-accent"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onApply(column, operator, value)}
        />
      )}
      <button
        onClick={() => onApply(column, operator, value)}
        className="rounded-control bg-accent px-2 py-0.5 text-white hover:opacity-90"
      >
        Apply
      </button>
      <button onClick={() => onApply(column, 'contains', '')} className="rounded-control px-2 py-0.5 text-muted hover:bg-hover hover:text-text">
        Clear
      </button>
    </div>
  )
}
