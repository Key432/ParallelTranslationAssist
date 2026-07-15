import { buildReaderRows, overlapsTranslation, sortTranslations } from './translations'
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

  test('builds translated and untranslated reader rows in source order', () => {
    const rows = buildReaderRows('First gap123 Second tail', translations)
    expect(rows.map((row) => [row.source, row.translatedRow])).toEqual([
      ['First', true],
      ['gap123', false],
      ['Second', true],
      ['tail', false],
    ])
  })
})
