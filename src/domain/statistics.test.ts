import { calculateProjectStatistics } from './statistics'
import type { Project } from '../types'

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    title: 'Sample',
    status: '翻訳中',
    source: 'Hello brave world',
    translations: [
      { id: 'one', start: 0, end: 5, source: 'Hello', translated: 'こんにちは' },
      { id: 'two', start: 12, end: 17, source: 'world', translated: '世界' },
    ],
    updatedAt: '2026-07-16T01:00:00.000Z',
    ...overrides,
  }
}

describe('calculateProjectStatistics', () => {
  it('calculates every project statistic', () => {
    expect(calculateProjectStatistics(project())).toEqual({
      sourceWordCount: 3,
      sourceCharacterCount: 17,
      translationCount: 2,
      translatedPercentage: 66.7,
      translatedWordCount: 2,
      untranslatedWordCount: 1,
      translatedTextCharacterCount: 7,
    })
  })

  it('does not double-count overlapping or out-of-bounds translated ranges', () => {
    const stats = calculateProjectStatistics(project({
      source: 'one two',
      translations: [
        { id: 'one', start: -4, end: 4, source: 'one ', translated: '一' },
        { id: 'two', start: 2, end: 99, source: 'e two', translated: '二' },
      ],
    }))

    expect(stats.translatedPercentage).toBe(100)
    expect(stats.translatedWordCount).toBe(2)
  })

  it('reports 100 percent when every word is translated even if whitespace remains outside ranges', () => {
    const stats = calculateProjectStatistics(project({
      source: 'one\n\ntwo\n',
      translations: [
        { id: 'one', start: 0, end: 3, source: 'one', translated: '一' },
        { id: 'two', start: 5, end: 8, source: 'two', translated: '二' },
      ],
    }))

    expect(stats.sourceWordCount).toBe(2)
    expect(stats.translatedWordCount).toBe(2)
    expect(stats.untranslatedWordCount).toBe(0)
    expect(stats.translatedPercentage).toBe(100)
  })

  it('returns zero values for an empty project', () => {
    expect(calculateProjectStatistics(project({ source: '', translations: [] }))).toEqual({
      sourceWordCount: 0,
      sourceCharacterCount: 0,
      translationCount: 0,
      translatedPercentage: 0,
      translatedWordCount: 0,
      untranslatedWordCount: 0,
      translatedTextCharacterCount: 0,
    })
  })

  it('counts apostrophes and hyphenated terms as single words', () => {
    const stats = calculateProjectStatistics(project({ source: "don't state-of-the-art", translations: [] }))
    expect(stats.sourceWordCount).toBe(2)
  })
})
