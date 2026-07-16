import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'

if (!globalThis.structuredClone) {
  Object.defineProperty(globalThis, 'structuredClone', {
    configurable: true,
    value: <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T,
  })
}

if (!globalThis.crypto.randomUUID) {
  Object.defineProperty(globalThis.crypto, 'randomUUID', {
    configurable: true,
    value: () => '00000000-0000-4000-8000-000000000000',
  })
}
