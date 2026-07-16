import { useEffect, useRef } from 'react'
import { FormattedTranslation } from './FormattedTranslation'

type Props = {
  onClose: () => void
}

const EXAMPLES = [
  { label: '太字', markup: '**テキスト**' },
  { label: '強調', markup: '_テキスト_' },
  { label: '打消し線', markup: '~テキスト~' },
  { label: 'ルビ', markup: '|漢字《かんじ》' },
]

export function TranslationMarkupHelpModal({ onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}>
      <section className="markup-help-modal" role="dialog" aria-modal="true" aria-labelledby="markup-help-title">
        <header className="markup-help-heading">
          <div>
            <p className="eyebrow">TRANSLATION MARKUP</p>
            <h2 id="markup-help-title">訳文の記法</h2>
          </div>
          <button ref={closeRef} className="statistics-close" onClick={onClose} aria-label="訳文の記法を閉じる">×</button>
        </header>
        <p className="markup-help-description">原文または訳文に次の記法を入力すると、登録後の対訳と閲覧画面でスタイルが適用されます。</p>
        <dl className="markup-examples">
          {EXAMPLES.map((example) => (
            <div key={example.label}>
              <dt>{example.label}</dt>
              <dd><code>{example.markup}</code><span aria-hidden="true">→</span><span className="markup-preview"><FormattedTranslation>{example.markup}</FormattedTranslation></span></dd>
            </div>
          ))}
        </dl>
        <p className="markup-help-note">ルビの先頭は半角「|」と全角「｜」のどちらも使用できます。</p>
      </section>
    </div>
  )
}
