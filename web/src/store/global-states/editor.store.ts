import { create } from 'zustand'

export interface IEditorTab {
  id: string
  name: string
  sql: string
}

const STORAGE_KEY = 'aeris_editor_tabs'
const MAX_TABS = 20

function storage(): Storage {
  return window.localStorage
}

function loadTabs(): IEditorTab[] {
  try {
    const raw = storage().getItem(STORAGE_KEY)
    if (!raw) return [defaultTab(1)]
    const tabs = JSON.parse(raw) as IEditorTab[]
    return tabs.length > 0 ? tabs : [defaultTab(1)]
  } catch {
    return [defaultTab(1)]
  }
}

function persist(tabs: IEditorTab[]) {
  try {
    storage().setItem(STORAGE_KEY, JSON.stringify(tabs))
  } catch {
    // ponytail: quota exceeded — keep in-memory only, non-blocking per FSD edge case
  }
}

function defaultTab(n: number): IEditorTab {
  return { id: crypto.randomUUID(), name: `Query ${n}`, sql: '' }
}

interface IEditorState {
  tabs: IEditorTab[]
  activeTabId: string
  error: string | null
  newTab: () => void
  closeTab: (id: string) => void
  selectTab: (id: string) => void
  updateSql: (id: string, sql: string) => void
  renameTab: (id: string, name: string) => void
}

export const useEditorStore = create<IEditorState>((set, get) => {
  const initial = loadTabs()
  return {
    tabs: initial,
    activeTabId: initial[0].id,
    error: null,

    newTab: () => {
      const { tabs } = get()
      if (tabs.length >= MAX_TABS) {
        set({ error: 'ERR_MAX_TABS: Maximum number of query tabs (20) reached. Please close unused tabs.' })
        return
      }
      const tab = defaultTab(tabs.length + 1)
      const next = [...tabs, tab]
      persist(next)
      set({ tabs: next, activeTabId: tab.id, error: null })
    },

    closeTab: (id) => {
      const { tabs, activeTabId } = get()
      if (tabs.length === 1) return
      const next = tabs.filter((t) => t.id !== id)
      persist(next)
      set({
        tabs: next,
        activeTabId: activeTabId === id ? next[next.length - 1].id : activeTabId,
      })
    },

    selectTab: (id) => set({ activeTabId: id }),

    updateSql: (id, sql) => {
      const next = get().tabs.map((t) => (t.id === id ? { ...t, sql } : t))
      persist(next)
      set({ tabs: next })
    },

    renameTab: (id, name) => {
      if (!name.trim()) {
        set({ error: 'ERR_EMPTY_TAB_NAME: Tab name cannot be empty.' })
        return
      }
      const next = get().tabs.map((t) => (t.id === id ? { ...t, name: name.slice(0, 64) } : t))
      persist(next)
      set({ tabs: next, error: null })
    },
  }
})
