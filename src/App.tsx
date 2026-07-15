import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppHeader } from './components/AppHeader'
import { ConfirmationModal } from './components/ConfirmationModal'
import { EmptyProjects } from './components/EmptyProjects'
import { ProjectSidebar } from './components/ProjectSidebar'
import { Reader } from './components/Reader'
import { TranslationWorkspace } from './components/TranslationWorkspace'
import { calculateTextEdit, findExactTranslation, findOverlappingTranslations, findTranslationsAffectedByEdit, mergeTranslationTexts, reconcileTranslationsAfterEdit, sortTranslations, updateTranslationText } from './domain/translations'
import type { TextEdit } from './domain/translations'
import { useWorkspace } from './hooks/useWorkspace'
import { useOutsideClick } from './hooks/useOutsideClick'
import type { Project, Selection, ViewMode } from './types'

type PendingDiscard = {
  selection: Selection
  translationIds: string[]
  mode: 'new' | 'update-editing'
  editingTranslationId?: string
}

type PendingSourceUpdate = {
  nextSource: string
  edit: TextEdit
  affectedIds: string[]
}

function App() {
  const workspace = useWorkspace()
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 800)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [draft, setDraft] = useState('')
  const [editingTranslationId, setEditingTranslationId] = useState<string | null>(null)
  const [pendingDiscard, setPendingDiscard] = useState<PendingDiscard | null>(null)
  const [pendingSourceUpdate, setPendingSourceUpdate] = useState<PendingSourceUpdate | null>(null)
  const [view, setView] = useState<ViewMode>('edit')
  const [notice, setNotice] = useState('')
  const [creating, setCreating] = useState(false)
  const sourceRef = useRef<HTMLTextAreaElement>(null)
  const translationRef = useRef<HTMLTextAreaElement>(null)
  const sidebarRef = useRef<HTMLElement>(null)
  const approvedSourceKeepIds = useRef(new Set<string>())

  const source = workspace.activeProject?.source ?? ''
  const translations = workspace.activeProject?.translations ?? []
  const sortedTranslations = useMemo(() => sortTranslations(translations), [translations])
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  useOutsideClick(sidebarRef, closeSidebar, sidebarOpen, '[data-sidebar-toggle]')

  useEffect(() => {
    setSelection(null)
    setDraft('')
    setEditingTranslationId(null)
    setPendingDiscard(null)
    setPendingSourceUpdate(null)
    approvedSourceKeepIds.current.clear()
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
    const nextSelection = { start, end, text }
    if (!editingTranslationId) {
      const exactTranslation = findExactTranslation(start, end, translations)
      if (exactTranslation) {
        editTranslation(exactTranslation.id)
        setNotice('登録済みの訳文を編集します')
        return
      }

      const overlapping = findOverlappingTranslations(start, end, translations)
      if (overlapping.length > 0) {
        setPendingDiscard({ selection: nextSelection, translationIds: overlapping.map((translation) => translation.id), mode: 'new' })
        return
      }
    } else {
      const overlapping = findOverlappingTranslations(
        start,
        end,
        translations.filter((translation) => translation.id !== editingTranslationId),
      )
      if (overlapping.length > 0) {
        setPendingDiscard({
          selection: nextSelection,
          translationIds: overlapping.map((translation) => translation.id),
          mode: 'update-editing',
          editingTranslationId,
        })
        return
      }
      updateEditingSourceSelection(nextSelection, editingTranslationId)
      return
    }
    setSelection(nextSelection)
    setDraft('')
    setEditingTranslationId(null)
    window.setTimeout(() => translationRef.current?.focus(), 0)
  }

  const confirmDiscard = () => {
    if (!pendingDiscard) return
    if (pendingDiscard.mode === 'update-editing' && pendingDiscard.editingTranslationId) {
      updateEditingSourceSelection(
        pendingDiscard.selection,
        pendingDiscard.editingTranslationId,
        pendingDiscard.translationIds,
      )
      return
    }
    const discardedIds = new Set(pendingDiscard.translationIds)
    workspace.updateActiveProject((project) => ({
      ...project,
      translations: project.translations.filter((translation) => !discardedIds.has(translation.id)),
    }))
    setSelection(pendingDiscard.selection)
    setDraft('')
    setEditingTranslationId(null)
    setPendingDiscard(null)
    setNotice('重なっていた対訳を破棄しました')
    window.setTimeout(() => translationRef.current?.focus(), 0)
  }

  const keepOverlappingTranslations = () => {
    if (!pendingDiscard) return
    const mergedIds = new Set(pendingDiscard.translationIds)
    if (pendingDiscard.editingTranslationId) mergedIds.add(pendingDiscard.editingTranslationId)
    const mergedText = mergeTranslationTexts(translations.filter((translation) => mergedIds.has(translation.id)))

    if (pendingDiscard.mode === 'update-editing' && pendingDiscard.editingTranslationId) {
      setDraft(mergedText)
      updateEditingSourceSelection(
        pendingDiscard.selection,
        pendingDiscard.editingTranslationId,
        pendingDiscard.translationIds,
      )
      setNotice('訳文を結合し、原文範囲を更新しました')
      return
    }

    const discardedIds = new Set(pendingDiscard.translationIds)
    workspace.updateActiveProject((project) => ({
      ...project,
      translations: project.translations.filter((translation) => !discardedIds.has(translation.id)),
    }))
    setSelection(pendingDiscard.selection)
    setDraft(mergedText)
    setEditingTranslationId(null)
    setPendingDiscard(null)
    setNotice('登録済みの訳文を結合しました')
    window.setTimeout(() => translationRef.current?.focus(), 0)
  }

  const updateEditingSourceSelection = (nextSelection: Selection, editingId: string, discardIds: string[] = []) => {
    const discardedIds = new Set(discardIds)
    workspace.updateActiveProject((project) => ({
      ...project,
      translations: project.translations
        .filter((translation) => !discardedIds.has(translation.id))
        .map((translation) => translation.id === editingId
          ? { ...translation, start: nextSelection.start, end: nextSelection.end, source: nextSelection.text }
          : translation),
    }))
    setSelection(nextSelection)
    setPendingDiscard(null)
    setNotice(discardIds.length > 0 ? '重なっていた対訳を破棄し、原文範囲を更新しました' : '対訳の原文範囲を更新しました')
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

  const applySourceUpdate = (nextSource: string, edit: TextEdit, strategy: 'discard' | 'keep') => {
    const nextTranslations = reconcileTranslationsAfterEdit(nextSource, edit, translations, strategy)
    workspace.updateActiveProject((project) => ({ ...project, source: nextSource, translations: nextTranslations }))

    if (editingTranslationId) {
      const updatedEditing = nextTranslations.find((translation) => translation.id === editingTranslationId)
      if (updatedEditing) setSelection({ start: updatedEditing.start, end: updatedEditing.end, text: updatedEditing.source })
      else {
        setSelection(null)
        setDraft('')
        setEditingTranslationId(null)
      }
    } else {
      setSelection(null)
      setDraft('')
    }
    setPendingSourceUpdate(null)
  }

  const updateSource = (nextSource: string) => {
    if (nextSource === source) return
    const edit = calculateTextEdit(source, nextSource)
    const affected = findTranslationsAffectedByEdit(edit, translations)
    if (affected.length === 0) {
      applySourceUpdate(nextSource, edit, 'keep')
      return
    }
    if (affected.every((translation) => approvedSourceKeepIds.current.has(translation.id))) {
      applySourceUpdate(nextSource, edit, 'keep')
      return
    }
    setPendingSourceUpdate({ nextSource, edit, affectedIds: affected.map((translation) => translation.id) })
  }

  const cancelSourceUpdate = () => {
    setPendingSourceUpdate(null)
    window.setTimeout(() => sourceRef.current?.focus(), 0)
  }

  const confirmSourceUpdate = (strategy: 'discard' | 'keep') => {
    if (!pendingSourceUpdate) return
    if (strategy === 'keep') pendingSourceUpdate.affectedIds.forEach((id) => approvedSourceKeepIds.current.add(id))
    applySourceUpdate(pendingSourceUpdate.nextSource, pendingSourceUpdate.edit, strategy)
    setNotice(strategy === 'keep' ? '対訳の原文範囲を更新しました' : '分断された対訳を破棄しました')
    window.setTimeout(() => sourceRef.current?.focus(), 0)
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
              onSourceBlur={() => approvedSourceKeepIds.current.clear()}
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
      {pendingDiscard && (
        <ConfirmationModal
          count={pendingDiscard.translationIds.length}
          onCancel={() => setPendingDiscard(null)}
          onConfirm={confirmDiscard}
          onKeep={keepOverlappingTranslations}
        />
      )}
      {pendingSourceUpdate && (
        <ConfirmationModal
          count={pendingSourceUpdate.affectedIds.length}
          title="原文の更新により対訳が分断されます"
          description={`この変更は登録済みの対訳${pendingSourceUpdate.affectedIds.length > 1 ? `${pendingSourceUpdate.affectedIds.length}件` : ''}の原文範囲に影響します。どのように更新するか選択してください。`}
          onCancel={cancelSourceUpdate}
          onConfirm={() => confirmSourceUpdate('discard')}
          onKeep={() => confirmSourceUpdate('keep')}
        />
      )}
      {notice && <div className="toast" role="status">{notice}</div>}
    </div>
  )
}

export default App
