import { isProjectLanguage, isProjectStatus } from './projects'
import type { Project, SharedProjectV1 } from '../types'

export const MAX_SHARED_JSON_BYTES = 1024 * 1024
export const MAX_SHARED_TRANSLATIONS = 10_000
export const MAX_SHARED_KEYWORDS = 5_000

const SHARED_KEYS = new Set(['v', 't', 'a', 'u', 'ol', 'tl', 'st', 's', 'tr', 'k'])

export function buildSharedProject(project: Project): SharedProjectV1 {
  return {
    v: 1,
    t: project.title,
    ...(project.author ? { a: project.author } : {}),
    ...(project.sourceUrl ? { u: project.sourceUrl } : {}),
    ol: project.originalLanguage,
    tl: project.translatedLanguage,
    st: project.status,
    s: project.source,
    tr: project.translations.map(({ start, end, translated }) => [start, end, translated]),
    k: project.keywords.map(({ source, translated }) => [source, translated]),
  }
}

function validSourceUrl(value: string): boolean {
  if (!value) return true
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function parseSharedProject(value: unknown): SharedProjectV1 {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('共有データがオブジェクトではありません。')
  const record = value as Record<string, unknown>
  if (Object.keys(record).some((key) => !SHARED_KEYS.has(key))) throw new Error('共有データに未知の項目があります。')
  if (record.v !== 1) throw new Error('共有データのバージョンに対応していません。')
  if (typeof record.t !== 'string' || !record.t.trim()) throw new Error('タイトルが不正です。')
  if (record.a !== undefined && typeof record.a !== 'string') throw new Error('著者が不正です。')
  if (record.u !== undefined && (typeof record.u !== 'string' || !validSourceUrl(record.u))) throw new Error('出典URLが不正です。')
  if (!isProjectLanguage(record.ol) || !isProjectLanguage(record.tl)) throw new Error('言語が不正です。')
  if (!isProjectStatus(record.st)) throw new Error('ステータスが不正です。')
  if (typeof record.s !== 'string') throw new Error('原文が不正です。')
  if (!Array.isArray(record.tr) || record.tr.length > MAX_SHARED_TRANSLATIONS) throw new Error('対訳件数が不正です。')
  if (!Array.isArray(record.k) || record.k.length > MAX_SHARED_KEYWORDS) throw new Error('キーワード件数が不正です。')

  const translations = record.tr.map((item) => {
    if (!Array.isArray(item) || item.length !== 3) throw new Error('対訳の形式が不正です。')
    const [start, end, translated] = item
    if (!Number.isInteger(start) || !Number.isInteger(end)
      || (start as number) < 0 || (start as number) >= (end as number)
      || (end as number) > (record.s as string).length
      || typeof translated !== 'string') throw new Error('対訳の範囲が不正です。')
    return [start, end, translated] as SharedProjectV1['tr'][number]
  }).sort((left, right) => left[0] - right[0] || left[1] - right[1])
  if (translations.some((translation, index) => index > 0 && translations[index - 1][1] > translation[0])) {
    throw new Error('対訳の範囲が重複しています。')
  }

  const keywords = record.k.map((item) => {
    if (!Array.isArray(item) || item.length !== 2 || typeof item[0] !== 'string' || !item[0].trim()
      || typeof item[1] !== 'string' || !item[1].trim()) throw new Error('キーワードが不正です。')
    return [item[0], item[1]] as SharedProjectV1['k'][number]
  })

  return {
    v: 1,
    t: record.t,
    ...(record.a === undefined ? {} : { a: record.a }),
    ...(record.u === undefined ? {} : { u: record.u }),
    ol: record.ol,
    tl: record.tl,
    st: record.st,
    s: record.s,
    tr: translations,
    k: keywords,
  }
}

export function restoreSharedProject(shared: SharedProjectV1, now = new Date().toISOString()): Project {
  return {
    id: crypto.randomUUID(),
    title: shared.t,
    author: shared.a ?? '',
    sourceUrl: shared.u ?? '',
    originalLanguage: shared.ol,
    translatedLanguage: shared.tl,
    status: shared.st,
    source: shared.s,
    translations: shared.tr.map(([start, end, translated]) => ({
      id: crypto.randomUUID(), start, end, source: shared.s.slice(start, end), translated,
    })),
    keywords: shared.k.map(([source, translated]) => ({ id: crypto.randomUUID(), source, translated })),
    updatedAt: now,
  }
}
