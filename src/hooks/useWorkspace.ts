import { useCallback, useEffect, useMemo, useState } from 'react'
import { createProject } from '../domain/projects'
import { loadWorkspaceState, saveWorkspaceState } from '../services/workspaceStorage'
import type { Project } from '../types'

export function useWorkspace() {
  const initial = useMemo(loadWorkspaceState, [])
  const [projects, setProjects] = useState(initial.projects)
  const [activeProjectId, setActiveProjectId] = useState<string | null>(initial.activeProjectId)
  const activeProject = projects.find((project) => project.id === activeProjectId) ?? null

  useEffect(() => {
    saveWorkspaceState({ projects, activeProjectId })
  }, [projects, activeProjectId])

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
