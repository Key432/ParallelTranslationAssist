import type { RefObject } from 'react'
import type { Selection, Translation } from '../types'

type Props = {
  title: string
  source: string
  translations: Translation[]
  selection: Selection | null
  draft: string
  sourceRef: RefObject<HTMLTextAreaElement | null>
  translationRef: RefObject<HTMLTextAreaElement | null>
  onSourceChange: (source: string) => void
  onCaptureSelection: () => void
  onDraftChange: (draft: string) => void
  onSaveTranslation: () => void
  onCancelSelection: () => void
  onDeleteTranslation: (id: string) => void
}

export function TranslationWorkspace({
  title,
  source,
  translations,
  selection,
  draft,
  sourceRef,
  translationRef,
  onSourceChange,
  onCaptureSelection,
  onDraftChange,
  onSaveTranslation,
  onCancelSelection,
  onDeleteTranslation,
}: Props) {
  return (
    <section className="workspace" aria-label="翻訳編集">
      <div className="intro">
        <div>
          <p className="project-kicker">{title}</p>
          <p className="eyebrow">TRANSLATION WORKSPACE</p>
          <h1>文章を選び、訳を重ねる。</h1>
        </div>
        <p className="intro-help">原文から一文、複数文、または段落を選択し、<br />「選択範囲を翻訳」を押してください。</p>
      </div>

      <div className="editor-grid">
        <article className="panel source-panel">
          <div className="panel-header">
            <div><span className="step">01</span><h2>原文</h2><span className="lang">ENGLISH</span></div>
            <span className="count">{source.length.toLocaleString()} 字</span>
          </div>
          <textarea
            ref={sourceRef}
            value={source}
            onChange={(event) => onSourceChange(event.target.value)}
            placeholder="翻訳したい英文をここに貼り付けます…"
            aria-label="翻訳する原文"
            spellCheck
          />
          <div className="panel-footer">
            <span>選択範囲は訳文と一対一で登録されます</span>
            <button className="primary" onClick={onCaptureSelection}>選択範囲を翻訳 <span>→</span></button>
          </div>
        </article>

        <article className={`panel translation-panel ${selection ? 'ready' : ''}`}>
          <div className="panel-header">
            <div><span className="step">02</span><h2>訳文</h2><span className="lang">JAPANESE</span></div>
            <span className="count">{translations.length} 件</span>
          </div>
          {selection ? (
            <div className="translation-form">
              <blockquote><span>選択した原文</span>{selection.text}</blockquote>
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
              <article className="pair-card" key={item.id}>
                <span className="pair-number">{String(index + 1).padStart(2, '0')}</span>
                <p lang="en">{item.source}</p>
                <p lang="ja">{item.translated}</p>
                <button aria-label="この対訳を削除" onClick={() => onDeleteTranslation(item.id)}>×</button>
              </article>
            ))}
          </div>
        </section>
      )}
    </section>
  )
}
