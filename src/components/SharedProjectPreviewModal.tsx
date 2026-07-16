import { PROJECT_LANGUAGES } from '../domain/projects'
import type { SharedProjectV1 } from '../types'

type Props = {
  shared: SharedProjectV1
  onAdd: () => void
  onReadOnly: () => void
  onCancel: () => void
}

function languageLabel(value: SharedProjectV1['ol']): string {
  const language = PROJECT_LANGUAGES.find((item) => item.value === value)
  return language ? `${language.flag} ${language.value}` : value
}

export function SharedProjectPreviewModal({ shared, onAdd, onReadOnly, onCancel }: Props) {
  return (
    <div className="modal-backdrop">
      <section className="confirmation-modal share-modal" role="dialog" aria-modal="true" aria-labelledby="shared-preview-title">
        <p className="eyebrow">SHARED PROJECT</p>
        <h2 id="shared-preview-title">共有されたプロジェクト</h2>
        <dl className="share-summary">
          <div><dt>タイトル</dt><dd>{shared.t}</dd></div>
          <div><dt>著者</dt><dd>{shared.a || '—'}</dd></div>
          <div><dt>原文言語</dt><dd>{languageLabel(shared.ol)}</dd></div>
          <div><dt>翻訳先言語</dt><dd>{languageLabel(shared.tl)}</dd></div>
          <div><dt>原文</dt><dd>{shared.s.length.toLocaleString()} 文字</dd></div>
          <div><dt>登録済み対訳</dt><dd>{shared.tr.length.toLocaleString()} 件</dd></div>
          <div><dt>訳語キーワード</dt><dd>{shared.k.length.toLocaleString()} 件</dd></div>
          <div><dt>出典URL</dt><dd>{shared.u || '—'}</dd></div>
        </dl>
        <p>共有リンクの内容は、信頼できる相手から受け取った場合だけ開いてください。開いただけではこのブラウザへ保存されません。</p>
        <div className="modal-actions share-actions">
          <button className="text-button" onClick={onCancel}>キャンセル</button>
          <button className="text-button" onClick={onReadOnly}>閲覧のみ</button>
          <button className="primary" onClick={onAdd}>新しいプロジェクトとして追加</button>
        </div>
      </section>
    </div>
  )
}
