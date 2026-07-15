import type { Translation } from '../types'

export type ReaderRow = {
  id: string
  source: string
  translated: string
  translatedRow: boolean
}

export type SourceSegment = {
  id: string
  text: string
  translated: boolean
}

export function sortTranslations(translations: Translation[]): Translation[] {
  return [...translations].sort((a, b) => a.start - b.start)
}

export function overlapsTranslation(start: number, end: number, translations: Translation[]): boolean {
  return findOverlappingTranslations(start, end, translations).length > 0
}

export function findExactTranslation(start: number, end: number, translations: Translation[]): Translation | undefined {
  return translations.find((translation) => translation.start === start && translation.end === end)
}

export function findOverlappingTranslations(start: number, end: number, translations: Translation[]): Translation[] {
  return translations.filter((translation) => start < translation.end && end > translation.start)
}

export function updateTranslationText(translations: Translation[], id: string, translated: string): Translation[] {
  return translations.map((translation) => translation.id === id ? { ...translation, translated } : translation)
}

export function buildSourceSegments(source: string, translations: Translation[]): SourceSegment[] {
  const segments: SourceSegment[] = []
  let cursor = 0

  sortTranslations(translations).forEach((translation) => {
    const start = Math.max(cursor, Math.min(translation.start, source.length))
    const end = Math.max(start, Math.min(translation.end, source.length))
    if (start > cursor) segments.push({ id: `plain-${translation.id}`, text: source.slice(cursor, start), translated: false })
    if (end > start) segments.push({ id: translation.id, text: source.slice(start, end), translated: true })
    cursor = end
  })

  if (cursor < source.length) segments.push({ id: 'plain-last', text: source.slice(cursor), translated: false })
  return segments
}

export function buildReaderRows(source: string, translations: Translation[]): ReaderRow[] {
  const rows: ReaderRow[] = []
  let cursor = 0

  sortTranslations(translations).forEach((item) => {
    const before = source.slice(cursor, item.start).trim()
    if (before) rows.push({ id: `gap-${item.id}`, source: before, translated: '—', translatedRow: false })
    rows.push({ id: item.id, source: item.source, translated: item.translated, translatedRow: true })
    cursor = item.end
  })

  const after = source.slice(cursor).trim()
  if (after) rows.push({ id: 'gap-last', source: after, translated: '—', translatedRow: false })
  return rows
}
