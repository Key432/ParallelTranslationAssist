import { buildSharedProject, parseSharedProject, restoreSharedProject } from './sharedProject'
import type { Project, SharedProjectV1 } from '../types'

const project: Project = {
  id: 'project-secret-id',
  title: '共有する本',
  author: '著者',
  sourceUrl: 'https://example.com/source',
  originalLanguage: 'ENGLISH',
  translatedLanguage: 'JAPANESE',
  status: '翻訳中',
  source: 'Hello world',
  translations: [{ id: 'translation-secret-id', start: 0, end: 5, source: 'Hello', translated: 'こんにちは' }],
  keywords: [{ id: 'keyword-secret-id', source: 'world', translated: '世界' }],
  updatedAt: '2026-07-16T01:00:00.000Z',
}

describe('shared project domain', () => {
  test('builds the compact format without local IDs, timestamps, or duplicated source text', () => {
    const shared = buildSharedProject(project)
    expect(shared).toEqual({
      v: 1, t: '共有する本', a: '著者', u: 'https://example.com/source',
      ol: 'ENGLISH', tl: 'JAPANESE', st: '翻訳中', s: 'Hello world',
      tr: [[0, 5, 'こんにちは']], k: [['world', '世界']],
    })
    const json = JSON.stringify(shared)
    expect(json).not.toContain('project-secret-id')
    expect(json).not.toContain('translation-secret-id')
    expect(json).not.toContain('keyword-secret-id')
    expect(json).not.toContain('updatedAt')
    expect(shared.tr[0]).toHaveLength(3)
  })

  test('restores fresh IDs and derives translation source from the original', () => {
    const restored = restoreSharedProject(buildSharedProject(project), '2026-07-16T02:00:00.000Z')
    expect(restored.id).not.toBe(project.id)
    expect(restored.translations[0]).toMatchObject({ source: 'Hello' })
    expect(restored.translations[0].id).not.toBe(project.translations[0].id)
    expect(restored.keywords[0].id).not.toBe(project.keywords[0].id)
    expect(restored.updatedAt).toBe('2026-07-16T02:00:00.000Z')
  })

  test.each([
    [{ ...buildSharedProject(project), v: 2 }, 'version'],
    [{ ...buildSharedProject(project), ol: 'INVALID' }, 'language'],
    [{ ...buildSharedProject(project), st: 'INVALID' }, 'status'],
    [{ ...buildSharedProject(project), u: 'javascript:alert(1)' }, 'source URL'],
    [{ ...buildSharedProject(project), tr: [[0, 99, 'bad']] }, 'outside source'],
    [{ ...buildSharedProject(project), tr: [[0, 5, 'one'], [4, 8, 'two']] }, 'overlap'],
    [{ ...buildSharedProject(project), unexpected: true }, 'unknown key'],
  ])('rejects invalid shared data: %s (%s)', (value, _label) => {
    expect(() => parseSharedProject(value)).toThrow()
  })

  test('rejects empty keyword values and accepts an empty HTTPS source URL', () => {
    expect(() => parseSharedProject({ ...buildSharedProject(project), k: [['', '訳']] })).toThrow()
    expect(parseSharedProject({ ...buildSharedProject(project), u: '' }).u).toBe('')
  })

  test('accepts the complete valid shared structure', () => {
    expect(parseSharedProject(buildSharedProject(project))).toEqual(buildSharedProject(project) as SharedProjectV1)
  })
})
