import { requestAiTranslation, testAiConnection } from './aiTranslationClient'

function jsonResponse(payload: unknown, status = 200, requestId: string | null = null) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => name.toLowerCase() === 'x-request-id' ? requestId : null },
    json: async () => payload,
  }
}

describe('aiTranslationClient', () => {
  test('checks the key directly against the OpenAI models endpoint', async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse({ object: 'list', data: [{ id: 'gpt-5-mini' }] }))
    Object.defineProperty(globalThis, 'fetch', { configurable: true, value: fetchMock })

    await expect(testAiConnection('secret-key')).resolves.toEqual({ available: true, model: 'gpt-5-mini' })

    expect(fetchMock).toHaveBeenCalledWith('https://api.openai.com/v1/models', expect.objectContaining({
      method: 'GET',
      headers: { Authorization: 'Bearer secret-key' },
    }))
  })

  test('sends only the built translation input directly to the Responses API', async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse({
      output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ translation: '訳', warnings: [] }) }] }],
    }, 200, 'req_test'))
    Object.defineProperty(globalThis, 'fetch', { configurable: true, value: fetchMock })
    const input = {
      sourceText: 'A rabbit.',
      sourceLanguage: 'ENGLISH' as const,
      targetLanguage: 'JAPANESE' as const,
      glossary: [{ source: 'rabbit', translated: '兎' }],
    }

    await expect(requestAiTranslation('secret-key', input)).resolves.toEqual({ translation: '訳', warnings: [], requestId: 'req_test' })

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.openai.com/v1/responses')
    expect(options.headers).toEqual({ Authorization: 'Bearer secret-key', 'Content-Type': 'application/json' })
    const body = JSON.parse(options.body)
    expect(JSON.parse(body.input)).toEqual(input)
    expect(body.instructions).toContain('原語（source）と使用推奨訳語（translated）のセット')
    expect(body).not.toHaveProperty('apiKey')
    expect(body.input).not.toContain('contextBefore')
    expect(body.input).not.toContain('contextAfter')
  })
})
