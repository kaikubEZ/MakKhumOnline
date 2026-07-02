import '@testing-library/jest-dom'

// jsdom in this setup doesn't provide a working localStorage, but the store
// reads it at module-load time. Provide a minimal in-memory polyfill.
if (typeof localStorage === 'undefined' || typeof localStorage.getItem !== 'function') {
  const store = new Map<string, string>()
  const mock: Storage = {
    getItem: (k) => (store.has(k) ? store.get(k)! : null),
    setItem: (k, v) => { store.set(k, String(v)) },
    removeItem: (k) => { store.delete(k) },
    clear: () => { store.clear() },
    key: (i) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size },
  }
  Object.defineProperty(globalThis, 'localStorage', { value: mock, configurable: true })
}
