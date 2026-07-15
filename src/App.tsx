import { useEffect, useMemo, useRef, useState } from 'react'

type Translation = {
  id: string
  start: number
  end: number
  source: string
  translated: string
}

type SavedState = {
  source: string
  translations: Translation[]
}

type Selection = { start: number; end: number; text: string }

const STORAGE_KEY = 'parallel-translation-assist:v1'
const SAMPLE = `Translation is not a matter of words only: it is a matter of making intelligible a whole culture. The translator must cross borders of language while preserving the rhythm, ambiguity, and texture of the original.

Read the source closely. Select a sentence, a group of sentences, or an entire paragraph, then add your translation. Each pair will appear side by side in the reading view.`

function loadState(): SavedState {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (value) return JSON.parse(value) as SavedState
  } catch {
    // Ignore an unavailable or malformed local store.
  }
  return { source: SAMPLE, translations: [] }
}

function App() {
  const initial = useMemo(loadState, [])
  const [source, setSource] = useState(initial.source)
  const [translations, setTranslations] = useState(initial.translations)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [draft, setDraft] = useState('')
  const [view, setView] = useState<'edit' | 'read'>('edit')
  const [notice, setNotice] = useState('')
  const sourceRef = useRef<HTMLTextAreaElement>(null)
  const translationRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ source, translations }))
  }, [source, translations])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 2400)
    return () => window.clearTimeout(timer)
  }, [notice])

  const sorted = useMemo(
    () => [...translations].sort((a, b) => a.start - b.start),
    [translations],
  )

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
    const overlaps = translations.some((item) => start < item.end && end > item.start)
    if (overlaps) {
      setNotice('すでに訳文がある範囲と重なっています')
      return
    }
    setSelection({ start, end, text })
    setDraft('')
    window.setTimeout(() => translationRef.current?.focus(), 0)
  }

  const saveTranslation = () => {
    if (!selection || !draft.trim()) return
    setTranslations((items) => [
      ...items,
      {
        id: crypto.randomUUID(),
        start: selection.start,
        end: selection.end,
        source: selection.text,
        translated: draft.trim(),
      },
    ])
    setSelection(null)
    setDraft('')
    setNotice('訳文を登録しました')
  }

  const updateSource = (next: string) => {
    if (translations.length > 0 && next !== source) {
      setTranslations([])
      setSelection(null)
      setNotice('原文を編集したため、登録済みの訳文をクリアしました')
    }
    setSource(next)
  }

  const clearAll = () => {
    if (!window.confirm('原文とすべての訳文を削除しますか？')) return
    setSource('')
    setTranslations([])
    setSelection(null)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Parallel ホーム">
          <span className="brand-mark">P</span>
          <span>Parallel</span>
        </a>
        <nav className="view-switch" aria-label="表示モード">
          <button className={view === 'edit' ? 'active' : ''} onClick={() => setView('edit')}>
            編集
          </button>
          <button className={view === 'read' ? 'active' : ''} onClick={() => setView('read')}>
            閲覧
          </button>
        </nav>
        <div className="header-meta">
          <span><i className="status-dot" />端末内に保存</span>
          <button className="text-button danger" onClick={clearAll}>すべて消去</button>
        </div>
      </header>

      <main id="top">
        {view === 'edit' ? (
          <section className="workspace" aria-label="翻訳編集">
            <div className="intro">
              <div>
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
                  onChange={(event) => updateSource(event.target.value)}
                  placeholder="翻訳したい英文をここに貼り付けます…"
                  aria-label="翻訳する原文"
                  spellCheck
                />
                <div className="panel-footer">
                  <span>選択範囲は訳文と一対一で登録されます</span>
                  <button className="primary" onClick={captureSelection}>選択範囲を翻訳 <span>→</span></button>
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
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder="訳文を入力します…"
                      aria-label="訳文"
                      onKeyDown={(event) => {
                        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') saveTranslation()
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
                  {selection && <button className="text-button" onClick={() => setSelection(null)}>キャンセル</button>}
                  <button className="primary" disabled={!selection || !draft.trim()} onClick={saveTranslation}>訳文を登録 <span>⌘↵</span></button>
                </div>
              </article>
            </div>

            {sorted.length > 0 && (
              <section className="recent">
                <div className="section-title"><p className="eyebrow">REGISTERED PAIRS</p><h2>登録済みの対訳</h2></div>
                <div className="pair-list">
                  {sorted.map((item, index) => (
                    <article className="pair-card" key={item.id}>
                      <span className="pair-number">{String(index + 1).padStart(2, '0')}</span>
                      <p lang="en">{item.source}</p>
                      <p lang="ja">{item.translated}</p>
                      <button aria-label="この対訳を削除" onClick={() => setTranslations((items) => items.filter((value) => value.id !== item.id))}>×</button>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </section>
        ) : (
          <Reader source={source} translations={sorted} onEdit={() => setView('edit')} />
        )}
      </main>
      <footer><span>PARALLEL TRANSLATION ASSIST</span><span>Private workspace · Data stays in this browser</span></footer>
      {notice && <div className="toast" role="status">{notice}</div>}
    </div>
  )
}

function Reader({ source, translations, onEdit }: { source: string; translations: Translation[]; onEdit: () => void }) {
  if (translations.length === 0) {
    return (
      <section className="reader empty-reader">
        <p className="eyebrow">PARALLEL READING</p>
        <h1>まだ対訳がありません。</h1>
        <p>原文を選択し、最初の訳文を登録すると、ここに並んで表示されます。</p>
        <button className="primary" onClick={onEdit}>編集へ戻る →</button>
      </section>
    )
  }

  const rows: Array<{ id: string; source: string; translated: string; translatedRow: boolean }> = []
  let cursor = 0
  translations.forEach((item) => {
    const before = source.slice(cursor, item.start).trim()
    if (before) rows.push({ id: `gap-${item.id}`, source: before, translated: '—', translatedRow: false })
    rows.push({ id: item.id, source: item.source, translated: item.translated, translatedRow: true })
    cursor = item.end
  })
  const after = source.slice(cursor).trim()
  if (after) rows.push({ id: 'gap-last', source: after, translated: '—', translatedRow: false })

  return (
    <section className="reader">
      <div className="reader-heading">
        <div><p className="eyebrow">PARALLEL READING</p><h1>原文と訳文</h1></div>
        <p>{translations.length} 件の訳文 · 未訳部分も原文の流れに沿って表示</p>
      </div>
      <div className="reader-table">
        <div className="reader-label"><span>ORIGINAL · EN</span><span>TRANSLATION · JA</span></div>
        {rows.map((row, index) => (
          <article className={row.translatedRow ? 'reader-row' : 'reader-row untranslated'} key={row.id}>
            <span className="row-number">{String(index + 1).padStart(2, '0')}</span>
            <p lang="en">{row.source}</p>
            <p lang="ja">{row.translated}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

export default App
