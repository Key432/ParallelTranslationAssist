import { buildTranslationPrompt, TRANSLATION_SYSTEM_PROMPT } from '../domain/aiTranslationPrompt'
import type { AiTranslationRequest, AiTranslationResponse } from '../types'

const OPENAI_API_BASE = 'https://api.openai.com/v1'
const OPENAI_MODEL = 'gpt-5-mini'

export type AiConnectionTestResponse = { available: boolean; model: string }

type OpenAIErrorResponse = { error?: { code?: string; message?: string } }
type OpenAIResponse = {
  output_text?: string
  output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>
}

export class AiTranslationClientError extends Error {
  constructor(public code: string, message: string) {
    super(message)
  }
}

function errorDetails(status: number, payload: OpenAIErrorResponse | null) {
  const apiCode = payload?.error?.code
  if (status === 401) return ['invalid_api_key', 'OpenAI APIキーが無効です。入力内容を確認してください。'] as const
  if (status === 403) return ['permission_denied', 'このAPIキーにはAI翻訳に必要な権限がありません。'] as const
  if (status === 429 && apiCode === 'insufficient_quota') return ['quota_exceeded', 'OpenAI APIの利用上限または残高を確認してください。'] as const
  if (status === 429) return ['rate_limited', 'リクエストが集中しています。少し待ってから再試行してください。'] as const
  return [apiCode ?? 'connection_error', payload?.error?.message ?? 'AI翻訳へ接続できませんでした。'] as const
}

async function openAiRequest<T>(path: string, apiKey: string, init: RequestInit, signal?: AbortSignal): Promise<{ payload: T; requestId?: string }> {
  let response: Response
  try {
    response = await fetch(`${OPENAI_API_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new AiTranslationClientError('connection_error', 'OpenAI APIへ接続できませんでした。')
  }

  const payload = await response.json().catch(() => null) as (T & OpenAIErrorResponse) | null
  if (!response.ok) {
    const [code, message] = errorDetails(response.status, payload)
    throw new AiTranslationClientError(code, message)
  }
  if (!payload) throw new AiTranslationClientError('invalid_response', 'AIの応答を読み取れませんでした。もう一度お試しください。')
  return { payload, requestId: response.headers.get('x-request-id') ?? undefined }
}

function outputText(response: OpenAIResponse) {
  if (typeof response.output_text === 'string') return response.output_text
  return response.output
    ?.flatMap((item) => item.type === 'message' ? item.content ?? [] : [])
    .filter((item) => item.type === 'output_text' && typeof item.text === 'string')
    .map((item) => item.text)
    .join('') ?? ''
}

export async function testAiConnection(apiKey: string, signal?: AbortSignal): Promise<AiConnectionTestResponse> {
  const { payload } = await openAiRequest<{ data?: Array<{ id?: string }> }>('/models', apiKey, { method: 'GET' }, signal)
  return { available: Array.isArray(payload.data), model: OPENAI_MODEL }
}

export async function requestAiTranslation(apiKey: string, input: AiTranslationRequest, signal?: AbortSignal): Promise<AiTranslationResponse> {
  const { payload, requestId } = await openAiRequest<OpenAIResponse>('/responses', apiKey, {
    method: 'POST',
    body: JSON.stringify({
      model: OPENAI_MODEL,
      instructions: TRANSLATION_SYSTEM_PROMPT,
      input: buildTranslationPrompt(input),
      store: false,
      text: {
        format: {
          type: 'json_schema',
          name: 'ai_translation_response',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              translation: { type: 'string' },
              warnings: { type: 'array', items: { type: 'string' } },
            },
            required: ['translation', 'warnings'],
          },
        },
      },
    }),
  }, signal)

  let parsed: unknown
  try { parsed = JSON.parse(outputText(payload)) } catch { throw new AiTranslationClientError('invalid_response', 'AIの応答を読み取れませんでした。もう一度お試しください。') }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new AiTranslationClientError('invalid_response', 'AIの応答を読み取れませんでした。もう一度お試しください。')
  const result = parsed as Record<string, unknown>
  if (typeof result.translation !== 'string' || !Array.isArray(result.warnings) || result.warnings.some((warning) => typeof warning !== 'string')) {
    throw new AiTranslationClientError('invalid_response', 'AIの応答を読み取れませんでした。もう一度お試しください。')
  }
  return { translation: result.translation, warnings: result.warnings as string[], requestId }
}

export { OPENAI_MODEL }
