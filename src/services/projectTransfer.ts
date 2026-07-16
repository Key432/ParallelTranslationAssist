import { isProjectLanguage, isProjectStatus, normalizeProject } from '../domain/projects'
import { buildReaderRows, sortTranslations } from '../domain/translations'
import type { Project, Translation, TranslationKeyword } from '../types'

export const PROJECT_FILE_FORMAT = 'parallel-translation-assist'
export const PROJECT_FILE_VERSION = 1

type ProjectFile = {
  format: typeof PROJECT_FILE_FORMAT
  version: typeof PROJECT_FILE_VERSION
  exportedAt: string
  project: Project
}

function isTranslation(value: unknown): value is Translation {
  if (!value || typeof value !== 'object') return false
  const translation = value as Partial<Translation>
  return typeof translation.id === 'string'
    && Number.isInteger(translation.start)
    && Number.isInteger(translation.end)
    && (translation.start as number) >= 0
    && (translation.end as number) >= (translation.start as number)
    && typeof translation.source === 'string'
    && typeof translation.translated === 'string'
}

function isKeyword(value: unknown): value is TranslationKeyword {
  if (!value || typeof value !== 'object') return false
  const keyword = value as Partial<TranslationKeyword>
  return typeof keyword.id === 'string'
    && typeof keyword.source === 'string'
    && keyword.source.trim().length > 0
    && typeof keyword.translated === 'string'
    && keyword.translated.trim().length > 0
}

function isImportedProject(value: unknown): value is Omit<Project, 'updatedAt'> & { updatedAt?: string } {
  if (!value || typeof value !== 'object') return false
  const project = value as Partial<Project>
  return typeof project.id === 'string'
    && typeof project.title === 'string'
    && isProjectStatus(project.status)
    && typeof project.source === 'string'
    && (project.author === undefined || typeof project.author === 'string')
    && (project.sourceUrl === undefined || typeof project.sourceUrl === 'string')
    && (project.originalLanguage === undefined || isProjectLanguage(project.originalLanguage))
    && (project.translatedLanguage === undefined || isProjectLanguage(project.translatedLanguage))
    && Array.isArray(project.translations)
    && project.translations.every(isTranslation)
    && (project.keywords === undefined || (Array.isArray(project.keywords) && project.keywords.every(isKeyword)))
    && project.translations.every((translation) => translation.end <= (project.source as string).length)
}

export function serializeProject(project: Project): string {
  const file: ProjectFile = {
    format: PROJECT_FILE_FORMAT,
    version: PROJECT_FILE_VERSION,
    exportedAt: new Date().toISOString(),
    project,
  }
  return JSON.stringify(file, null, 2)
}

export function parseProjectFile(contents: string): Project {
  let parsed: unknown
  try {
    parsed = JSON.parse(contents)
  } catch {
    throw new Error('JSONファイルを読み取れませんでした。')
  }

  if (!parsed || typeof parsed !== 'object') throw new Error('プロジェクトファイルの形式が正しくありません。')
  const file = parsed as Partial<ProjectFile>
  if (file.format !== PROJECT_FILE_FORMAT || file.version !== PROJECT_FILE_VERSION || !isImportedProject(file.project)) {
    throw new Error('対応していない、または破損したプロジェクトファイルです。')
  }
  const project = file.project
  const normalized = normalizeProject(project)
  if (!normalized) throw new Error('対応していない、または破損したプロジェクトファイルです。')
  return {
    ...normalized,
    updatedAt: typeof project.updatedAt === 'string' && !Number.isNaN(Date.parse(project.updatedAt))
      ? project.updatedAt
      : typeof file.exportedAt === 'string' && !Number.isNaN(Date.parse(file.exportedAt))
        ? file.exportedAt
        : new Date().toISOString(),
  }
}

export function buildTranslationsText(project: Project): string {
  const translations = sortTranslations(project.translations).map((translation) => translation.translated)
  return [project.title, translations.join('\n')].join('\n\n')
}

export function buildParallelText(project: Project): string {
  const pairs = buildReaderRows(project.source, project.translations)
    .map((row) => `${row.source}\n${row.translated}`)
  return [project.title, ...pairs].join('\n\n')
}

export function safeFileName(title: string): string {
  const safe = title.trim().replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_').replace(/[. ]+$/g, '')
  return safe || 'translation-project'
}
