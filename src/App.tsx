import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppHeader } from './components/AppHeader'
import { ConfirmationModal } from './components/ConfirmationModal'
import { EmptyProjects } from './components/EmptyProjects'
import { ProjectSidebar } from './components/ProjectSidebar'
import { ProjectInformationModal } from './components/ProjectInformationModal'
import { ProjectStatisticsModal } from './components/ProjectStatisticsModal'
import { Reader } from './components/Reader'
import { TranslationWorkspace } from './components/TranslationWorkspace'
import { calculateTextEdit, findExactTranslation, findOverlappingTranslations, findTranslationsAffectedByEdit, mergeTranslationTexts, reconcileTranslationsAfterEdit, sortTranslations, updateTranslationText } from './domain/translations'
import type { TextEdit } from './domain/translations'
import { buildUntranslatedRanges, findNextUntranslatedRange, findPreviousUntranslatedRange } from './domain/untranslatedRanges'
import { useWorkspace } from './hooks/useWorkspace'
import { useOutsideClick } from './hooks/useOutsideClick'
import type { Project, ProjectInformation, Selection, TextSelectionRange, ViewMode } from './types'
import { downloadFile } from './services/browserFiles'
import { buildParallelText, buildTranslationsText, parseProjectFile, safeFileName, serializeProject } from './services/projectTransfer'

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
  caret: TextSelectionRange
}

