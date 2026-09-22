export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  return String(e)
}

export function formatDuration(ms: number): string {
  if (ms < 1) return `${Math.round(ms * 1000)}µs`
  if (ms < 1000) return `${ms.toFixed(1)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}
