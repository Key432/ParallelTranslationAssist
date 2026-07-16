export type Translation = {
  id: string
  start: number
  end: number
  source: string
  translated: string
}

export type Project = {
  id: string
  title: string
  status: ProjectStatus
  source: string
  translations: Translation[]
  updatedAt: string
}

export type ProjectStatus = '未着手' | '翻訳中' | '初稿完了' | '修正中' | '完了' | '保留'

export type ProjectSnapshot = Pick<Project, 'title' | 'status' | 'source' | 'translations'>

export type ProjectHistory = {
  past: ProjectSnapshot[]
  future: ProjectSnapshot[]
}

export type WorkspaceState = {
  projects: Project[]
  activeProjectId: string | null
  histories: Record<string, ProjectHistory>
}

export type Selection = {
  start: number
  end: number
  text: string
}

export type ViewMode = 'edit' | 'read'
