import { PROJECT_STATUSES, createProject, isProjectStatus, normalizeProject } from './projects'

describe('project domain', () => {
  test('creates a project with the not-started status', () => {
    expect(createProject('New project')).toMatchObject({ title: 'New project', status: '未着手' })
    expect(createProject('New project').updatedAt).toEqual(expect.any(String))
  })

  test('defines all supported statuses', () => {
    expect(PROJECT_STATUSES).toEqual(['未着手', '翻訳中', '初稿完了', '修正中', '完了', '保留'])
    expect(PROJECT_STATUSES.every(isProjectStatus)).toBe(true)
    expect(isProjectStatus('レビュー中')).toBe(false)
  })

  test('adds the default status to a project saved before statuses existed', () => {
    const project = normalizeProject({ id: 'legacy', title: 'Legacy', source: '', translations: [] })
    expect(project?.status).toBe('未着手')
    expect(project?.updatedAt).toEqual(expect.any(String))
  })
})
