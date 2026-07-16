import { useEffect, useRef, useState } from 'react'
import type { AiConnectionStatus } from '../types'

const STATUS_LABELS: Record<AiConnectionStatus, string> = {
  empty: '未入力',
  unchecked: '未確認',
  checking: '確認中',
  available: '利用可能',
  invalid: 'APIキーが無効',
  quota: '利用上限エラー',
  error: '接続エラー',
}

type Props = {
  apiKey: string
  status: AiConnectionStatus
  model: string
  onApiKeyChange: (value: string) => void
  onCheckConnection: () => void
  onClearApiKey: () => void
  onClose: () => void
}

export function AiApiKeySettings({ apiKey, status, model, onApiKeyChange, onCheckConnection, onClearApiKey, onClose }: Props) {
  const [visible, setVisible] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    inputRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}>
      <section className="ai-settings-modal" role="dialog" aria-modal="true" aria-labelledby="ai-settings-title">
        <div className="ai-settings-heading">
          <div><p className="eyebrow">OPTIONAL ASSISTANCE</p><h2 id="ai-settings-title">AI翻訳支援</h2></div>
          <button type="button" className="statistics-close" onClick={onClose} aria-label="AI翻訳支援の設定を閉じる">×</button>
        </div>
        <div className="ai-settings-body">
        <label className="ai-key-field">
          <span>OpenAI APIキー</span>
          <div>
            <input
              ref={inputRef}
              type={visible ? 'text' : 'password'}
              value={apiKey}
              onChange={(event) => onApiKeyChange(event.target.value)}
              autoComplete="off"
              aria-label="OpenAI APIキー"
            />
            <button type="button" className="text-button" onClick={() => setVisible((current) => !current)}>{visible ? '非表示' : '表示'}</button>
          </div>
        </label>
        <div className="ai-connection-row">
          <span className="ai-connection-status" data-status={status}>接続状態: {STATUS_LABELS[status]}{model && status === 'available' ? ` (${model})` : ''}</span>
          <div>
            <button type="button" disabled={!apiKey || status === 'checking'} onClick={onCheckConnection}>接続を確認</button>
            <button type="button" disabled={!apiKey} onClick={onClearApiKey}>APIキーを消去</button>
          </div>
        </div>
        <p>接続確認ではブラウザからOpenAIのモデル一覧APIへ直接アクセスし、APIキーが利用できるか確認します。</p>
        <p>APIキーはこのページを開いている間だけメモリ上に保持され、永続保存されません。ページを再読み込みすると消去されます。</p>
        <p>このアプリは中継サーバーを使用しないため、APIキーはブラウザからOpenAI APIへ直接送信されます。共有端末や信頼できない環境では使用しないでください。</p>
        <p>OpenAI APIの利用料金は、入力したAPIキーの所有者に発生します。</p>
        <p>APIの使用状況は<a href="https://platform.openai.com/usage" target="_blank" rel="noreferrer">こちら</a>で確認</p>
        <p>AI翻訳を実行すると、選択した原文、原文言語、翻訳先言語、選択範囲に関連する訳語キーワードをOpenAI APIへ送信します。選択範囲の前後にある原文やプロジェクト全体は送信しません。</p>
        <p>前後の文脈を送信しないため、訳語、主語、指示語などの判断精度が下がる場合があります。必要な場合は選択範囲を広げて再実行してください。</p>
        </div>
      </section>
    </div>
  )
}
