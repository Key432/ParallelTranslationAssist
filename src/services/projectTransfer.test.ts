import { buildParallelText, buildTranslationsText, parseProjectFile, safeFileName, serializeProject } from './projectTransfer'
import type { Project } from '../types'

const project: Project = {
  id: 'project-1',
  title: 'Alice / Chapter 1',
  author: 'Lewis Carroll',
  sourceUrl: 'https://example.com/alice',
  originalLanguage: 'ENGLISH',
  translatedLanguage: 'JAPANESE',
  status: '翻訳中',
  source: 'Hello gap world',
  translations: [
    { id: 'world', start: 10, end: 15, source: 'world', translated: '世界' },
    { id: 'hello', start: 0, end: 5, source: 'Hello', translated: 'こんにちは' },
  ],
  updatedAt: '2026-07-16T01:00:00.000Z',
}

describe('project transfer', () => {
  test('round-trips a versioned project file', () => {
    expect(parseProjectFile(serializeProject(project))).toEqual(project)
  })

  test('rejects invalid and unsupported project files', () => {
    expect(() => parseProjectFile('{broken')).toThrow('JSONファイルを読み取れませんでした。')
    expect(() => parseProjectFile(JSON.stringify({ format: 'other', version: 1, project }))).toThrow('対応していない')
  })

  test('loads legacy project files without project information or an updated timestamp', () => {
    const {
      updatedAt: _updatedAt,
      author: _author,
      sourceUrl: _sourceUrl,
      originalLanguage: _originalLanguage,
      translatedLanguage: _translatedLanguage,
      ...legacyProject
    } = project
    const imported = parseProjectFile(JSON.stringify({
      format: 'parallel-translation-assist',
      version: 1,
      exportedAt: '2026-07-15T12:00:00.000Z',
      project: legacyProject,
    }))
    expect(imported.updatedAt).toBe('2026-07-15T12:00:00.000Z')
    expect(imported).toMatchObject({ author: '', sourceUrl: '', originalLanguage: 'ENGLISH', translatedLanguage: 'JAPANESE' })
  })

  test('exports translated text in source order', () => {
    expect(buildTranslationsText(project)).toBe('Alice / Chapter 1\n\nこんにちは\n世界')
  })

  test('exports bilingual pairs and marks untranslated source', () => {
    expect(buildParallelText(project)).toBe('Alice / Chapter 1\n\nHello\nこんにちは\n\ngap\n—\n\nworld\n世界')
  })

  test('sanitizes project titles for downloaded file names', () => {
    expect(safeFileName('Alice / Chapter 1')).toBe('Alice _ Chapter 1')
  })
})