function App() {
  const workspace = useWorkspace()
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 800)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [draft, setDraft] = useState('')
  const [editingTranslationId, setEditingTranslationId] = useState<string | null>(null)
  const [pendingDiscard, setPendingDiscard] = useState<PendingDiscard | null>(null)
  const [pendingSourceUpdate, setPendingSourceUpdate] = useState<PendingSourceUpdate | null>(null)
  const [pendingTextImport, setPendingTextImport] = useState<string | null>(null)
  const [pendingProjectImport, setPendingProjectImport] = useState<Project | null>(null)
  const [view, setView] = useState<ViewMode>('edit')
  const [notice, setNotice] = useState('')
  const [statisticsOpen, setStatisticsOpen] = useState(false)
  const [informationMode, setInformationMode] = useState<'default' | 'title' | null>(null)
  const sourceRef = useRef<HTMLTextAreaElement>(null)
  const translationRef = useRef<HTMLTextAreaElement>(null)
  const sidebarRef = useRef<HTMLElement>(null)
  const approvedSourceKeepIds = useRef(new Set<string>())
  const sourceHistoryActive = useRef(false)
  const sourceHistoryTimer = useRef<number | null>(null)

  const endSourceHistoryGroup = useCallback(() => {
    if (sourceHistoryTimer.current !== null) window.clearTimeout(sourceHistoryTimer.current)
    sourceHistoryTimer.current = null
    sourceHistoryActive.current = false
    approvedSourceKeepIds.current.clear()
  }, [])

  const continueSourceHistoryGroup = useCallback(() => {
    const recordHistory = !sourceHistoryActive.current
    sourceHistoryActive.current = true
    if (sourceHistoryTimer.current !== null) window.clearTimeout(sourceHistoryTimer.current)
    sourceHistoryTimer.current = window.setTimeout(() => {
      sourceHistoryTimer.current = null
      sourceHistoryActive.current = false
    }, 800)
    return recordHistory
  }, [])

  const source = workspace.activeProject?.source ?? ''
  const translations = workspace.activeProject?.translations ?? []
  const keywords = workspace.activeProject?.keywords ?? []
  const sortedTranslations = useMemo(() => sortTranslations(translations), [translations])
  const untranslatedRanges = useMemo(() => buildUntranslatedRanges(source, translations), [source, translations])
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  useOutsideClick(sidebarRef, closeSidebar, sidebarOpen, '[data-sidebar-toggle]')

  useEffect(() => {
    endSourceHistoryGroup()
    setSelection(null)
    setDraft('')
    setEditingTranslationId(null)
    setPendingDiscard(null)
    setPendingSourceUpdate(null)
    approvedSourceKeepIds.current.clear()
    setPendingTextImport(null)
    setPendingProjectImport(null)
    setStatisticsOpen(false)
    setInformationMode(null)
  }, [workspace.activeProjectId, endSourceHistoryGroup])

  useEffect(() => () => {
    if (sourceHistoryTimer.current !== null) window.clearTimeout(sourceHistoryTimer.current)
  }, [])

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

  const addProject = () => {
    workspace.addProject('New Project')
    setView('edit')
    setNotice('プロジェクトを作成しました')
  }

  const saveProjectInformation = (information: ProjectInformation) => {
    workspace.updateActiveProject((project) => ({ ...project, ...information }))
    setInformationMode(null)
    setNotice('プロジェクト情報を更新しました')
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

  const navigateUntranslated = (direction: 'previous' | 'next') => {
    if (draft.length > 0 || editingTranslationId || pendingSourceUpdate) return
    const field = sourceRef.current
    const position = selection
      ? (direction === 'next' ? selection.end : selection.start)
      : field
        ? (direction === 'next' ? field.selectionEnd : field.selectionStart)
        : 0
    const range = direction === 'next'
      ? findNextUntranslatedRange(untranslatedRanges, position)
      : findPreviousUntranslatedRange(untranslatedRanges, position)
    if (!range) return

    setSelection({ ...range, text: source.slice(range.start, range.end) })
    setDraft('')
    setEditingTranslationId(null)
    field?.setSelectionRange(range.start, range.end)
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
    const recordHistory = continueSourceHistoryGroup()
    workspace.updateActiveProject(
      (project) => ({ ...project, source: nextSource, translations: nextTranslations }),
      { recordHistory },
    )

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

  const updateSource = (nextSource: string, caret: TextSelectionRange) => {
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
    setPendingSourceUpdate({ nextSource, edit, affectedIds: affected.map((translation) => translation.id), caret })
  }

  const restoreSourceCaret = ({ start, end }: TextSelectionRange) => {
    window.setTimeout(() => {
      const field = sourceRef.current
      if (!field) return
      field.focus()
      field.setSelectionRange(
        Math.min(start, field.value.length),
        Math.min(end, field.value.length),
      )
    }, 0)
  }

  const cancelSourceUpdate = () => {
    const caret = pendingSourceUpdate?.caret
    setPendingSourceUpdate(null)
    endSourceHistoryGroup()
    if (caret) restoreSourceCaret(caret)
  }

  const confirmSourceUpdate = (strategy: 'discard' | 'keep') => {
    if (!pendingSourceUpdate) return
    const update = pendingSourceUpdate
    if (strategy === 'keep') update.affectedIds.forEach((id) => approvedSourceKeepIds.current.add(id))
    applySourceUpdate(update.nextSource, update.edit, strategy)
    setNotice(strategy === 'keep' ? '対訳の原文範囲を更新しました' : '分断された対訳を破棄しました')
    restoreSourceCaret(update.caret)
  }

  const clearActiveProject = () => {
    if (!workspace.activeProject || !window.confirm('このプロジェクトの原文とすべての訳文を削除しますか？')) return
    workspace.updateActiveProject((project) => ({ ...project, source: '', translations: [] }))
    setSelection(null)
    setDraft('')
    setEditingTranslationId(null)
  }

  const resetTranslationForm = () => {
    setSelection(null)
    setDraft('')
    setEditingTranslationId(null)
    setPendingDiscard(null)
    setPendingSourceUpdate(null)
    setPendingTextImport(null)
    setPendingProjectImport(null)
    setStatisticsOpen(false)
    setInformationMode(null)
    approvedSourceKeepIds.current.clear()
  }

  const undoChange = () => {
    if (!workspace.canUndo) return
    endSourceHistoryGroup()
    workspace.undoActiveProject()
    resetTranslationForm()
    setNotice('変更を元に戻しました')
  }

  const redoChange = () => {
    if (!workspace.canRedo) return
    endSourceHistoryGroup()
    workspace.redoActiveProject()
    resetTranslationForm()
    setNotice('変更をやり直しました')
  }

  const applyTextImport = (contents: string, mode: 'overwrite' | 'append') => {
    workspace.updateActiveProject((project) => ({
      ...project,
      source: mode === 'overwrite'
        ? contents
        : `${project.source}${project.source.endsWith('\n') || contents.startsWith('\n') ? '' : '\n'}${contents}`,
      translations: mode === 'overwrite' ? [] : project.translations,
    }))
    resetTranslationForm()
    setPendingTextImport(null)
    setNotice(mode === 'overwrite' ? '原文をインポートしました' : '原文の続きに追加しました')
  }

  const importSourceFile = (contents: string) => {
    if (!workspace.activeProject) return
    if (workspace.activeProject.source || workspace.activeProject.translations.length > 0) setPendingTextImport(contents)
    else applyTextImport(contents, 'overwrite')
  }

  const applyProjectImport = (imported: Project) => {
    if (!workspace.activeProjectId) return
    workspace.updateActiveProject(() => ({ ...imported, id: workspace.activeProjectId as string }))
    resetTranslationForm()
    setPendingProjectImport(null)
    setView('edit')
    setNotice('プロジェクトをインポートしました')
  }

  const importProjectFile = (contents: string) => {
    try {
      const imported = parseProjectFile(contents)
      if (source || translations.length > 0) setPendingProjectImport(imported)
      else applyProjectImport(imported)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'プロジェクトを読み取れませんでした')
    }
  }

  const exportProjectFile = () => {
    if (!workspace.activeProject) return
    downloadFile(`${safeFileName(workspace.activeProject.title)}.pta.json`, serializeProject(workspace.activeProject), 'application/json;charset=utf-8')
  }

  const exportTranslationsFile = () => {
    if (!workspace.activeProject) return
    downloadFile(`${safeFileName(workspace.activeProject.title)}-translations.txt`, buildTranslationsText(workspace.activeProject), 'text/plain;charset=utf-8')
  }

  const exportParallelTextFile = () => {
    if (!workspace.activeProject) return
    downloadFile(`${safeFileName(workspace.activeProject.title)}-parallel.txt`, buildParallelText(workspace.activeProject), 'text/plain;charset=utf-8')
  }

  if (!workspace.ready) {
    return <div className="app-loading" role="status">保存データを読み込んでいます…</div>
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
        transferActions={{
          importSource: importSourceFile,
          importProject: importProjectFile,
          exportProject: exportProjectFile,
          exportTranslations: exportTranslationsFile,
          exportParallelText: exportParallelTextFile,
        }}
      />
      <div className="app-body">
        <ProjectSidebar
          projects={workspace.projects}
          open={sidebarOpen}
          sidebarRef={sidebarRef}
          activeProjectId={workspace.activeProjectId}
          onSelect={selectProject}
          onAdd={addProject}
          onRename={renameProject}
          onDelete={deleteProject}
        />
        <main id="top">
          {!workspace.activeProject ? (
            <EmptyProjects onCreate={addProject} />
          ) : view === 'edit' ? (
            <TranslationWorkspace
              key={workspace.activeProject.id}
              title={workspace.activeProject.title}
              author={workspace.activeProject.author}
              sourceUrl={workspace.activeProject.sourceUrl}
              originalLanguage={workspace.activeProject.originalLanguage}
              translatedLanguage={workspace.activeProject.translatedLanguage}
              status={workspace.activeProject.status}
              source={source}
              translations={sortedTranslations}
              keywords={keywords}
              selection={selection}
              highlightedSelection={pendingDiscard?.selection}
              editingTranslationId={editingTranslationId}
              draft={draft}
              sourceRef={sourceRef}
              translationRef={translationRef}
              onSourceChange={updateSource}
              onSourceBlur={() => { if (!pendingSourceUpdate) endSourceHistoryGroup() }}
              onStatusChange={(status) => workspace.updateActiveProject((project) => ({ ...project, status }))}
              canUndo={workspace.canUndo}
              canRedo={workspace.canRedo}
              onUndo={undoChange}
              onRedo={redoChange}
              onOpenStatistics={() => { setInformationMode(null); setStatisticsOpen(true) }}
              onOpenInformation={(focusTitle = false) => { setStatisticsOpen(false); setInformationMode(focusTitle ? 'title' : 'default') }}
              onCaptureSelection={captureSelection}
              hasUntranslatedRanges={untranslatedRanges.length > 0}
              untranslatedNavigationDisabled={draft.length > 0 || Boolean(editingTranslationId) || Boolean(pendingSourceUpdate)}
              onPreviousUntranslated={() => navigateUntranslated('previous')}
              onNextUntranslated={() => navigateUntranslated('next')}
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
              onAddKeyword={(keywordSource, translated) => {
                workspace.updateActiveProject((project) => ({
                  ...project,
                  keywords: [...project.keywords, { id: crypto.randomUUID(), source: keywordSource, translated }],
                }))
                setNotice('訳語キーワードを登録しました')
              }}
              onUpdateKeyword={(id, keywordSource, translated) => {
                workspace.updateActiveProject((project) => ({
                  ...project,
                  keywords: project.keywords.map((keyword) => keyword.id === id ? { ...keyword, source: keywordSource, translated } : keyword),
                }))
                setNotice('訳語キーワードを更新しました')
              }}
              onDeleteKeyword={(id) => {
                workspace.updateActiveProject((project) => ({
                  ...project,
                  keywords: project.keywords.filter((keyword) => keyword.id !== id),
                }))
                setNotice('訳語キーワードを削除しました')
              }}
            />
          ) : (
            <Reader
              title={workspace.activeProject.title}
              author={workspace.activeProject.author}
              sourceUrl={workspace.activeProject.sourceUrl}
              source={source}
              translations={sortedTranslations}
              originalLanguage={workspace.activeProject.originalLanguage}
              translatedLanguage={workspace.activeProject.translatedLanguage}
              onEdit={() => setView('edit')}
            />
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
          title="この原文の更新は登録済みの対訳に影響します"
          description={`この変更は登録済みの対訳${pendingSourceUpdate.affectedIds.length > 1 ? `${pendingSourceUpdate.affectedIds.length}件` : ''}の原文範囲に影響します。どのように更新するか選択してください。`}
          onCancel={cancelSourceUpdate}
          onConfirm={() => confirmSourceUpdate('discard')}
          onKeep={() => confirmSourceUpdate('keep')}
        />
      )}
      {pendingTextImport !== null && (
        <ConfirmationModal
          title="原文をインポートしますか？"
          description={`現在の原文${translations.length > 0 ? 'と登録済みの対訳' : ''}があります。「上書き」は現在の原文を置き換え${translations.length > 0 ? '、登録済みの対訳をすべて削除し' : ''}ます。「続きとして追加」は現在の原文の末尾に改行して追加し、登録済みの対訳を維持します。`}
          onCancel={() => setPendingTextImport(null)}
          onConfirm={() => applyTextImport(pendingTextImport, 'overwrite')}
          onKeep={() => applyTextImport(pendingTextImport, 'append')}
          confirmLabel="上書き"
          keepLabel="続きとして追加"
        />
      )}
      {pendingProjectImport && (
        <ConfirmationModal
          title="現在のプロジェクトを上書きしますか？"
          description="インポートすると、現在のタイトル、著者、出典URL、言語、ステータス、原文、登録済みの対訳はすべてプロジェクトファイルの内容に置き換わります。実行後は「戻す」で変更前の状態を復元できます。"
          onCancel={() => setPendingProjectImport(null)}
          onConfirm={() => applyProjectImport(pendingProjectImport)}
          confirmLabel="続ける"
        />
      )}
      {statisticsOpen && workspace.activeProject && (
        <ProjectStatisticsModal project={workspace.activeProject} onClose={() => setStatisticsOpen(false)} />
      )}
      {informationMode && workspace.activeProject && (
        <ProjectInformationModal
          project={workspace.activeProject}
          focusTitle={informationMode === 'title'}
          onClose={() => setInformationMode(null)}
          onSave={saveProjectInformation}
        />
      )}
      {notice && <div className="toast" role="status">{notice}</div>}
    </div>
  )
}

export default App
