const CLAUSE_STARTERS = new Set([
  'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT',
  'OFFSET', 'VALUES', 'SET', 'JOIN', 'LEFT JOIN', 'INNER JOIN', 'ON',
  'UNION', 'WHEN', 'ELSE', 'END',
])

const tokenRe = /('[^']*'|"[^"]*"|--[^\n]*|\/\*[\s\S]*?\*\/|[(),;=<>!+*/-]|\w+|[^\w\s]+|\s+)/g

export function formatSql(input: string, indentSize = 2, keywordCase: 'UPPER' | 'lower' = 'UPPER'): string {
  const tokens = (input.match(tokenRe) ?? []).filter((t) => !/^\s+$/.test(t))
  const kw = (word: string) => (keywordCase === 'UPPER' ? word.toUpperCase() : word.toLowerCase())
  const lines: string[] = []
  let line = ''
  let depth = 0
  let inSelectList = false
  const indent = () => ' '.repeat(indentSize * depth)

  const flush = () => {
    const trimmedEnd = line.replace(/\s+$/, '')
    if (trimmedEnd.trim()) lines.push(trimmedEnd)
    line = ''
  }
  let glueNext = false
  const append = (text: string, glue = false) => {
    if (!line) line = indent() + text
    else if (glue || glueNext) line = line.replace(/\s+$/, '') + text
    else line = line.replace(/\s+$/, '') + ' ' + text
    glueNext = false
  }
  const startClause = (text: string) => {
    flush()
    line = indent() + text
    glueNext = false
  }

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    const next = tokens[i + 1]
    const twoWord = next ? `${t.toUpperCase()} ${next.toUpperCase()}` : ''

    if (t === '(') {
      if (next && next.toUpperCase() === 'SELECT') {
        append('(', true)
        depth++
        flush()
      } else {
        append('(', true)
      }
      continue
    }
    if (t === ')') {
      if (depth > 0) {
        depth--
        flush()
        line = indent() + ')'
      } else {
        append(')', true)
      }
      continue
    }
    if (t === '.') {
      append('.', true)
      glueNext = true
      continue
    }
    if (CLAUSE_STARTERS.has(twoWord)) {
      startClause(`${kw(t)} ${kw(next)}`)
      inSelectList = twoWord === 'SELECT'
      i++
      continue
    }
    if (CLAUSE_STARTERS.has(t.toUpperCase())) {
      startClause(kw(t))
      inSelectList = t.toUpperCase() === 'SELECT'
      continue
    }
    if (t === ',') {
      line = line.trimEnd() + ','
      if (inSelectList) {
        flush()
        line = indent() + ' '.repeat(2)
      } else {
        line += ' '
      }
      continue
    }
    if (t === ';') {
      line = line.trimEnd() + ';'
      flush()
      inSelectList = false
      continue
    }
    append(t)
  }
  flush()
  return lines.join('\n')
}
