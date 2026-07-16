export type Translation = {
  id: string
  start: number
  end: number
  source: string
  translated: string
}

export type TranslationKeyword = {
  id: string
  source: string
  translated: string
}

export type Project = {
  id: string
  title: string
  author: string
  sourceUrl: string
  originalLanguage: ProjectLanguage
  translatedLanguage: ProjectLanguage
  status: ProjectStatus
  source: string
  translations: Translation[]
  keywords: TranslationKeyword[]
  updatedAt: string
}

export type ProjectStatus = '未着手' | '翻訳中' | '初稿完了' | '修正中' | '完了' | '保留'

export type ProjectLanguage = 'ENGLISH' | 'JAPANESE' | 'DEUTSCH' | 'RUSSIAN' | 'FRENCH' | 'GREEK' | 'CHINESE' | 'KOREAN'

export type ProjectInformation = Pick<Project, 'title' | 'author' | 'sourceUrl' | 'originalLanguage' | 'translatedLanguage'>

export type ProjectSnapshot = Pick<Project, 'title' | 'author' | 'sourceUrl' | 'originalLanguage' | 'translatedLanguage' | 'status' | 'source' | 'translations' | 'keywords'>

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

export type TextSelectionRange = Pick<Selection, 'start' | 'end'>

export type TextRange = {
  start: number
  end: number
}

export type ViewMode = 'edit' | 'read'
