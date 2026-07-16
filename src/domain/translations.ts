import { findKeywordMatches } from './keywords'
import type { Selection, Translation, TranslationKeyword } from '../types'

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
  selected: boolean
  keyword: TranslationKeyword | null
}

export type TextEdit = {
  start: number
  end: number
  insertedText: string
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

export function mergeTranslationTexts(translations: Translation[]): string {
  return sortTranslations(translations)
    .map((translation) => translation.translated.trim())
    .filter(Boolean)
    .join('\n\n')
}

export function calculateTextEdit(previous: string, next: string): TextEdit {
  let start = 0
  const sharedLength = Math.min(previous.length, next.length)
  while (start < sharedLength && previous[start] === next[start]) start += 1

  let suffixLength = 0
  while (
    suffixLength < previous.length - start
    && suffixLength < next.length - start
    && previous[previous.length - 1 - suffixLength] === next[next.length - 1 - suffixLength]
  ) {
    suffixLength += 1
  }

  return {
    start,
    end: previous.length - suffixLength,
    insertedText: next.slice(start, next.length - suffixLength),
  }
}

export function findTranslationsAffectedByEdit(edit: TextEdit, translations: Translation[]): Translation[] {
  if (edit.start === edit.end) {
    return translations.filter((translation) => translation.start < edit.start && edit.start < translation.end)
  }
  return translations.filter((translation) => edit.start < translation.end && edit.end > translation.start)
}

export function reconcileTranslationsAfterEdit(
  nextSource: string,
  edit: TextEdit,
  translations: Translation[],
  strategy: 'discard' | 'keep',
): Translation[] {
  const affectedIds = new Set(findTranslationsAffectedByEdit(edit, translations).map((translation) => translation.id))
  const delta = edit.insertedText.length - (edit.end - edit.start)

  return translations
    .filter((translation) => strategy === 'keep' || !affectedIds.has(translation.id))
    .map((translation) => {
      let start = translation.start
      let end = translation.end

      if (start >= edit.end) start += delta
      else if (start >= edit.start) start = edit.start

      if (end <= edit.start) {
        // The translation is entirely before the edit.
      } else if (end <= edit.end) end = edit.start + edit.insertedText.length
      else end += delta

      return { ...translation, start, end, source: nextSource.slice(start, end) }
    })
}

export function buildSourceSegments(source: string, translations: Translation[], selection?: Selection | null, keywords: TranslationKeyword[] = []): SourceSegment[] {
  const clamp = (position: number) => Math.max(0, Math.min(position, source.length))
  const boundaries = new Set([0, source.length])
  const keywordMatches = findKeywordMatches(source, keywords)
  translations.forEach((translation) => {
    boundaries.add(clamp(translation.start))
    boundaries.add(clamp(translation.end))
  })
  if (selection) {
    boundaries.add(clamp(selection.start))
    boundaries.add(clamp(selection.end))
  }
  keywordMatches.forEach((match) => {
    boundaries.add(match.start)
    boundaries.add(match.end)
  })

  const positions = [...boundaries].sort((left, right) => left - right)
  return positions.slice(0, -1).flatMap((start, index) => {
    const end = positions[index + 1]
    if (end <= start) return []
    return [{
      id: `source-${start}-${end}`,
      text: source.slice(start, end),
      translated: translations.some((translation) => translation.start < end && translation.end > start),
      selected: Boolean(selection && selection.start < end && selection.end > start),
      keyword: keywordMatches.find((match) => match.start <= start && match.end >= end)?.keyword ?? null,
    }]
  })
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
