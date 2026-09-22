// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { useEditorStore } from './editor.store'

const store = () => useEditorStore.getState()

describe('editor.store', () => {
  beforeEach(() => {
    window.localStorage.clear()
    useEditorStore.setState({ tabs: [{ id: 't1', name: 'Query 1', sql: '' }], activeTabId: 't1', error: null })
  })

  it('newTab adds and activates', () => {
    store().newTab()
    expect(store().tabs.length).toBe(2)
    expect(store().activeTabId).toBe(store().tabs[1].id)
  })

  it('newTab enforces ERR_MAX_TABS at 20', () => {
    useEditorStore.setState({
      tabs: Array.from({ length: 20 }, (_, i) => ({ id: `t${i}`, name: `Q${i}`, sql: '' })),
    })
    store().newTab()
    expect(store().tabs.length).toBe(20)
    expect(store().error).toContain('ERR_MAX_TABS')
  })

  it('closeTab refuses to close the last tab', () => {
    store().closeTab('t1')
    expect(store().tabs.length).toBe(1)
  })

  it('closeTab moves active selection when active tab closed', () => {
    store().newTab()
    const second = store().tabs[1].id
    store().closeTab(second)
    expect(store().activeTabId).toBe('t1')
  })

  it('closeTab keeps active when other tab closed', () => {
    store().newTab()
    store().closeTab('t1')
    expect(store().activeTabId).toBe(store().tabs[0].id)
  })

  it('updateSql writes and persists to localStorage', () => {
    store().updateSql('t1', 'SELECT 1')
    expect(store().tabs[0].sql).toBe('SELECT 1')
    const saved = JSON.parse(window.localStorage.getItem('aeris_editor_tabs')!)
    expect(saved[0].sql).toBe('SELECT 1')
  })

  it('renameTab rejects empty names', () => {
    store().renameTab('t1', '   ')
    expect(store().error).toContain('ERR_EMPTY_TAB_NAME')
    expect(store().tabs[0].name).toBe('Query 1')
  })

  it('renameTab truncates to 64 chars', () => {
    store().renameTab('t1', 'x'.repeat(100))
    expect(store().tabs[0].name.length).toBe(64)
  })
})
