import { buildUntranslatedRanges, findNextUntranslatedRange, findPreviousUntranslatedRange, normalizeTranslationRanges } from './untranslatedRanges'
import type { Translation } from '../types'

const translation = (start: number, end: number, id = `${start}-${end}`): Translation => ({
  id,
  start,
  end,
  source: '',
  translated: '訳',
})

describe('buildUntranslatedRanges', () => {
  test('returns the whole source without surrounding whitespace when there are no translations', () => {
    expect(buildUntranslatedRanges(' \nHello world\t ', [])).toEqual([{ start: 2, end: 13 }])
  })

  test('finds untranslated ranges at the beginning, between translations, and at the end', () => {
    const source = 'First Second Third Fourth Fifth'
    expect(buildUntranslatedRanges(source, [translation(6, 12), translation(19, 25)])).toEqual([
      { start: 0, end: 5 },
      { start: 13, end: 18 },
      { start: 26, end: 31 },
    ])
  })

  test('excludes gaps containing only whitespace and newlines', () => {
    expect(buildUntranslatedRanges('Hello \n\t world', [translation(0, 5), translation(9, 14)])).toEqual([])
  })

  test('merges adjacent and overlapping translated ranges', () => {
    expect(normalizeTranslationRanges(12, [translation(0, 3), translation(3, 6), translation(5, 9)])).toEqual([
      { start: 0, end: 9 },
    ])
    expect(buildUntranslatedRanges('Hello world!', [translation(0, 3), translation(3, 6), translation(5, 9)])).toEqual([
      { start: 9, end: 12 },
    ])
  })

  test('clamps out-of-source and reversed ranges safely', () => {
    expect(normalizeTranslationRanges(10, [translation(-5, 4), translation(20, 7), translation(Number.NaN, 0)])).toEqual([
      { start: 0, end: 4 },
      { start: 7, end: 10 },
    ])
    expect(buildUntranslatedRanges('0123456789', [translation(-5, 4), translation(20, 7)])).toEqual([{ start: 4, end: 7 }])
  })

  test('returns no ranges when all non-whitespace source text is translated', () => {
    expect(buildUntranslatedRanges(' Hello \n', [translation(1, 6)])).toEqual([])
  })
})

describe('untranslated range navigation', () => {
  const ranges = [{ start: 2, end: 5 }, { start: 10, end: 14 }, { start: 20, end: 25 }]

  test('finds the next range and wraps from the end to the beginning', () => {
    expect(findNextUntranslatedRange(ranges, 5)).toEqual({ start: 10, end: 14 })
    expect(findNextUntranslatedRange(ranges, 25)).toEqual({ start: 2, end: 5 })
  })

  test('finds the previous range and wraps from the beginning to the end', () => {
    expect(findPreviousUntranslatedRange(ranges, 20)).toEqual({ start: 10, end: 14 })
    expect(findPreviousUntranslatedRange(ranges, 0)).toEqual({ start: 20, end: 25 })
  })

  test('returns null when there are no untranslated ranges', () => {
    expect(findNextUntranslatedRange([], 0)).toBeNull()
    expect(findPreviousUntranslatedRange([], 0)).toBeNull()
  })
})
