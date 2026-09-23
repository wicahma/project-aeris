export function getStoredKey(): string | null {
  return window.localStorage.getItem('aeris_api_key')
}

export function setStoredKey(key: string): void {
  window.localStorage.setItem('aeris_api_key', key)
}

export function clearStoredKey(): void {
  window.localStorage.removeItem('aeris_api_key')
}
