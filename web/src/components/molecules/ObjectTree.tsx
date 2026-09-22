import type { ITable } from '../../interface/api.interface'

export function ObjectTree({ tables, onSelect }: { tables: ITable[]; onSelect: (t: ITable) => void }) {
  const groups = [
    { label: 'Tables', items: tables.filter((t) => t.type === 'table') },
    { label: 'Views', items: tables.filter((t) => t.type === 'view') },
  ]
  return (
    <nav aria-label="Object navigator" className="text-sm">
      {groups.map((g) => (
        <details key={g.label} open className="mb-1">
          <summary className="cursor-pointer select-none px-2 py-1 text-muted hover:text-text">
            {g.label} <span className="text-disabled">({g.items.length})</span>
          </summary>
          <ul className="ml-3">
            {g.items.map((t) => (
              <li key={t.name}>
                <button
                  onClick={() => onSelect(t)}
                  className="block w-full rounded-control px-2 py-1 text-left text-text hover:bg-hover"
                >
                  {t.name}
                </button>
              </li>
            ))}
          </ul>
        </details>
      ))}
      {tables.length === 0 && <p className="px-2 py-1 text-disabled">No objects</p>}
    </nav>
  )
}
