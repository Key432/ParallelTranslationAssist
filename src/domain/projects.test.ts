import { PROJECT_LANGUAGES, PROJECT_STATUSES, createProject, isProjectStatus, normalizeProject, projectLanguageFontFamily } from './projects'

describe('project domain', () => {
  test('creates a project with the not-started status', () => {
    expect(createProject('New project')).toMatchObject({
      title: 'New project',
      author: '',
      sourceUrl: '',
      originalLanguage: 'ENGLISH',
      translatedLanguage: 'JAPANESE',
      status: '未着手',
      keywords: [],
    })
    expect(createProject('New project').updatedAt).toEqual(expect.any(String))
  })

  test('defines every project language with a flag', () => {
    expect(PROJECT_LANGUAGES.map(({ value }) => value)).toEqual([
      'ENGLISH', 'JAPANESE', 'DEUTSCH', 'RUSSIAN', 'FRENCH', 'GREEK', 'CHINESE', 'KOREAN',
    ])
    expect(PROJECT_LANGUAGES.every(({ flag }) => flag.length > 0)).toBe(true)
  })

  test('maps project languages to the corresponding Noto Serif family', () => {
    expect(projectLanguageFontFamily('JAPANESE')).toBe("'Noto Serif JP', serif")
    expect(projectLanguageFontFamily('CHINESE')).toBe("'Noto Serif SC', serif")
    expect(projectLanguageFontFamily('KOREAN')).toBe("'Noto Serif KR', serif")
    for (const language of ['ENGLISH', 'DEUTSCH', 'RUSSIAN', 'FRENCH', 'GREEK'] as const) {
      expect(projectLanguageFontFamily(language)).toBe("'Noto Serif', serif")
    }
  })

  test('defines all supported statuses', () => {
    expect(PROJECT_STATUSES).toEqual(['未着手', '翻訳中', '初稿完了', '修正中', '完了', '保留'])
    expect(PROJECT_STATUSES.every(isProjectStatus)).toBe(true)
    expect(isProjectStatus('レビュー中')).toBe(false)
  })

  test('adds the default status to a project saved before statuses existed', () => {
    const project = normalizeProject({ id: 'legacy', title: 'Legacy', source: '', translations: [] })
    expect(project?.status).toBe('未着手')
    expect(project).toMatchObject({ author: '', sourceUrl: '', originalLanguage: 'ENGLISH', translatedLanguage: 'JAPANESE', keywords: [] })
    expect(project?.updatedAt).toEqual(expect.any(String))
  })
})
