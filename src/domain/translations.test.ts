import { buildReaderRows, buildSourceSegments, calculateTextEdit, findExactTranslation, findOverlappingTranslations, findTranslationsAffectedByEdit, mergeTranslationTexts, overlapsTranslation, reconcileTranslationsAfterEdit, sortTranslations, updateTranslationText } from './translations'
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

  test('splits source segments around the active selection', () => {
    const segments = buildSourceSegments(
      'First gap123 Second tail',
      translations,
      { start: 6, end: 20, text: 'gap123 Second ' },
    )
    expect(segments.filter(({ selected }) => selected).map(({ text, translated }) => [text, translated])).toEqual([
      ['gap123 ', false],
      ['Second', true],
      [' ', false],
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

  test('calculates the minimal replaced source range', () => {
    expect(calculateTextEdit('Hello world', 'Hello brave world')).toEqual({ start: 6, end: 6, insertedText: 'brave ' })
    expect(calculateTextEdit('Hello world', 'Hallo world')).toEqual({ start: 1, end: 2, insertedText: 'a' })
  })

  test('distinguishes edits inside translations from edits at their boundaries', () => {
    const hello: Translation = { id: 'hello', start: 0, end: 5, source: 'Hello', translated: 'こんにちは' }
    expect(findTranslationsAffectedByEdit({ start: 2, end: 2, insertedText: 'x' }, [hello])).toEqual([hello])
    expect(findTranslationsAffectedByEdit({ start: 0, end: 0, insertedText: 'x' }, [hello])).toEqual([])
    expect(findTranslationsAffectedByEdit({ start: 5, end: 5, insertedText: 'x' }, [hello])).toEqual([])
  })

  test('discards only affected translations and shifts later ranges', () => {
    const edit = calculateTextEdit('First gap123 Second', 'Changed gap123 Second')
    const reconciled = reconcileTranslationsAfterEdit('Changed gap123 Second', edit, translations, 'discard')
    expect(reconciled).toEqual([{ ...translations[0], start: 15, end: 21 }])
  })

  test('keeps affected translations by updating their source range', () => {
    const hello: Translation = { id: 'hello', start: 0, end: 5, source: 'Hello', translated: 'こんにちは' }
    const nextSource = 'Hallo world'
    const reconciled = reconcileTranslationsAfterEdit(nextSource, calculateTextEdit('Hello world', nextSource), [hello], 'keep')
    expect(reconciled).toEqual([{ ...hello, source: 'Hallo' }])
  })
})
