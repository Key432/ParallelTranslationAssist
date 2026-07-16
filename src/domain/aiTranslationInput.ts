import { findKeywordMatches } from './keywords'
import type { AiTranslationRequest, ProjectLanguage, Selection, TranslationKeyword } from '../types'

export const AI_SOURCE_MAX_LENGTH = 12_000
export const AI_GLOSSARY_MAX_ENTRIES = 100
export const AI_GLOSSARY_TERM_MAX_LENGTH = 200

export class AiTranslationInputError extends Error {}

export function extractAiGlossary(selectionText: string, keywords: TranslationKeyword[]) {
  const matchedIds = new Set(findKeywordMatches(selectionText, keywords).map((match) => match.keyword.id))
  const seen = new Set<string>()
  return keywords.flatMap((keyword) => {
    if (!matchedIds.has(keyword.id)) return []
    const source = keyword.source.trim()
    const translated = keyword.translated.trim()
    if (!source || !translated || seen.has(source)) return []
    if (source.length > AI_GLOSSARY_TERM_MAX_LENGTH || translated.length > AI_GLOSSARY_TERM_MAX_LENGTH) return []
    seen.add(source)
    return [{ source, translated }]
  }).slice(0, AI_GLOSSARY_MAX_ENTRIES)
}

export function buildAiTranslationRequest(
  selection: Selection | null,
  sourceLanguage: ProjectLanguage,
  targetLanguage: ProjectLanguage,
  keywords: TranslationKeyword[],
): AiTranslationRequest {
  if (!selection || selection.end <= selection.start || !selection.text.trim()) {
    throw new AiTranslationInputError('AI翻訳を実行する原文を選択してください。')
  }
  if (selection.text.length > AI_SOURCE_MAX_LENGTH) {
    throw new AiTranslationInputError('選択範囲が長すぎます。範囲を分けてください。')
  }
  return {
    sourceText: selection.text,
    sourceLanguage,
    targetLanguage,
    glossary: extractAiGlossary(selection.text, keywords),
  }
}
