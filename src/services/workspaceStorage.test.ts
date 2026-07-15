import { LEGACY_STORAGE_KEY, STORAGE_KEY, loadWorkspaceState, saveWorkspaceState } from './workspaceStorage'
import type { WorkspaceState } from '../types'

function storageWith(values: Record<string, string | null>) {
  return { getItem: jest.fn((key: string) => values[key] ?? null) }
}

describe('workspace storage', () => {
  test('loads a valid workspace and repairs an invalid active project id', () => {
    const projects = [{ id: 'project-1', title: 'Test', source: 'Source', translations: [] }]
    const storage = storageWith({ [STORAGE_KEY]: JSON.stringify({ projects, activeProjectId: 'missing' }) })

    expect(loadWorkspaceState(storage)).toEqual({ projects, activeProjectId: 'project-1' })
  })

  test('migrates legacy source and translations into a project', () => {
    const translation = { id: 't1', start: 0, end: 5, source: 'Hello', translated: 'こんにちは' }
    const storage = storageWith({
      [STORAGE_KEY]: null,
      [LEGACY_STORAGE_KEY]: JSON.stringify({ source: 'Hello', translations: [translation] }),
    })

    const state = loadWorkspaceState(storage)
    expect(state.projects[0]).toMatchObject({ title: 'マイプロジェクト', source: 'Hello', translations: [translation] })
    expect(state.activeProjectId).toBe(state.projects[0].id)
  })

  test('serializes the complete workspace', () => {
    const state: WorkspaceState = { projects: [], activeProjectId: null }
    const storage = { setItem: jest.fn() }
    saveWorkspaceState(state, storage)
    expect(storage.setItem).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify(state))
  })
})
