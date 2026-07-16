import { buildTranslationPrompt, TRANSLATION_SYSTEM_PROMPT } from './aiTranslationPrompt'

test('translation prompt contains the selected source and its recommended keyword pairs without context', () => {
  const prompt = buildTranslationPrompt({
    sourceText: 'SELECTED rabbit',
    sourceLanguage: 'ENGLISH',
    targetLanguage: 'JAPANESE',
    glossary: [{ source: 'rabbit', translated: '兎' }],
  })
  expect(JSON.parse(prompt)).toEqual({
    sourceText: 'SELECTED rabbit',
    sourceLanguage: 'ENGLISH',
    targetLanguage: 'JAPANESE',
    glossary: [{ source: 'rabbit', translated: '兎' }],
  })
  expect(prompt).not.toContain('contextBefore')
  expect(prompt).not.toContain('contextAfter')
  expect(TRANSLATION_SYSTEM_PROMPT).not.toContain('前後の文脈')
  expect(TRANSLATION_SYSTEM_PROMPT).not.toContain('意味、語調、改行、段落構造')
  expect(TRANSLATION_SYSTEM_PROMPT).toContain('段落の切れ目は維持')
  expect(TRANSLATION_SYSTEM_PROMPT).toContain('段落内にある単なる改行は機械的に残さず、自然な文章としてつなげてください')
  expect(TRANSLATION_SYSTEM_PROMPT).toContain('原語（source）と使用推奨訳語（translated）のセット')
  expect(TRANSLATION_SYSTEM_PROMPT).toContain('対応するtranslatedを訳文へ使用')
})
