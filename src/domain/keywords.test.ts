import { findKeywordMatches } from './keywords'

describe('translation keywords', () => {
  test('finds exact whole-word matches without matching inside another word', () => {
    const matches = findKeywordMatches('cat concatenate cat', [{ id: 'cat', source: 'cat', translated: '猫' }])
    expect(matches.map(({ start, end }) => [start, end])).toEqual([[0, 3], [16, 19]])
  })

  test('prefers the longest keyword when registered terms overlap', () => {
    const matches = findKeywordMatches('New York', [
      { id: 'new', source: 'New', translated: '新しい' },
      { id: 'new-york', source: 'New York', translated: 'ニューヨーク' },
    ])
    expect(matches).toHaveLength(1)
    expect(matches[0].keyword.id).toBe('new-york')
  })
})
