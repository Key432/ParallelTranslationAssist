import type { AiTranslationResponse } from '../types'

type Props = {
  suggestion: AiTranslationResponse | null
  loading: boolean
  error: string
  onCancel: () => void
  onApply: () => void
  onRegenerate: () => void
  onClose: () => void
}

type ButtonProps = {
  loading: boolean
  error: string
  canGenerate: boolean
  hasApiKey: boolean
  onGenerate: () => void
}

export function AiTranslationButton({ loading, error, canGenerate, hasApiKey, onGenerate }: ButtonProps) {
  const disabled = loading || !canGenerate
  return (
    <button type="button" className="ai-translation-button footer-tool-button" disabled={disabled} onClick={onGenerate} aria-label="AIで下訳を作成">
      <span aria-hidden="true">✦</span>
      <span className="translation-keyword-tooltip">{hasApiKey ? (error ? 'AI翻訳を再試行' : 'AIで下訳を作成') : 'APIキーを設定して使用'}</span>
    </button>
  )
}

export function AiTranslationSuggestion({ suggestion, loading, error, onCancel, onApply, onRegenerate, onClose }: Props) {
  return (
    <>
      {(loading || error || suggestion) && <section className="ai-suggestion" aria-label="AI翻訳支援">
        {loading && <div className="ai-loading"><p role="status">下訳を作成しています…</p><button type="button" className="text-button" onClick={onCancel}>キャンセル</button></div>}
        {error && <p className="ai-error" role="alert">{error}</p>}
        {suggestion && (
        <div className="ai-candidate">
          <span>AIによる下訳候補</span>
          <p>{suggestion.translation}</p>
          {suggestion.warnings.length > 0 && (
            <div className="ai-warnings" role="status">
              <strong>確認事項</strong>
              <ul>{suggestion.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
            </div>
          )}
          <div className="ai-candidate-actions">
            <button type="button" className="primary" onClick={onApply}>訳文欄へ反映</button>
            <button type="button" onClick={onRegenerate}>もう一度作成</button>
            <button type="button" onClick={onClose}>候補を閉じる</button>
          </div>
        </div>
        )}
      </section>}
    </>
  )
}
