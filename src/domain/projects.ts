import type { Project } from '../types'

export function createProject(title: string, source = ''): Project {
  return { id: crypto.randomUUID(), title, source, translations: [] }
}

export function isProject(value: unknown): value is Project {
  if (!value || typeof value !== 'object') return false
  const project = value as Partial<Project>
  return typeof project.id === 'string'
    && typeof project.title === 'string'
    && typeof project.source === 'string'
    && Array.isArray(project.translations)
}
