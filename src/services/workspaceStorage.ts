import { createProject, isProject } from '../domain/projects'
import type { Translation, WorkspaceState } from '../types'

export const STORAGE_KEY = 'parallel-translation-assist:v2'
export const LEGACY_STORAGE_KEY = 'parallel-translation-assist:v1'

const SAMPLE = `Translation is not a matter of words only: it is a matter of making intelligible a whole culture. The translator must cross borders of language while preserving the rhythm, ambiguity, and texture of the original.

Read the source closely. Select a sentence, a group of sentences, or an entire paragraph, then add your translation. Each pair will appear side by side in the reading view.`

type LegacyState = {
  source: string
  translations: Translation[]
}

export function createInitialState(): WorkspaceState {
  const project = createProject('はじめてのプロジェクト', SAMPLE)
  return { projects: [project], activeProjectId: project.id }
}

export function loadWorkspaceState(storage: Pick<Storage, 'getItem'> = localStorage): WorkspaceState {
  try {
    const saved = storage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<WorkspaceState>
      const projects = Array.isArray(parsed.projects) ? parsed.projects.filter(isProject) : []
      const activeProjectId = projects.some((project) => project.id === parsed.activeProjectId)
        ? parsed.activeProjectId as string
        : projects[0]?.id ?? null
      return { projects, activeProjectId }
    }

    const legacy = storage.getItem(LEGACY_STORAGE_KEY)
    if (legacy) {
      const parsed = JSON.parse(legacy) as LegacyState
      const project = createProject('マイプロジェクト', parsed.source ?? '')
      project.translations = Array.isArray(parsed.translations) ? parsed.translations : []
      return { projects: [project], activeProjectId: project.id }
    }
  } catch {
    // Fall back to a valid initial workspace when stored data is unavailable.
  }

  return createInitialState()
}

export function saveWorkspaceState(
  state: WorkspaceState,
  storage: Pick<Storage, 'setItem'> = localStorage,
): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(state))
}
