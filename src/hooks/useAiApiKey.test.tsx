import { act, renderHook, waitFor } from '@testing-library/react'
import { useAiApiKey } from './useAiApiKey'

describe('useAiApiKey', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  test('keeps the key only in component memory and clears it on remount', () => {
    const first = renderHook(() => useAiApiKey())
    expect(first.result.current.apiKey).toBe('')
    act(() => first.result.current.setApiKey('temporary-key'))
    expect(first.result.current.apiKey).toBe('temporary-key')
    expect(first.result.current.status).toBe('unchecked')
    expect(localStorage).toHaveLength(0)
    expect(sessionStorage).toHaveLength(0)
    first.unmount()

    const second = renderHook(() => useAiApiKey())
    expect(second.result.current.apiKey).toBe('')
    expect(second.result.current.status).toBe('empty')
  })

  test('checks a connection once and resets verification when the key changes', async () => {
    let resolveRequest: ((value: unknown) => void) | undefined
    const fetchMock = jest.fn(() => new Promise((resolve) => { resolveRequest = resolve }))
    Object.defineProperty(globalThis, 'fetch', { configurable: true, value: fetchMock })
    const hook = renderHook(() => useAiApiKey())
    act(() => hook.result.current.setApiKey('key-one'))
    act(() => { void hook.result.current.checkConnection(); void hook.result.current.checkConnection() })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(hook.result.current.status).toBe('checking')
    await act(async () => resolveRequest?.({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => ({ data: [{ id: 'gpt-5-mini' }] }),
    }))
    await waitFor(() => expect(hook.result.current.status).toBe('available'))
    act(() => hook.result.current.setApiKey('key-two'))
    expect(hook.result.current.status).toBe('unchecked')
  })

  test('clears the in-memory key explicitly', () => {
    const hook = renderHook(() => useAiApiKey())
    act(() => hook.result.current.setApiKey('temporary-key'))
    act(() => hook.result.current.clearApiKey())
    expect(hook.result.current.apiKey).toBe('')
  })
})
