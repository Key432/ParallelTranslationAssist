import { isProjectLanguage, isProjectStatus } from './projects'
import type { Project, ProjectHistory, ProjectSnapshot, Translation } from '../types'

export const MAX_HISTORY_ENTRIES = 25

export type HistoryTransition = {
  project: Project
  history: ProjectHistory
}

export function emptyProjectHistory(): ProjectHistory {
  return { past: [], future: [] }
}

function cloneTranslation(translation: Translation): Translation {
  return { ...translation }
}

export function cloneSnapshot(snapshot: ProjectSnapshot): ProjectSnapshot {
  return {
    title: snapshot.title,
    author: snapshot.author,
    sourceUrl: snapshot.sourceUrl,
    originalLanguage: snapshot.originalLanguage,
    translatedLanguage: snapshot.translatedLanguage,
    status: snapshot.status,
    source: snapshot.source,
    translations: snapshot.translations.map(cloneTranslation),
  }
}

export function snapshotProject(project: Project): ProjectSnapshot {
  return cloneSnapshot(project)
}

export function restoreProject(projectId: string, snapshot: ProjectSnapshot, updatedAt: string): Project {
  return { id: projectId, ...cloneSnapshot(snapshot), updatedAt }
}

export function projectContentsEqual(left: Project | ProjectSnapshot, right: Project | ProjectSnapshot): boolean {
  if (left.title !== right.title
    || left.author !== right.author
    || left.sourceUrl !== right.sourceUrl
    || left.originalLanguage !== right.originalLanguage
    || left.translatedLanguage !== right.translatedLanguage
    || left.status !== right.status
    || left.source !== right.source) return false
  if (left.translations.length !== right.translations.length) return false
  return left.translations.every((translation, index) => {
    const other = right.translations[index]
    return translation.id === other.id
      && translation.start === other.start
      && translation.end === other.end
      && translation.source === other.source
      && translation.translated === other.translated
  })
}

export function recordProjectChange(
  current: Project,
  next: Project,
  history: ProjectHistory,
): HistoryTransition {
  if (projectContentsEqual(current, next)) {
    return { project: restoreProject(current.id, snapshotProject(current), current.updatedAt), history: cloneHistory(history) }
  }
  const past = [...history.past.map(cloneSnapshot), snapshotProject(current)].slice(-MAX_HISTORY_ENTRIES)
  return {
    project: restoreProject(current.id, snapshotProject(next), next.updatedAt),
    history: { past, future: [] },
  }
}

export function undoProject(current: Project, history: ProjectHistory, updatedAt = new Date().toISOString()): HistoryTransition | null {
  if (history.past.length === 0) return null
  const target = history.past[history.past.length - 1]
  return {
    project: restoreProject(current.id, target, updatedAt),
    history: {
      past: history.past.slice(0, -1).map(cloneSnapshot),
      future: [snapshotProject(current), ...history.future.map(cloneSnapshot)],
    },
  }
}

export function redoProject(current: Project, history: ProjectHistory, updatedAt = new Date().toISOString()): HistoryTransition | null {
  if (history.future.length === 0) return null
  const [target, ...remaining] = history.future
  return {
    project: restoreProject(current.id, target, updatedAt),
    history: {
      past: [...history.past.map(cloneSnapshot), snapshotProject(current)],
      future: remaining.map(cloneSnapshot),
    },
  }
}

export function cloneHistory(history: ProjectHistory): ProjectHistory {
  return {
    past: history.past.map(cloneSnapshot),
    future: history.future.map(cloneSnapshot),
  }
}

function isTranslation(value: unknown): value is Translation {
  if (!value || typeof value !== 'object') return false
  const translation = value as Partial<Translation>
  return typeof translation.id === 'string'
    && Number.isInteger(translation.start)
    && Number.isInteger(translation.end)
    && typeof translation.source === 'string'
    && typeof translation.translated === 'string'
}

function normalizeSnapshot(value: unknown): ProjectSnapshot | null {
  if (!value || typeof value !== 'object') return null
  const snapshot = value as Partial<ProjectSnapshot>
  if (typeof snapshot.title !== 'string'
    || !isProjectStatus(snapshot.status)
    || typeof snapshot.source !== 'string'
    || (snapshot.originalLanguage !== undefined && !isProjectLanguage(snapshot.originalLanguage))
    || (snapshot.translatedLanguage !== undefined && !isProjectLanguage(snapshot.translatedLanguage))
    || !Array.isArray(snapshot.translations)
    || !snapshot.translations.every(isTranslation)) return null
  return cloneSnapshot({
    ...(snapshot as ProjectSnapshot),
    author: typeof snapshot.author === 'string' ? snapshot.author : '',
    sourceUrl: typeof snapshot.sourceUrl === 'string' ? snapshot.sourceUrl : '',
    originalLanguage: snapshot.originalLanguage === undefined ? 'ENGLISH' : snapshot.originalLanguage,
    translatedLanguage: snapshot.translatedLanguage === undefined ? 'JAPANESE' : snapshot.translatedLanguage,
  })
}

export function normalizeProjectHistory(value: unknown): ProjectHistory {
  if (!value || typeof value !== 'object') return emptyProjectHistory()
  const history = value as Partial<ProjectHistory>
  const past = Array.isArray(history.past)
    ? history.past.map(normalizeSnapshot).filter((snapshot) => snapshot !== null)
    : []
  const future = Array.isArray(history.future)
    ? history.future.map(normalizeSnapshot).filter((snapshot) => snapshot !== null)
    : []
  const overflow = Math.max(0, past.length + future.length - MAX_HISTORY_ENTRIES)
  return {
    past: past.slice(Math.min(overflow, past.length)),
    future: future.slice(Math.max(0, overflow - past.length)),
  }
}
