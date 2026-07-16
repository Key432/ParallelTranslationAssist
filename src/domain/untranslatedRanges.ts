import type { TextRange, Translation } from '../types'

function clampPosition(position: number, sourceLength: number): number {
  if (!Number.isFinite(position)) return 0
  return Math.max(0, Math.min(Math.trunc(position), sourceLength))
}

export function normalizeTranslationRanges(sourceLength: number, translations: Translation[]): TextRange[] {
  const normalized = translations
    .map((translation) => {
      const first = clampPosition(translation.start, sourceLength)
      const second = clampPosition(translation.end, sourceLength)
      return { start: Math.min(first, second), end: Math.max(first, second) }
    })
    .filter((range) => range.end > range.start)
    .sort((left, right) => left.start - right.start || left.end - right.end)

  return normalized.reduce<TextRange[]>((merged, range) => {
    const previous = merged.at(-1)
    if (!previous || range.start > previous.end) {
      merged.push({ ...range })
    } else {
      previous.end = Math.max(previous.end, range.end)
    }
    return merged
  }, [])
}

function trimWhitespace(source: string, range: TextRange): TextRange | null {
  let { start, end } = range
  while (start < end && /\s/u.test(source[start])) start += 1
  while (end > start && /\s/u.test(source[end - 1])) end -= 1
  return end > start ? { start, end } : null
}

export function buildUntranslatedRanges(source: string, translations: Translation[]): TextRange[] {
  const translatedRanges = normalizeTranslationRanges(source.length, translations)
  const gaps: TextRange[] = []
  let cursor = 0

  translatedRanges.forEach((range) => {
    if (range.start > cursor) gaps.push({ start: cursor, end: range.start })
    cursor = Math.max(cursor, range.end)
  })
  if (cursor < source.length) gaps.push({ start: cursor, end: source.length })

  return gaps.flatMap((range) => {
    const trimmed = trimWhitespace(source, range)
    return trimmed ? [trimmed] : []
  })
}

function sortedRanges(ranges: TextRange[]): TextRange[] {
  return ranges
    .filter((range) => Number.isFinite(range.start) && Number.isFinite(range.end) && range.end > range.start)
    .slice()
    .sort((left, right) => left.start - right.start || left.end - right.end)
}

export function findNextUntranslatedRange(ranges: TextRange[], position: number): TextRange | null {
  const ordered = sortedRanges(ranges)
  if (ordered.length === 0) return null
  const current = Number.isFinite(position) ? position : 0
  return ordered.find((range) => range.start >= current) ?? ordered[0]
}

export function findPreviousUntranslatedRange(ranges: TextRange[], position: number): TextRange | null {
  const ordered = sortedRanges(ranges)
  if (ordered.length === 0) return null
  const current = Number.isFinite(position) ? position : 0
  for (let index = ordered.length - 1; index >= 0; index -= 1) {
    if (ordered[index].end <= current) return ordered[index]
  }
  return ordered.at(-1) ?? null
}
