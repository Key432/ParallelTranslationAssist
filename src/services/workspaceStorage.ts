import { createProject, normalizeProject } from '../domain/projects'
import type { WorkspaceState } from '../types'

export const DATABASE_NAME = 'parallel-translation-assist'
export const DATABASE_VERSION = 1
export const WORKSPACE_STORE = 'workspace'
export const WORKSPACE_KEY = 'current'

const SAMPLE = `Translation is not a matter of words only: it is a matter of making intelligible a whole culture. The translator must cross borders of language while preserving the rhythm, ambiguity, and texture of the original.

Read the source closely. Select a sentence, a group of sentences, or an entire paragraph, then add your translation. Each pair will appear side by side in the reading view.`

export function createInitialState(): WorkspaceState {
  const project = createProject('はじめてのプロジェクト', SAMPLE)
  return { projects: [project], activeProjectId: project.id }
}

function openWorkspaceDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(WORKSPACE_STORE)) {
        request.result.createObjectStore(WORKSPACE_STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('IndexedDBの接続がブロックされました。'))
  })
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDBの処理が中断されました。'))
  })
}

function normalizeWorkspace(value: unknown): WorkspaceState | null {
  if (!value || typeof value !== 'object') return null
  const saved = value as Partial<WorkspaceState>
  if (!Array.isArray(saved.projects)) return null
  const projects = saved.projects.map(normalizeProject).filter((project) => project !== null)
  const activeProjectId = projects.some((project) => project.id === saved.activeProjectId)
    ? saved.activeProjectId as string
    : projects[0]?.id ?? null
  return { projects, activeProjectId }
}

export async function loadWorkspaceState(factory: IDBFactory = indexedDB): Promise<WorkspaceState> {
  let database: IDBDatabase | null = null
  try {
    database = await openWorkspaceDatabase(factory)
    const transaction = database.transaction(WORKSPACE_STORE, 'readonly')
    const [stored] = await Promise.all([
      requestResult(transaction.objectStore(WORKSPACE_STORE).get(WORKSPACE_KEY)),
      transactionComplete(transaction),
    ])
    return normalizeWorkspace(stored) ?? createInitialState()
  } catch {
    return createInitialState()
  } finally {
    database?.close()
  }
}

export async function saveWorkspaceState(
  state: WorkspaceState,
  factory: IDBFactory = indexedDB,
): Promise<void> {
  const database = await openWorkspaceDatabase(factory)
  try {
    const transaction = database.transaction(WORKSPACE_STORE, 'readwrite')
    transaction.objectStore(WORKSPACE_STORE).put(state, WORKSPACE_KEY)
    await transactionComplete(transaction)
  } finally {
    database.close()
  }
}
