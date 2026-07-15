import { buildReaderRows, buildSourceSegments, findExactTranslation, findOverlappingTranslations, mergeTranslationTexts, overlapsTranslation, sortTranslations, updateTranslationText } from './translations'
import type { Translation } from '../types'

const translations: Translation[] = [
  { id: 'second', start: 13, end: 19, source: 'Second', translated: '二番目' },
  { id: 'first', start: 0, end: 5, source: 'First', translated: '最初' },
]

describe('translation domain', () => {
  test('translations are sorted without mutating the input', () => {
    const sorted = sortTranslations(translations)
    expect(sorted.map((item) => item.id)).toEqual(['first', 'second'])
    expect(translations.map((item) => item.id)).toEqual(['second', 'first'])
  })

  test.each([
    [1, 3, true],
    [5, 13, false],
    [18, 20, true],
    [19, 22, false],
  ])('detects overlap for range %i-%i', (start, end, expected) => {
    expect(overlapsTranslation(start, end, translations)).toBe(expected)
  })

  test('distinguishes an exact match from partial overlaps', () => {
    expect(findExactTranslation(0, 5, translations)?.id).toBe('first')
    expect(findExactTranslation(0, 6, translations)).toBeUndefined()
    expect(findOverlappingTranslations(0, 14, translations).map((item) => item.id)).toEqual(['second', 'first'])
  })

  test('builds translated and untranslated reader rows in source order', () => {
    const rows = buildReaderRows('First gap123 Second tail', translations)
    expect(rows.map((row) => [row.source, row.translatedRow])).toEqual([
      ['First', true],
      ['gap123', false],
      ['Second', true],
      ['tail', false],
    ])
  })

  test('builds source segments that mark registered translation ranges', () => {
    const segments = buildSourceSegments('First gap123 Second tail', translations)
    expect(segments.map(({ text, translated }) => [text, translated])).toEqual([
      ['First', true],
      [' gap123 ', false],
      ['Second', true],
      [' tail', false],
    ])
  })

  test('updates only the requested translation text', () => {
    const updated = updateTranslationText(translations, 'first', '更新した訳文')
    expect(updated.find((item) => item.id === 'first')).toEqual({ ...translations[1], translated: '更新した訳文' })
    expect(updated.find((item) => item.id === 'second')).toBe(translations[0])
  })

  test('merges translation texts in source order with paragraph breaks', () => {
    expect(mergeTranslationTexts(translations)).toBe('最初\n\n二番目')
  })
})
