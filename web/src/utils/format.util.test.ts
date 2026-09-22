import { describe, expect, it } from 'vitest'
import { errorMessage, formatDuration } from './format.util'

describe('formatDuration', () => {
  it('formats sub-ms as µs', () => {
    expect(formatDuration(0.5)).toBe('500µs')
  })
  it('formats ms', () => {
    expect(formatDuration(1.23)).toBe('1.2ms')
    expect(formatDuration(999)).toBe('999.0ms')
  })
  it('formats seconds', () => {
    expect(formatDuration(1500)).toBe('1.50s')
  })
})

describe('errorMessage', () => {
  it('extracts Error.message', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom')
  })
  it('stringifies non-errors', () => {
    expect(errorMessage('plain')).toBe('plain')
    expect(errorMessage(42)).toBe('42')
  })
})
