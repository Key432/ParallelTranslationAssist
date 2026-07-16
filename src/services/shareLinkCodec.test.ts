import { MAX_SHARED_JSON_BYTES } from '../domain/sharedProject'
import type { Project, SharedProjectV1 } from '../types'
import { buildProjectShareUrl, classifyShareUrlLength, decodeSharePayload, encodeSharePayload, parseShareFragment } from './shareLinkCodec'

const shared: SharedProjectV1 = {
  v: 1, t: '多言語 📚', ol: 'JAPANESE', tl: 'KOREAN', st: '翻訳中',
  s: '日本語 中文 한국어 😀', tr: [[0, 3, 'Japanese 日本語']], k: [['中文', '중국어']],
}

describe('share link codec', () => {
  beforeAll(() => {
    const { CompressionStream: NodeCompressionStream, DecompressionStream: NodeDecompressionStream } = jest.requireActual('node:stream/web')
    const { Blob: NodeBlob } = jest.requireActual('node:buffer')
    const { TextDecoder: NodeTextDecoder, TextEncoder: NodeTextEncoder } = jest.requireActual('node:util')
    Object.defineProperty(globalThis, 'CompressionStream', { configurable: true, value: NodeCompressionStream })
    Object.defineProperty(globalThis, 'DecompressionStream', { configurable: true, value: NodeDecompressionStream })
    Object.defineProperty(globalThis, 'Blob', { configurable: true, value: NodeBlob })
    Object.defineProperty(globalThis, 'TextEncoder', { configurable: true, value: NodeTextEncoder })
    Object.defineProperty(globalThis, 'TextDecoder', { configurable: true, value: NodeTextDecoder })
  })

  test('round trips Unicode through gzip and Base64URL', async () => {
    const payload = await encodeSharePayload(shared)
    expect(payload).not.toMatch(/[+/=]/)
    expect(await decodeSharePayload(payload)).toEqual(shared)
  })

  test('builds from the current origin, path, and query without retaining the old fragment', async () => {
    const project: Project = {
      id: 'private', title: shared.t, author: '', sourceUrl: '', originalLanguage: shared.ol,
      translatedLanguage: shared.tl, status: shared.st, source: shared.s,
      translations: [{ id: 'private-translation', start: 0, end: 3, source: '日本語', translated: 'Japanese 日本語' }],
      keywords: [{ id: 'private-keyword', source: '中文', translated: '중국어' }], updatedAt: 'private-time',
    }
    const result = await buildProjectShareUrl(project, 'https://example.com/sub/app/?mode=x#old')
    expect(result.url).toMatch(/^https:\/\/example\.com\/sub\/app\/\?mode=x#share=v1\./)
    expect(result.url).not.toContain(encodeURIComponent(shared.s))
    expect(parseShareFragment(new URL(result.url).hash)).not.toBeNull()
    expect(await decodeSharePayload(parseShareFragment(new URL(result.url).hash) as string)).toEqual(shared)
  })

  test.each([[8000, 'available'], [8001, 'warning'], [12000, 'warning'], [12001, 'too_large']] as const)(
    'classifies URL length %i as %s', (length, status) => expect(classifyShareUrlLength(length)).toBe(status),
  )

  test('rejects invalid payloads and decompressed JSON larger than 1 MB', async () => {
    await expect(decodeSharePayload('not.valid')).rejects.toThrow()
    const oversized = { ...shared, s: 'x'.repeat(MAX_SHARED_JSON_BYTES + 1), tr: [] }
    await expect(decodeSharePayload(await encodeSharePayload(oversized))).rejects.toThrow('上限')
  })
})
