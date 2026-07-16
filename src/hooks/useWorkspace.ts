import { useCallback, useEffect, useRef, useState } from 'react'
import { createProject } from '../domain/projects'
import { emptyProjectHistory, projectContentsEqual, recordProjectChange, redoProject, restoreProject, snapshotProject, undoProject } from '../domain/history'
import { loadWorkspaceState, saveWorkspaceState } from '../services/workspaceStorage'
import type { Project, WorkspaceState } from '../types'

type UpdateProjectOptions = {
  recordHistory?: boolean
}

const EMPTY_WORKSPACE: WorkspaceState = { projects: [], activeProjectId: null, histories: {} }

function updateProjectInWorkspace(
  workspace: WorkspaceState,
  projectId: string,
  update: (project: Project) => Project,
  recordHistory: boolean,
): WorkspaceState {
  const index = workspace.projects.findIndex((project) => project.id === projectId)
  if (index < 0) return workspace
  const current = workspace.projects[index]
  const proposed = update(restoreProject(current.id, snapshotProject(current)))
  const next = restoreProject(current.id, snapshotProject(proposed))
  if (projectContentsEqual(current, next)) return workspace

  const currentHistory = workspace.histories[projectId] ?? emptyProjectHistory()
  const transition = recordHistory
    ? recordProjectChange(current, next, currentHistory)
    : { project: next, history: currentHistory }
  const projects = [...workspace.projects]
  projects[index] = transition.project
  return {
    ...workspace,
    projects,
    histories: { ...workspace.histories, [projectId]: transition.history },
  }
}

export function useWorkspace() {
  const [workspace, setWorkspace] = useState<WorkspaceState>(EMPTY_WORKSPACE)
  const [ready, setReady] = useState(false)
  const storageFactory = useRef(indexedDB)
  const saveQueue = useRef(Promise.resolve())
  const activeProject = workspace.projects.find((project) => project.id === workspace.activeProjectId) ?? null
  const activeHistory = activeProject ? workspace.histories[activeProject.id] ?? emptyProjectHistory() : emptyProjectHistory()

  useEffect(() => {
    let active = true
    void loadWorkspaceState(storageFactory.current).then((state) => {
      if (!active) return
      setWorkspace(state)
      setReady(true)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!ready) return
    saveQueue.current = saveQueue.current
      .catch(() => undefined)
      .then(() => saveWorkspaceState(workspace, storageFactory.current))
      .catch(() => undefined)
  }, [workspace, ready])

  const setActiveProjectId = useCallback((activeProjectId: string | null) => {
    setWorkspace((current) => current.activeProjectId === activeProjectId ? current : { ...current, activeProjectId })
  }, [])

  const updateActiveProject = useCallback((
    update: (project: Project) => Project,
    options: UpdateProjectOptions = {},
  ) => {
    setWorkspace((current) => current.activeProjectId
      ? updateProjectInWorkspace(current, current.activeProjectId, update, options.recordHistory !== false)
      : current)
  }, [])

  const addProject = useCallback((title: string) => {
    const project = createProject(title)
    setWorkspace((current) => ({
      projects: [...current.projects, project],
      activeProjectId: project.id,
      histories: { ...current.histories, [project.id]: emptyProjectHistory() },
    }))
    return project
  }, [])

  const renameProject = useCallback((id: string, title: string) => {
    setWorkspace((current) => updateProjectInWorkspace(current, id, (project) => ({ ...project, title }), true))
  }, [])

  const deleteProject = useCallback((id: string) => {
    setWorkspace((current) => {
      const projects = current.projects.filter((project) => project.id !== id)
      if (projects.length === current.projects.length) return current
      const histories = { ...current.histories }
      delete histories[id]
      return {
        projects,
        histories,
        activeProjectId: current.activeProjectId === id ? projects[0]?.id ?? null : current.activeProjectId,
      }
    })
  }, [])

  const undoActiveProject = useCallback(() => {
    setWorkspace((current) => {
      if (!current.activeProjectId) return current
      const index = current.projects.findIndex((project) => project.id === current.activeProjectId)
      if (index < 0) return current
      const transition = undoProject(
        current.projects[index],
        current.histories[current.activeProjectId] ?? emptyProjectHistory(),
      )
      if (!transition) return current
      const projects = [...current.projects]
      projects[index] = transition.project
      return {
        ...current,
        projects,
        histories: { ...current.histories, [current.activeProjectId]: transition.history },
      }
    })
  }, [])

  const redoActiveProject = useCallback(() => {
    setWorkspace((current) => {
      if (!current.activeProjectId) return current
      const index = current.projects.findIndex((project) => project.id === current.activeProjectId)
      if (index < 0) return current
      const transition = redoProject(
        current.projects[index],
        current.histories[current.activeProjectId] ?? emptyProjectHistory(),
      )
      if (!transition) return current
      const projects = [...current.projects]
      projects[index] = transition.project
      return {
        ...current,
        projects,
        histories: { ...current.histories, [current.activeProjectId]: transition.history },
      }
    })
  }, [])

  return {
    ready,
    projects: workspace.projects,
    activeProject,
    activeProjectId: workspace.activeProjectId,
    canUndo: activeHistory.past.length > 0,
    canRedo: activeHistory.future.length > 0,
    setActiveProjectId,
    updateActiveProject,
    addProject,
    renameProject,
    deleteProject,
    undoActiveProject,
    redoActiveProject,
  }
}
