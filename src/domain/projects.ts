import type { Project, ProjectLanguage, ProjectStatus } from '../types'

export const PROJECT_STATUSES = ['未着手', '翻訳中', '初稿完了', '修正中', '完了', '保留'] as const satisfies readonly ProjectStatus[]

export const PROJECT_LANGUAGES = [
  { value: 'ENGLISH', flag: '🇬🇧', locale: 'en' },
  { value: 'JAPANESE', flag: '🇯🇵', locale: 'ja' },
  { value: 'DEUTSCH', flag: '🇩🇪', locale: 'de' },
  { value: 'RUSSIAN', flag: '🇷🇺', locale: 'ru' },
  { value: 'FRENCH', flag: '🇫🇷', locale: 'fr' },
  { value: 'GREEK', flag: '🇬🇷', locale: 'el' },
  { value: 'CHINESE', flag: '🇨🇳', locale: 'zh' },
  { value: 'KOREAN', flag: '🇰🇷', locale: 'ko' },
] as const satisfies readonly { value: ProjectLanguage; flag: string; locale: string }[]

export function isProjectStatus(value: unknown): value is ProjectStatus {
  return PROJECT_STATUSES.some((status) => status === value)
}

export function isProjectLanguage(value: unknown): value is ProjectLanguage {
  return PROJECT_LANGUAGES.some((language) => language.value === value)
}

export function projectLanguageLocale(language: ProjectLanguage): string {
  return PROJECT_LANGUAGES.find((option) => option.value === language)?.locale ?? 'en'
}

export function projectLanguageFontFamily(language: ProjectLanguage): string {
  if (language === 'JAPANESE') return "'Noto Serif JP', serif"
  if (language === 'CHINESE') return "'Noto Serif SC', serif"
  if (language === 'KOREAN') return "'Noto Serif KR', serif"
  return "'Noto Serif', serif"
}

export function createProject(title: string, source = '', updatedAt = new Date().toISOString()): Project {
  return {
    id: crypto.randomUUID(),
    title,
    author: '',
    sourceUrl: '',
    originalLanguage: 'ENGLISH',
    translatedLanguage: 'JAPANESE',
    status: '未着手',
    source,
    translations: [],
    keywords: [],
    updatedAt,
  }
}

function normalizeUpdatedAt(value: unknown): string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
    ? value
    : new Date().toISOString()
}

export function normalizeProject(value: unknown): Project | null {
  if (!value || typeof value !== 'object') return null
  const project = value as Partial<Project>
  const valid = typeof project.id === 'string'
    && typeof project.title === 'string'
    && typeof project.source === 'string'
    && Array.isArray(project.translations)
  if (!valid) return null
  return {
    id: project.id as string,
    title: project.title as string,
    author: typeof project.author === 'string' ? project.author : '',
    sourceUrl: typeof project.sourceUrl === 'string' ? project.sourceUrl : '',
    originalLanguage: isProjectLanguage(project.originalLanguage) ? project.originalLanguage : 'ENGLISH',
    translatedLanguage: isProjectLanguage(project.translatedLanguage) ? project.translatedLanguage : 'JAPANESE',
    status: isProjectStatus(project.status) ? project.status : '未着手',
    source: project.source as string,
    translations: project.translations as Project['translations'],
    keywords: Array.isArray(project.keywords)
      ? project.keywords.filter((keyword) => keyword
        && typeof keyword.id === 'string'
        && typeof keyword.source === 'string'
        && typeof keyword.translated === 'string')
      : [],
    updatedAt: normalizeUpdatedAt(project.updatedAt),
  }
}
