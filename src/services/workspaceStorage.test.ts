import { IDBFactory } from 'fake-indexeddb'
import { snapshotProject } from '../domain/history'
import { loadWorkspaceState, saveWorkspaceState } from './workspaceStorage'
import type { WorkspaceState } from '../types'

const projectInformation = {
  author: '',
  sourceUrl: '',
  originalLanguage: 'ENGLISH' as const,
  translatedLanguage: 'JAPANESE' as const,
}

describe('workspace storage', () => {
  beforeEach(() => {
    localStorage.clear()
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      value: new IDBFactory(),
    })
  })

  test('loads a saved workspace and repairs an invalid active project id', async () => {
    const state = {
      projects: [{ ...projectInformation, id: 'project-1', title: 'Test', status: '翻訳中' as const, source: 'Source', translations: [], updatedAt: '2026-07-16T01:00:00.000Z' }],
      activeProjectId: 'missing',
      histories: {},
    }
    await saveWorkspaceState(state)

    expect(await loadWorkspaceState()).toEqual({
      projects: state.projects,
      activeProjectId: 'project-1',
      histories: { 'project-1': { past: [], future: [] } },
    })
  })

  test('persists the complete workspace in IndexedDB', async () => {
    const state: WorkspaceState = {
      projects: [{ ...projectInformation, id: 'project-1', title: 'Test', status: '完了', source: 'Source', translations: [], updatedAt: '2026-07-16T01:00:00.000Z' }],
      activeProjectId: 'project-1',
      histories: {
        'project-1': {
          past: [snapshotProject({ ...projectInformation, id: 'project-1', title: 'Before', status: '翻訳中', source: 'Old', translations: [], updatedAt: '2026-07-15T01:00:00.000Z' })],
          future: [snapshotProject({ ...projectInformation, id: 'project-1', title: 'After', status: '完了', source: 'New', translations: [], updatedAt: '2026-07-16T01:00:00.000Z' })],
        },
      },
    }

    await saveWorkspaceState(state)

    expect(await loadWorkspaceState()).toEqual(state)
  })

  test('loads stored projects without history as empty histories', async () => {
    await saveWorkspaceState({
      projects: [{ ...projectInformation, id: 'project-1', title: 'Test', status: '未着手', source: 'Source', translations: [], updatedAt: '2026-07-16T01:00:00.000Z' }],
      activeProjectId: 'project-1',
      histories: undefined,
    } as unknown as WorkspaceState)

    expect((await loadWorkspaceState()).histories).toEqual({
      'project-1': { past: [], future: [] },
    })
  })

  test('creates an initial workspace without migrating LocalStorage data', async () => {
    localStorage.setItem('parallel-translation-assist:v2', JSON.stringify({
      projects: [{ id: 'legacy', title: 'Legacy', status: '完了', source: 'Old', translations: [] }],
      activeProjectId: 'legacy',
    }))

    const state = await loadWorkspaceState()

    expect(state.projects[0].title).toBe('はじめてのプロジェクト')
    expect(state.projects.some((project) => project.id === 'legacy')).toBe(false)
  })
})
