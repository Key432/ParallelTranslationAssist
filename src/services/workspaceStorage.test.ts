import { IDBFactory } from 'fake-indexeddb'
import { loadWorkspaceState, saveWorkspaceState } from './workspaceStorage'
import type { WorkspaceState } from '../types'

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
      projects: [{ id: 'project-1', title: 'Test', status: '翻訳中' as const, source: 'Source', translations: [] }],
      activeProjectId: 'missing',
    }
    await saveWorkspaceState(state)

    expect(await loadWorkspaceState()).toEqual({
      projects: state.projects,
      activeProjectId: 'project-1',
    })
  })

  test('persists the complete workspace in IndexedDB', async () => {
    const state: WorkspaceState = {
      projects: [{ id: 'project-1', title: 'Test', status: '完了', source: 'Source', translations: [] }],
      activeProjectId: 'project-1',
    }

    await saveWorkspaceState(state)

    expect(await loadWorkspaceState()).toEqual(state)
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
