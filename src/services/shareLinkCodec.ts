import { MAX_SHARED_JSON_BYTES, parseSharedProject } from '../domain/sharedProject'
import type { Project, SharedProjectV1 } from '../types'
import { buildSharedProject } from '../domain/sharedProject'

export type ShareUrlStatus = 'available' | 'warning' | 'too_large'

export function supportsShareLinks(): boolean {
  return typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined'
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlToBytes(value: string): Uint8Array {
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('共有ペイロードが不正です。')
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4)
  const binary = atob(padded)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

async function readWithLimit(stream: ReadableStream<Uint8Array>, limit: number): Promise<Uint8Array> {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > limit) {
      await reader.cancel()
      throw new Error('展開後の共有データが上限を超えています。')
    }
    chunks.push(value)
  }
  const result = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength }
  return result
}

export async function encodeSharePayload(shared: SharedProjectV1): Promise<string> {
  if (!supportsShareLinks()) throw new Error('この環境は共有リンクに対応していません。')
  const json = new TextEncoder().encode(JSON.stringify(shared))
  const jsonBuffer = json.buffer.slice(json.byteOffset, json.byteOffset + json.byteLength) as ArrayBuffer
  const compressed = await readWithLimit(new Blob([jsonBuffer]).stream().pipeThrough(new CompressionStream('gzip')), Number.MAX_SAFE_INTEGER)
  return bytesToBase64Url(compressed)
}

export async function decodeSharePayload(payload: string): Promise<SharedProjectV1> {
  if (!supportsShareLinks()) throw new Error('この環境は共有リンクに対応していません。')
  const compressed = base64UrlToBytes(payload)
  const compressedBuffer = compressed.buffer.slice(compressed.byteOffset, compressed.byteOffset + compressed.byteLength) as ArrayBuffer
  const bytes = await readWithLimit(new Blob([compressedBuffer]).stream().pipeThrough(new DecompressionStream('gzip')), MAX_SHARED_JSON_BYTES)
  let parsed: unknown
  try { parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) } catch { throw new Error('共有データを読み取れません。') }
  return parseSharedProject(parsed)
}

export function classifyShareUrlLength(length: number): ShareUrlStatus {
  if (length <= 8000) return 'available'
  if (length <= 12000) return 'warning'
  return 'too_large'
}

export function parseShareFragment(hash: string): string | null {
  return hash.startsWith('#share=v1.') ? hash.slice('#share=v1.'.length) : null
}

export async function buildProjectShareUrl(project: Project, baseUrl: string): Promise<{ url: string; length: number; status: ShareUrlStatus }> {
  const current = new URL(baseUrl)
  const base = `${current.origin}${current.pathname}${current.search}`
  const payload = await encodeSharePayload(buildSharedProject(project))
  const url = `${base}#share=v1.${payload}`
  return { url, length: url.length, status: classifyShareUrlLength(url.length) }
}
