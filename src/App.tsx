import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppHeader } from './components/AppHeader'
import { EmptyProjects } from './components/EmptyProjects'
import { ProjectSidebar } from './components/ProjectSidebar'
import { Reader } from './components/Reader'
import { TranslationWorkspace } from './components/TranslationWorkspace'
import { overlapsTranslation, sortTranslations, updateTranslationText } from './domain/translations'
import { useWorkspace } from './hooks/useWorkspace'
import { useOutsideClick } from './hooks/useOutsideClick'
import type { Project, Selection, ViewMode } from './types'

function App() {
  const workspace = useWorkspace()
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 800)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [draft, setDraft] = useState('')
  const [editingTranslationId, setEditingTranslationId] = useState<string | null>(null)
  const [view, setView] = useState<ViewMode>('edit')
  const [notice, setNotice] = useState('')
  const [creating, setCreating] = useState(false)
  const sourceRef = useRef<HTMLTextAreaElement>(null)
  const translationRef = useRef<HTMLTextAreaElement>(null)
  const sidebarRef = useRef<HTMLElement>(null)

  const source = workspace.activeProject?.source ?? ''
  const translations = workspace.activeProject?.translations ?? []
  const sortedTranslations = useMemo(() => sortTranslations(translations), [translations])
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  useOutsideClick(sidebarRef, closeSidebar, sidebarOpen, '[data-sidebar-toggle]')

  useEffect(() => {
    setSelection(null)
    setDraft('')
    setEditingTranslationId(null)
  }, [workspace.activeProjectId])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 2400)
    return () => window.clearTimeout(timer)
  }, [notice])

  const selectProject = (id: string) => {
    workspace.setActiveProjectId(id)
    setView('edit')
    if (window.innerWidth <= 800) setSidebarOpen(false)
  }

  const addProject = (title: string) => {
    workspace.addProject(title)
    setCreating(false)
    setView('edit')
    setNotice('プロジェクトを作成しました')
  }

  const renameProject = (id: string, title: string) => {
    workspace.renameProject(id, title)
    setNotice('タイトルを更新しました')
  }

  const deleteProject = (project: Project) => {
    if (!window.confirm(`「${project.title}」を削除しますか？\n原文と訳文もすべて削除されます。`)) return
    workspace.deleteProject(project.id)
    setNotice('プロジェクトを削除しました')
  }

  const captureSelection = () => {
    const field = sourceRef.current
    if (!field) return
    const start = field.selectionStart
    const end = field.selectionEnd
    const text = source.slice(start, end)
    if (!text.trim()) {
      setNotice('訳したい原文を先に選択してください')
      return
    }
    if (overlapsTranslation(start, end, translations)) {
      setNotice('すでに訳文がある範囲と重なっています')
      return
    }
    setSelection({ start, end, text })
    setDraft('')
    setEditingTranslationId(null)
    window.setTimeout(() => translationRef.current?.focus(), 0)
  }

  const saveTranslation = () => {
    if (!selection || !draft.trim()) return
    workspace.updateActiveProject((project) => ({
      ...project,
      translations: editingTranslationId
        ? updateTranslationText(project.translations, editingTranslationId, draft.trim())
        : [...project.translations, {
            id: crypto.randomUUID(),
            start: selection.start,
            end: selection.end,
            source: selection.text,
            translated: draft.trim(),
          }],
    }))
    setSelection(null)
    setDraft('')
    setEditingTranslationId(null)
    setNotice(editingTranslationId ? '訳文を更新しました' : '訳文を登録しました')
  }

  const editTranslation = (id: string) => {
    const translation = translations.find((item) => item.id === id)
    if (!translation) return
    setSelection({ start: translation.start, end: translation.end, text: translation.source })
    setDraft(translation.translated)
    setEditingTranslationId(id)
    window.setTimeout(() => translationRef.current?.focus(), 0)
  }

  const updateSource = (next: string) => {
    const shouldClear = translations.length > 0 && next !== source
    workspace.updateActiveProject((project) => ({ ...project, source: next, translations: shouldClear ? [] : project.translations }))
    if (shouldClear) {
      setSelection(null)
      setDraft('')
      setEditingTranslationId(null)
      setNotice('原文を編集したため、登録済みの訳文をクリアしました')
    }
  }

  const clearActiveProject = () => {
    if (!workspace.activeProject || !window.confirm('このプロジェクトの原文とすべての訳文を削除しますか？')) return
    workspace.updateActiveProject((project) => ({ ...project, source: '', translations: [] }))
    setSelection(null)
    setDraft('')
    setEditingTranslationId(null)
  }

  return (
    <div className="app-shell">
      <AppHeader
        view={view}
        hasActiveProject={Boolean(workspace.activeProject)}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        onViewChange={setView}
        onClear={clearActiveProject}
      />
      <div className="app-body">
        <ProjectSidebar
          projects={workspace.projects}
          open={sidebarOpen}
          sidebarRef={sidebarRef}
          activeProjectId={workspace.activeProjectId}
          creating={creating}
          onCreatingChange={setCreating}
          onSelect={selectProject}
          onAdd={addProject}
          onRename={renameProject}
          onDelete={deleteProject}
        />
        <main id="top">
          {!workspace.activeProject ? (
            <EmptyProjects onCreate={() => { setSidebarOpen(true); setCreating(true) }} />
          ) : view === 'edit' ? (
            <TranslationWorkspace
              title={workspace.activeProject.title}
              status={workspace.activeProject.status}
              source={source}
              translations={sortedTranslations}
              selection={selection}
              editingTranslationId={editingTranslationId}
              draft={draft}
              sourceRef={sourceRef}
              translationRef={translationRef}
              onSourceChange={updateSource}
              onStatusChange={(status) => workspace.updateActiveProject((project) => ({ ...project, status }))}
              onCaptureSelection={captureSelection}
              onDraftChange={setDraft}
              onSaveTranslation={saveTranslation}
              onCancelSelection={() => { setSelection(null); setDraft(''); setEditingTranslationId(null) }}
              onEditTranslation={editTranslation}
              onDeleteTranslation={(id) => {
                workspace.updateActiveProject((project) => ({
                  ...project,
                  translations: project.translations.filter((translation) => translation.id !== id),
                }))
                if (editingTranslationId === id) {
                  setSelection(null)
                  setDraft('')
                  setEditingTranslationId(null)
                }
              }}
            />
          ) : (
            <Reader title={workspace.activeProject.title} source={source} translations={sortedTranslations} onEdit={() => setView('edit')} />
          )}
        </main>
      </div>
      <footer><span>PARALLEL TRANSLATION ASSIST</span><span>Private workspace · Data stays in this browser</span></footer>
      {notice && <div className="toast" role="status">{notice}</div>}
    </div>
  )
}

export default App
