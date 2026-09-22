import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { tags } from '@lezer/highlight'

const editorTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: '#1E1F22',
      color: '#BCBEC4',
      fontSize: '13px',
    },
    '.cm-content': {
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      caretColor: '#BCBEC4',
      padding: '8px 0',
    },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#BCBEC4' },
    '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground': {
      backgroundColor: '#2E436E',
    },
    '.cm-activeLine': { backgroundColor: '#26282e' },
    '.cm-gutters': {
      backgroundColor: '#1E1F22',
      color: '#6F737A',
      border: 'none',
      borderRight: '1px solid #393B40',
    },
    '.cm-activeLineGutter': { backgroundColor: '#26282e', color: '#9DA0A8' },
    '.cm-foldPlaceholder': { backgroundColor: '#2B2D30', border: '1px solid #393B40', color: '#9DA0A8' },
    '.cm-tooltip': {
      backgroundColor: '#2B2D30',
      border: '1px solid #393B40',
      color: '#CED0D6',
    },
    '.cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]': {
      backgroundColor: '#2E436E',
      color: '#F0F1F2',
    },
    '.cm-panels': { backgroundColor: '#2B2D30', color: '#CED0D6' },
    '.cm-searchMatch': { backgroundColor: '#375FAD', outline: '1px solid #3574F0' },
  },
  { dark: true },
)

const highlight = HighlightStyle.define([
  { tag: tags.keyword, color: '#CF8E6D' },
  { tag: [tags.string, tags.special(tags.string)], color: '#6AAB73' },
  { tag: tags.number, color: '#2AACB8' },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: '#56A8F5' },
  { tag: tags.comment, color: '#7A7E85', fontStyle: 'italic' },
  { tag: [tags.typeName, tags.standard(tags.variableName)], color: '#C77DBB' },
  { tag: tags.operator, color: '#BCBEC4' },
  { tag: tags.bool, color: '#CF8E6D' },
  { tag: tags.null, color: '#CF8E6D' },
])

export const islandsDark = [editorTheme, syntaxHighlighting(highlight)]
