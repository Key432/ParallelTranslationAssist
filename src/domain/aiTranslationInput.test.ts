import { buildAiTranslationRequest, extractAiGlossary } from './aiTranslationInput'

const keywords = [
  { id: 'inside', source: 'rabbit', translated: '兎' },
  { id: 'outside', source: 'garden', translated: '庭' },
  { id: 'duplicate', source: 'rabbit', translated: 'ウサギ' },
]

describe('AI translation input', () => {
  test('uses only the exact selected text without preceding or following source', () => {
    const fullSource = 'BEFORE\nSelected rabbit.\nAFTER'
    const selectedText = 'Selected rabbit.'
    const start = fullSource.indexOf(selectedText)
    const request = buildAiTranslationRequest(
      { start, end: start + selectedText.length, text: selectedText },
      'ENGLISH',
      'JAPANESE',
      keywords,
    )
    expect(request.sourceText).toBe(selectedText)
    expect(JSON.stringify(request)).not.toContain('BEFORE')
    expect(JSON.stringify(request)).not.toContain('AFTER')
    expect(request).not.toHaveProperty('contextBefore')
    expect(request).not.toHaveProperty('contextAfter')
    expect(request).not.toHaveProperty('fullSource')
  })

  test('includes only matching glossary entries and removes duplicate source terms', () => {
    expect(extractAiGlossary('A rabbit met another rabbit.', keywords)).toEqual([
      { source: 'rabbit', translated: '兎' },
    ])
  })

  test('rejects no selection and selections over 12,000 characters', () => {
    expect(() => buildAiTranslationRequest(null, 'ENGLISH', 'JAPANESE', [])).toThrow('原文を選択')
    expect(() => buildAiTranslationRequest(
      { start: 0, end: 12_001, text: 'a'.repeat(12_001) },
      'ENGLISH',
      'JAPANESE',
      [],
    )).toThrow('長すぎます')
  })

  test('limits the glossary to 100 entries', () => {
    const many = Array.from({ length: 105 }, (_, index) => ({ id: String(index), source: `term${index}`, translated: `訳${index}` }))
    expect(extractAiGlossary(many.map((item) => item.source).join(' '), many)).toHaveLength(100)
  })
})
