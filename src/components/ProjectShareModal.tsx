import { useEffect, useRef, useState } from 'react'
import { buildProjectShareUrl, supportsShareLinks, type ShareUrlStatus } from '../services/shareLinkCodec'
import type { Project } from '../types'

type ShareResult = { url: string; length: number; status: ShareUrlStatus }

type Props = {
  project: Project
  onClose: () => void
  onCopied: () => void
  onSaveFile: () => void
}

export function ProjectShareModal({ project, onClose, onCopied, onSaveFile }: Props) {
  const [result, setResult] = useState<ShareResult | null>(null)
  const [error, setError] = useState('')
  const [manualCopy, setManualCopy] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    if (!supportsShareLinks()) {
      setError('このブラウザでは共有リンクを利用できません。プロジェクトファイルを保存して共有してください。')
      return
    }
    let active = true
    void buildProjectShareUrl(project, window.location.href)
      .then((value) => { if (active) setResult(value) })
      .catch(() => { if (active) setError('共有リンクを作成できませんでした。プロジェクトファイルを保存して共有してください。') })
    return () => { active = false }
  }, [project])

  const copy = async () => {
    if (!result || result.status === 'too_large') return
    try {
      await navigator.clipboard.writeText(result.url)
      onCopied()
    } catch {
      setManualCopy(true)
    }
  }

  const share = async () => {
    if (!result || result.status === 'too_large') return
    try { await navigator.share({ title: project.title, url: result.url }) } catch { /* キャンセルは通知しない */ }
  }

  const statusMessage = result?.status === 'warning'
    ? '一部のチャットやメールでリンクが途中までしか送信されない可能性があります。'
    : result?.status === 'too_large'
      ? 'プロジェクトが大きいため共有リンクを作成できません。プロジェクトファイルを保存して共有してください。'
      : result ? '共有リンクを利用できます。' : '共有リンクを作成しています…'

  return (
    <div className="modal-backdrop">
      <section className="confirmation-modal share-modal" role="dialog" aria-modal="true" aria-labelledby="share-title">
        <p className="eyebrow">SHARE PROJECT</p>
        <h2 id="share-title">プロジェクトを共有</h2>
        <dl className="share-summary">
          <div><dt>タイトル</dt><dd>{project.title}</dd></div>
          <div><dt>原文</dt><dd>{project.source.length.toLocaleString()} 文字</dd></div>
          <div><dt>登録済み対訳</dt><dd>{project.translations.length.toLocaleString()} 件</dd></div>
          <div><dt>訳語キーワード</dt><dd>{project.keywords.length.toLocaleString()} 件</dd></div>
          <div><dt>共有URL</dt><dd>{result ? `${result.length.toLocaleString()} 文字` : '—'}</dd></div>
        </dl>
        <p className={`share-status ${result?.status ?? ''}`} role="status">{error || statusMessage}</p>
        <p>共有リンクには原文、登録済み対訳、プロジェクト情報、訳語キーワードが含まれます。圧縮されていますが暗号化はされていません。リンクを知っている人は内容を読み取れます。</p>
        <p className="share-note">APIキー、AI候補、AI警告は含まれません。フラグメントはサーバーへ送信されませんが、ブラウザ履歴、クリップボード、拡張機能、共有先アプリから参照される可能性があります。</p>
        {manualCopy && result && <input className="share-url-input" aria-label="共有URLを手動でコピー" value={result.url} readOnly onFocus={(event) => event.currentTarget.select()} />}
        <div className="modal-actions share-actions">
          <button ref={closeRef} className="text-button" onClick={onClose}>閉じる</button>
          <button className="text-button" onClick={onSaveFile}>プロジェクトファイルを保存</button>
          <button className="primary" disabled={!result || result.status === 'too_large'} onClick={() => { void copy() }}>リンクをコピー</button>
          {typeof navigator.share === 'function' && <button className="primary" disabled={!result || result.status === 'too_large'} onClick={() => { void share() }}>共有</button>}
        </div>
      </section>
    </div>
  )
}
