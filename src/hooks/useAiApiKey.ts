import { useEffect, useRef, useState } from 'react'
import { AiTranslationClientError, testAiConnection } from '../services/aiTranslationClient'
import type { AiConnectionStatus } from '../types'

export function useAiApiKey() {
  const [apiKey, setApiKeyState] = useState('')
  const [status, setStatus] = useState<AiConnectionStatus>('empty')
  const [model, setModel] = useState('')
  const controller = useRef<AbortController | null>(null)

  useEffect(() => () => controller.current?.abort(), [])

  const setApiKey = (value: string) => {
    controller.current?.abort()
    controller.current = null
    setApiKeyState(value)
    setModel('')
    setStatus(value ? 'unchecked' : 'empty')
  }

  const clearApiKey = () => setApiKey('')
  const markRequestError = (code: string) => {
    if (code === 'invalid_api_key' || code === 'permission_denied') setStatus('invalid')
    else if (code === 'quota_exceeded') setStatus('quota')
  }

  const checkConnection = async () => {
    if (!apiKey || controller.current) return
    const activeController = new AbortController()
    controller.current = activeController
    setStatus('checking')
    try {
      const result = await testAiConnection(apiKey, activeController.signal)
      setModel(result.model)
      setStatus(result.available ? 'available' : 'error')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      const code = error instanceof AiTranslationClientError ? error.code : 'connection_error'
      setStatus(code === 'invalid_api_key' || code === 'permission_denied' ? 'invalid' : code === 'quota_exceeded' ? 'quota' : 'error')
    } finally {
      if (controller.current === activeController) controller.current = null
    }
  }

  return { apiKey, status, model, setApiKey, clearApiKey, checkConnection, markRequestError }
}
