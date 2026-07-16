import type { TranslationKeyword } from '../types'

export type KeywordMatch = {
  start: number
  end: number
  keyword: TranslationKeyword
}

const WORD_CHARACTER = /[\p{L}\p{N}_]/u

function hasWordBoundary(source: string, start: number, end: number, term: string): boolean {
  const startsWithWord = WORD_CHARACTER.test(term[0] ?? '')
  const endsWithWord = WORD_CHARACTER.test(term[term.length - 1] ?? '')
  const before = source[start - 1]
  const after = source[end]
  return (!startsWithWord || !before || !WORD_CHARACTER.test(before))
    && (!endsWithWord || !after || !WORD_CHARACTER.test(after))
}

export function findKeywordMatches(source: string, keywords: TranslationKeyword[]): KeywordMatch[] {
  const candidates: KeywordMatch[] = []
  keywords.forEach((keyword) => {
    const term = keyword.source.trim()
    if (!term) return
    let cursor = 0
    while (cursor <= source.length - term.length) {
      const start = source.indexOf(term, cursor)
      if (start < 0) break
      const end = start + term.length
      if (hasWordBoundary(source, start, end, term)) candidates.push({ start, end, keyword })
      cursor = start + Math.max(1, term.length)
    }
  })

  candidates.sort((left, right) => left.start - right.start || (right.end - right.start) - (left.end - left.start))
  const matches: KeywordMatch[] = []
  candidates.forEach((candidate) => {
    if (matches.some((match) => candidate.start < match.end && candidate.end > match.start)) return
    matches.push(candidate)
  })
  return matches
}
