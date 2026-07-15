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
  source: string
  translations: Translation[]
}

export type WorkspaceState = {
  projects: Project[]
  activeProjectId: string | null
}

export type Selection = {
  start: number
  end: number
  text: string
}

export type ViewMode = 'edit' | 'read'
