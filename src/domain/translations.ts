import type { Translation } from '../types'

export type ReaderRow = {
  id: string
  source: string
  translated: string
  translatedRow: boolean
}

export function sortTranslations(translations: Translation[]): Translation[] {
  return [...translations].sort((a, b) => a.start - b.start)
}

export function overlapsTranslation(start: number, end: number, translations: Translation[]): boolean {
  return translations.some((item) => start < item.end && end > item.start)
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
