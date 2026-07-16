import { useEffect, useRef, useState } from 'react'
import type { TranslationKeyword } from '../types'

type Props = {
  keywords: TranslationKeyword[]
  onClose: () => void
  onAdd: (source: string, translated: string) => void
  onUpdate: (id: string, source: string, translated: string) => void
  onDelete: (id: string) => void
}

export function TranslationKeywordModal({ keywords, onClose, onAdd, onUpdate, onDelete }: Props) {
  const [tab, setTab] = useState<'register' | 'list'>('register')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [source, setSource] = useState('')
  const [translated, setTranslated] = useState('')
  const [error, setError] = useState('')
  const sourceRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    sourceRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const resetForm = () => {
    setEditingId(null)
    setSource('')
    setTranslated('')
    setError('')
  }

  const submit = () => {
    const originalTerm = source.trim()
    const translatedTerm = translated.trim()
    if (!originalTerm || !translatedTerm) return
    if (keywords.some((keyword) => keyword.id !== editingId && keyword.source === originalTerm)) {
      setError('同じ原語はすでに登録されています。')
      return
    }
    if (editingId) onUpdate(editingId, originalTerm, translatedTerm)
    else onAdd(originalTerm, translatedTerm)
    resetForm()
    setTab('list')
  }

  const edit = (keyword: TranslationKeyword) => {
    setEditingId(keyword.id)
    setSource(keyword.source)
    setTranslated(keyword.translated)
    setError('')
    setTab('register')
    window.setTimeout(() => sourceRef.current?.focus(), 0)
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}>
      <section className="keyword-modal" role="dialog" aria-modal="true" aria-labelledby="keyword-dialog-title">
        <header className="information-heading">
          <div><p className="eyebrow">TRANSLATION KEYWORDS</p><h2 id="keyword-dialog-title">訳語キーワード</h2></div>
          <button className="statistics-close" onClick={onClose} aria-label="訳語キーワードを閉じる">×</button>
        </header>
        <div className="keyword-tabs" role="tablist" aria-label="訳語キーワードの操作">
          <button role="tab" aria-selected={tab === 'register'} onClick={() => setTab('register')}>登録</button>
          <button role="tab" aria-selected={tab === 'list'} onClick={() => setTab('list')}>一覧 <span>{keywords.length}</span></button>
        </div>
        {tab === 'register' ? (
          <form className="keyword-form" onSubmit={(event) => { event.preventDefault(); submit() }}>
            <p>{editingId ? '登録済みキーワードの内容を更新します。' : '原文中の原語と、対応する訳語をセットで登録します。'}</p>
            <label><span>原語</span><input ref={sourceRef} value={source} onChange={(event) => { setSource(event.target.value); setError('') }} placeholder="例: translation" /></label>
            <label><span>訳語</span><input value={translated} onChange={(event) => setTranslated(event.target.value)} placeholder="例: 翻訳" /></label>
            {error && <p className="keyword-error" role="alert">{error}</p>}
            <div className="modal-actions">
              {editingId && <button type="button" className="text-button" onClick={resetForm}>編集をキャンセル</button>}
              <button type="submit" className="primary" disabled={!source.trim() || !translated.trim()}>{editingId ? '更新' : '登録'}</button>
            </div>
          </form>
        ) : (
          <div className="keyword-list">
            {keywords.length === 0 ? <p className="keyword-empty">登録されたキーワードはありません。</p> : keywords.map((keyword) => (
              <article key={keyword.id} className="keyword-item">
                <div><strong>{keyword.source}</strong><span>→</span><p>{keyword.translated}</p></div>
                <div className="keyword-item-actions">
                  <button onClick={() => edit(keyword)} aria-label={`${keyword.source}を編集`}>編集</button>
                  <button onClick={() => onDelete(keyword.id)} aria-label={`${keyword.source}を削除`}>削除</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
