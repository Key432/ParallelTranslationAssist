import { useCallback, useEffect, useRef, useState } from 'react'
import { createProject } from '../domain/projects'
import { loadWorkspaceState, saveWorkspaceState } from '../services/workspaceStorage'
import type { Project } from '../types'

export function useWorkspace() {
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const storageFactory = useRef(indexedDB)
  const saveQueue = useRef(Promise.resolve())
  const activeProject = projects.find((project) => project.id === activeProjectId) ?? null

  useEffect(() => {
    let active = true
    void loadWorkspaceState(storageFactory.current).then((state) => {
      if (!active) return
      setProjects(state.projects)
      setActiveProjectId(state.activeProjectId)
      setReady(true)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!ready) return
    saveQueue.current = saveQueue.current
      .catch(() => undefined)
      .then(() => saveWorkspaceState({ projects, activeProjectId }, storageFactory.current))
      .catch(() => undefined)
  }, [projects, activeProjectId, ready])

  const updateActiveProject = useCallback((update: (project: Project) => Project) => {
    if (!activeProjectId) return
    setProjects((items) => items.map((project) => project.id === activeProjectId ? update(project) : project))
  }, [activeProjectId])

  const addProject = useCallback((title: string) => {
    const project = createProject(title)
    setProjects((items) => [...items, project])
    setActiveProjectId(project.id)
    return project
  }, [])

  const renameProject = useCallback((id: string, title: string) => {
    setProjects((items) => items.map((project) => project.id === id ? { ...project, title } : project))
  }, [])

  const deleteProject = useCallback((id: string) => {
    setProjects((items) => {
      const remaining = items.filter((project) => project.id !== id)
      setActiveProjectId((activeId) => activeId === id ? remaining[0]?.id ?? null : activeId)
      return remaining
    })
  }, [])

  return {
    ready,
    projects,
    activeProject,
    activeProjectId,
    setActiveProjectId,
    updateActiveProject,
    addProject,
    renameProject,
    deleteProject,
  }
}
