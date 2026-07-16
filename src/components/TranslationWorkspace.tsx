import type { RefObject } from 'react'
import { PROJECT_STATUSES, projectLanguageLocale } from '../domain/projects'
import type { ProjectLanguage, ProjectStatus, Selection, Translation } from '../types'
import { HistoryControls } from './HistoryControls'
import { SourceEditor } from './SourceEditor'

type Props = {
  title: string
  author: string
  sourceUrl: string
  originalLanguage: ProjectLanguage
  translatedLanguage: ProjectLanguage
  status: ProjectStatus
  source: string
  translations: Translation[]
  selection: Selection | null
  highlightedSelection?: Selection | null
  editingTranslationId: string | null
  draft: string
  sourceRef: RefObject<HTMLTextAreaElement | null>
  translationRef: RefObject<HTMLTextAreaElement | null>
  onSourceChange: (source: string) => void
  onSourceBlur?: () => void
  onStatusChange: (status: ProjectStatus) => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onOpenStatistics: () => void
  onOpenInformation: (focusTitle?: boolean) => void
  onCaptureSelection: () => void
  onDraftChange: (draft: string) => void
  onSaveTranslation: () => void
  onCancelSelection: () => void
  onEditTranslation: (id: string) => void
  onDeleteTranslation: (id: string) => void
}

export function TranslationWorkspace({
  title,
  author,
  sourceUrl,
  originalLanguage,
  translatedLanguage,
  status,
  source,
  translations,
  selection,
  highlightedSelection,
  editingTranslationId,
  draft,
  sourceRef,
  translationRef,
  onSourceChange,
  onSourceBlur,
  onStatusChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenStatistics,
  onOpenInformation,
  onCaptureSelection,
  onDraftChange,
  onSaveTranslation,
  onCancelSelection,
  onEditTranslation,
  onDeleteTranslation,
}: Props) {
  return (
    <section className="workspace" aria-label="翻訳編集">
      <div className="intro">
        <div>
          <div className="workspace-controls">
            <label className="status-control">
              <span>STATUS</span>
              <select value={status} onChange={(event) => onStatusChange(event.target.value as ProjectStatus)} aria-label="プロジェクトステータス">
                {PROJECT_STATUSES.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <HistoryControls canUndo={canUndo} canRedo={canRedo} onUndo={onUndo} onRedo={onRedo} />
          </div>
          <p className="eyebrow">TRANSLATION WORKSPACE</p>
          <h1><button className="editable-project-title" onClick={() => onOpenInformation(true)} aria-label={`タイトルを編集: ${title}`}>{title}</button></h1>
          {(author || sourceUrl) && (
            <div className="project-attribution">
              {author && <span className="project-author">by {author}</span>}
              {sourceUrl && <a href={sourceUrl} target="_blank" rel="noreferrer">🔗 Source</a>}
            </div>
          )}
        </div>
        <div className="intro-actions">
          <button className="statistics-button" onClick={onOpenStatistics} aria-label="プロジェクト統計を表示">
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 17V9h3v8H3Zm5 0V3h3v14H8Zm5 0v-5h3v5h-3Z" /></svg>
            <span>統計</span>
          </button>
          <button className="statistics-button" onClick={() => onOpenInformation()} aria-label="プロジェクト情報を表示">
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0 3.2a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3ZM8.8 9h2.4v6H8.8V9Z" /></svg>
            <span>情報</span>
          </button>
        </div>
      </div>

      <div className="editor-grid">
        <article className="panel source-panel">
          <div className="panel-header">
            <div><span className="step">01</span><h2>原文</h2><span className="lang">{originalLanguage}</span></div>
            <span className="count">{source.length.toLocaleString()} 字</span>
          </div>
          <SourceEditor source={source} translations={translations} selection={highlightedSelection ?? selection} sourceRef={sourceRef} onSourceChange={onSourceChange} onBlur={onSourceBlur} />
          <div className="panel-footer">
            <span>選択範囲は訳文と一対一で登録されます</span>
            <button className="primary" onClick={onCaptureSelection}>選択範囲を翻訳 <span>→</span></button>
          </div>
        </article>

        <article className={`panel translation-panel ${selection ? 'ready' : ''}`}>
          <div className="panel-header">
            <div><span className="step">02</span><h2>訳文</h2><span className="lang">{translatedLanguage}</span></div>
            <span className="count">{translations.length} 件</span>
          </div>
          {selection ? (
            <div className="translation-form">
              <blockquote><span>{editingTranslationId ? '編集中の原文' : '選択した原文'}</span>{selection.text}</blockquote>
              <textarea
                ref={translationRef}
                value={draft}
                onChange={(event) => onDraftChange(event.target.value)}
                placeholder="訳文を入力します…"
                aria-label="訳文"
                onKeyDown={(event) => {
                  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') onSaveTranslation()
                }}
              />
            </div>
          ) : (
            <div className="empty-state">
              <span className="selection-icon">Aa</span>
              <strong>原文を選択してください</strong>
              <p>一文から段落まで、好きな長さで<br />訳文を紐づけられます。</p>
            </div>
          )}
          <div className="panel-footer right">
            {selection && <button className="text-button" onClick={onCancelSelection}>キャンセル</button>}
            <button className="primary" disabled={!selection || !draft.trim()} onClick={onSaveTranslation}>訳文を登録 <span>⌘↵</span></button>
          </div>
        </article>
      </div>

      {translations.length > 0 && (
        <section className="recent">
          <div className="section-title"><p className="eyebrow">REGISTERED PAIRS</p><h2>登録済みの対訳</h2></div>
          <div className="pair-list">
            {translations.map((item, index) => (
              <article className={`pair-card ${editingTranslationId === item.id ? 'editing' : ''}`} key={item.id}>
                <span className="pair-number">{String(index + 1).padStart(2, '0')}</span>
                <p className="pair-source" lang={projectLanguageLocale(originalLanguage)}>{item.source}</p>
                <p className="pair-translation" lang={projectLanguageLocale(translatedLanguage)}>{item.translated}</p>
                <div className="pair-actions">
                  <button aria-label="この対訳を編集" onClick={() => onEditTranslation(item.id)}>✎</button>
                  <button aria-label="この対訳を削除" onClick={() => onDeleteTranslation(item.id)}>×</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </section>
  )
}
