import { useEditorStore } from '../../store/global-states/editor.store'

export function EditorTabs() {
  const { tabs, activeTabId, newTab, closeTab, selectTab, error } = useEditorStore()
  return (
    <div className="flex items-center gap-0.5 overflow-x-auto border-b border-border bg-panel px-1">
      {tabs.map((t) => (
        <div
          key={t.id}
          className={`group flex items-center gap-1 rounded-t-control border-b-2 px-2 py-1 text-xs ${
            t.id === activeTabId ? 'border-accent bg-canvas text-heading' : 'border-transparent text-muted hover:text-text'
          }`}
        >
          <button onClick={() => selectTab(t.id)} className="max-w-32 truncate">
            {t.name}
          </button>
          <button
            aria-label={`Close ${t.name}`}
            onClick={() => closeTab(t.id)}
            className="invisible text-disabled hover:text-error group-hover:visible"
          >
            ×
          </button>
        </div>
      ))}
      <button aria-label="New tab" onClick={newTab} className="rounded-control px-2 py-1 text-xs text-muted hover:bg-hover hover:text-text">
        +
      </button>
      {error && <span role="alert" className="ml-2 text-xs text-error">{error}</span>}
    </div>
  )
}
