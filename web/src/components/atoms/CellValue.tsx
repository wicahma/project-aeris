export function CellValue({ value, type }: { value: unknown; type?: string }) {
  if (value === null || value === undefined) {
    return <span className="rounded-chip bg-hover px-1 font-mono text-xs italic text-disabled">null</span>
  }
  if (typeof value === 'boolean') {
    return (
      <span
        className={`rounded-chip px-1.5 py-0.5 font-mono text-xs ${value ? 'bg-success/20 text-success' : 'bg-hover text-muted'}`}
      >
        {String(value)}
      </span>
    )
  }
  if (type === 'BLOB') {
    return <span className="rounded-chip bg-hover px-1 font-mono text-xs text-warning">[BLOB]</span>
  }
  const s = String(value)
  if (s.length > 100) {
    return (
      <span title={s} className="font-mono text-xs text-text">
        {s.slice(0, 100)}…
      </span>
    )
  }
  return <span className="font-mono text-xs text-text">{s}</span>
}
