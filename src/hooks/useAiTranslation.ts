import { useEffect, useRef, useState } from 'react'
import { AiTranslationClientError, requestAiTranslation } from '../services/aiTranslationClient'
import type { AiTranslationRequest, AiTranslationResponse } from '../types'

export function useAiTranslation() {
  const [suggestion, setSuggestion] = useState<AiTranslationResponse | null>(null)
  const [error, setError] = useState('')
  const [errorCode, setErrorCode] = useState('')
  const [loading, setLoading] = useState(false)
  const controller = useRef<AbortController | null>(null)

  const cancel = () => {
    controller.current?.abort()
    controller.current = null
    setLoading(false)
  }
  const clear = () => { cancel(); setSuggestion(null); setError(''); setErrorCode('') }

  useEffect(() => () => controller.current?.abort(), [])

  const createSuggestion = async (apiKey: string, input: AiTranslationRequest) => {
    cancel()
    controller.current = new AbortController()
    setLoading(true)
    setError('')
    setErrorCode('')
    setSuggestion(null)
    try {
      const result = await requestAiTranslation(apiKey, input, controller.current.signal)
      if (!result.translation || !Array.isArray(result.warnings) || result.warnings.some((warning) => typeof warning !== 'string')) {
        throw new Error('AIの応答を読み取れませんでした。もう一度お試しください。')
      }
      setSuggestion(result)
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return
      setErrorCode(caught instanceof AiTranslationClientError ? caught.code : 'invalid_response')
      setError(caught instanceof Error ? caught.message : 'AI翻訳へ接続できませんでした。')
    } finally {
      setLoading(false)
      controller.current = null
    }
  }

  return { suggestion, error, errorCode, loading, createSuggestion, cancel, clear, clearSuggestion: () => setSuggestion(null) }
}
