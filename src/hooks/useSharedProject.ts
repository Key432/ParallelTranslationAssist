import { useCallback, useEffect, useState } from 'react'
import { decodeSharePayload, parseShareFragment, supportsShareLinks } from '../services/shareLinkCodec'
import type { SharedProjectV1 } from '../types'

export function useSharedProject() {
  const [shared, setShared] = useState<SharedProjectV1 | null>(null)
  const [error, setError] = useState<'unsupported' | 'invalid' | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const payload = parseShareFragment(window.location.hash)
    if (payload === null) return
    let active = true
    setLoading(true)
    void decodeSharePayload(payload)
      .then((project) => { if (active) setShared(project) })
      .catch(() => { if (active) setError(supportsShareLinks() ? 'invalid' : 'unsupported') })
      .finally(() => {
        if (!active) return
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
        setLoading(false)
      })
    return () => { active = false }
  }, [])

  const clearShared = useCallback(() => setShared(null), [])
  const clearError = useCallback(() => setError(null), [])
  return { shared, error, loading, clearShared, clearError }
}
