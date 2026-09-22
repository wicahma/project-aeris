import { describe, expect, it } from 'vitest'
import { formatTimestamp } from './format-timestamp.util'

describe('formatTimestamp', () => {
  it('formats ms as local YYYY-MM-DD HH:mm:ss', () => {
    const ms = new Date(2026, 8, 22, 9, 5, 3).getTime()
    expect(formatTimestamp(ms)).toBe('2026-09-22 09:05:03')
  })

  it('pads single digits', () => {
    const ms = new Date(2026, 0, 2, 3, 4, 5).getTime()
    expect(formatTimestamp(ms)).toBe('2026-01-02 03:04:05')
  })
})
