import type { Project, ProjectStatus } from '../types'

export const PROJECT_STATUSES = ['未着手', '翻訳中', '初稿完了', '修正中', '完了', '保留'] as const satisfies readonly ProjectStatus[]

export function isProjectStatus(value: unknown): value is ProjectStatus {
  return PROJECT_STATUSES.some((status) => status === value)
}

export function createProject(title: string, source = '', updatedAt = new Date().toISOString()): Project {
  return { id: crypto.randomUUID(), title, status: '未着手', source, translations: [], updatedAt }
}

function normalizeUpdatedAt(value: unknown): string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
    ? value
    : new Date().toISOString()
}

export function normalizeProject(value: unknown): Project | null {
  if (!value || typeof value !== 'object') return null
  const project = value as Partial<Project>
  const valid = typeof project.id === 'string'
    && typeof project.title === 'string'
    && typeof project.source === 'string'
    && Array.isArray(project.translations)
  if (!valid) return null
  return {
    id: project.id as string,
    title: project.title as string,
    status: isProjectStatus(project.status) ? project.status : '未着手',
    source: project.source as string,
    translations: project.translations as Project['translations'],
    updatedAt: normalizeUpdatedAt(project.updatedAt),
  }
}
