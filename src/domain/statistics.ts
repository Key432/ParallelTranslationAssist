import type { Project } from '../types'

export type ProjectStatistics = {
  sourceWordCount: number
  sourceCharacterCount: number
  translationCount: number
  translatedPercentage: number
  translatedWordCount: number
  untranslatedWordCount: number
  translatedTextCharacterCount: number
}

type TextRange = { start: number; end: number }

const WORD_PATTERN = /[\p{L}\p{N}]+(?:['’\u2010-\u2015-][\p{L}\p{N}]+)*/gu

function mergedTranslationRanges(project: Project): TextRange[] {
  const ranges = project.translations
    .map(({ start, end }) => ({
      start: Math.max(0, Math.min(project.source.length, start)),
      end: Math.max(0, Math.min(project.source.length, end)),
    }))
    .filter(({ start, end }) => end > start)
    .sort((left, right) => left.start - right.start || left.end - right.end)

  return ranges.reduce<TextRange[]>((merged, range) => {
    const previous = merged.at(-1)
    if (!previous || range.start > previous.end) {
      merged.push({ ...range })
    } else {
      previous.end = Math.max(previous.end, range.end)
    }
    return merged
  }, [])
}

export function calculateProjectStatistics(project: Project): ProjectStatistics {
  const ranges = mergedTranslationRanges(project)
  const words = [...project.source.matchAll(WORD_PATTERN)].map((match) => ({
    start: match.index,
    end: match.index + match[0].length,
  }))
  const translatedWordCount = words.filter((word) => ranges.some(
    (range) => range.start <= word.start && word.end <= range.end,
  )).length

  return {
    sourceWordCount: words.length,
    sourceCharacterCount: project.source.length,
    translationCount: project.translations.length,
    translatedPercentage: words.length === 0
      ? 0
      : Math.round((translatedWordCount / words.length) * 1000) / 10,
    translatedWordCount,
    untranslatedWordCount: words.length - translatedWordCount,
    translatedTextCharacterCount: project.translations.reduce(
      (sum, translation) => sum + translation.translated.length,
      0,
    ),
  }
}
