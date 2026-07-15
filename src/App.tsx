import { useEffect, useMemo, useRef, useState } from 'react'

type Translation = {
  id: string
  start: number
  end: number
  source: string
  translated: string
}

type Project = {
  id: string
  title: string
  source: string
  translations: Translation[]
}

type WorkspaceState = {
  projects: Project[]
  activeProjectId: string | null
}

type LegacyState = {
  source: string
  translations: Translation[]
}

type Selection = { start: number; end: number; text: string }

const STORAGE_KEY = 'parallel-translation-assist:v2'
const LEGACY_STORAGE_KEY = 'parallel-translation-assist:v1'
const SAMPLE = `Translation is not a matter of words only: it is a matter of making intelligible a whole culture. The translator must cross borders of language while preserving the rhythm, ambiguity, and texture of the original.

Read the source closely. Select a sentence, a group of sentences, or an entire paragraph, then add your translation. Each pair will appear side by side in the reading view.`

function createProject(title: string, source = ''): Project {
  return { id: crypto.randomUUID(), title, source, translations: [] }
}

function isProject(value: unknown): value is Project {
  if (!value || typeof value !== 'object') return false
  const project = value as Partial<Project>
  return typeof project.id === 'string'
    && typeof project.title === 'string'
    && typeof project.source === 'string'
    && Array.isArray(project.translations)
}

function loadState(): WorkspaceState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<WorkspaceState>
      const projects = Array.isArray(parsed.projects) ? parsed.projects.filter(isProject) : []
      const activeProjectId = projects.some((project) => project.id === parsed.activeProjectId)
        ? parsed.activeProjectId as string
        : projects[0]?.id ?? null
      return { projects, activeProjectId }
    }

    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (legacy) {
      const parsed = JSON.parse(legacy) as LegacyState
      const project = createProject('マイプロジェクト', parsed.source ?? '')
      project.translations = Array.isArray(parsed.translations) ? parsed.translations : []
      return { projects: [project], activeProjectId: project.id }
    }
  } catch {
    // Ignore an unavailable or malformed local store.
  }

  const project = createProject('はじめてのプロジェクト', SAMPLE)
  return { projects: [project], activeProjectId: project.id }
}

function App() {
  const initial = useMemo(loadState, [])
  const [projects, setProjects] = useState(initial.projects)
  const [activeProjectId, setActiveProjectId] = useState<string | null>(initial.activeProjectId)
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 800)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [draft, setDraft] = useState('')
  const [view, setView] = useState<'edit' | 'read'>('edit')
  const [notice, setNotice] = useState('')
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const sourceRef = useRef<HTMLTextAreaElement>(null)
  const translationRef = useRef<HTMLTextAreaElement>(null)

  const activeProject = projects.find((project) => project.id === activeProjectId) ?? null
  const source = activeProject?.source ?? ''
  const translations = activeProject?.translations ?? []

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ projects, activeProjectId }))
  }, [projects, activeProjectId])

  useEffect(() => {
    setSelection(null)
    setDraft('')
  }, [activeProjectId])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 2400)
    return () => window.clearTimeout(timer)
  }, [notice])

  const sorted = useMemo(
    () => [...translations].sort((a, b) => a.start - b.start),
    [translations],
  )

  const updateActiveProject = (update: (project: Project) => Project) => {
    if (!activeProjectId) return
    setProjects((items) => items.map((project) => project.id === activeProjectId ? update(project) : project))
  }

  const selectProject = (id: string) => {
    setActiveProjectId(id)
    setView('edit')
    if (window.innerWidth <= 800) setSidebarOpen(false)
  }

  const addProject = () => {
    const title = newTitle.trim()
    if (!title) return
    const project = createProject(title)
    setProjects((items) => [...items, project])
    setActiveProjectId(project.id)
    setNewTitle('')
    setCreating(false)
    setView('edit')
    setNotice('プロジェクトを作成しました')
  }

  const startRename = (project: Project) => {
    setEditingId(project.id)
    setEditingTitle(project.title)
  }

  const renameProject = () => {
    const title = editingTitle.trim()
    if (!editingId || !title) return
    setProjects((items) => items.map((project) => project.id === editingId ? { ...project, title } : project))
    setEditingId(null)
    setEditingTitle('')
    setNotice('タイトルを更新しました')
  }

  const deleteProject = (project: Project) => {
    if (!window.confirm(`「${project.title}」を削除しますか？\n原文と訳文もすべて削除されます。`)) return
    const remaining = projects.filter((item) => item.id !== project.id)
    setProjects(remaining)
    if (activeProjectId === project.id) setActiveProjectId(remaining[0]?.id ?? null)
    if (editingId === project.id) setEditingId(null)
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
    updateActiveProject((project) => ({
      ...project,
      translations: [
        ...project.translations,
        {
          id: crypto.randomUUID(),
          start: selection.start,
          end: selection.end,
          source: selection.text,
          translated: draft.trim(),
        },
      ],
    }))
    setSelection(null)
    setDraft('')
    setNotice('訳文を登録しました')
  }

  const updateSource = (next: string) => {
    const shouldClear = translations.length > 0 && next !== source
    updateActiveProject((project) => ({ ...project, source: next, translations: shouldClear ? [] : project.translations }))
    if (shouldClear) {
      setSelection(null)
      setNotice('原文を編集したため、登録済みの訳文をクリアしました')
    }
  }

  const clearAll = () => {
    if (!activeProject || !window.confirm('このプロジェクトの原文とすべての訳文を削除しますか？')) return
    updateActiveProject((project) => ({ ...project, source: '', translations: [] }))
    setSelection(null)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-area">
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label={sidebarOpen ? 'プロジェクト一覧を閉じる' : 'プロジェクト一覧を開く'}
            aria-expanded={sidebarOpen}
          >
            <span /><span /><span />
          </button>
          <a className="brand" href="#top" aria-label="Parallel ホーム">
            <span className="brand-mark">P</span>
            <span>Parallel</span>
          </a>
        </div>
        <nav className="view-switch" aria-label="表示モード">
          <button className={view === 'edit' ? 'active' : ''} disabled={!activeProject} onClick={() => setView('edit')}>
            編集
          </button>
          <button className={view === 'read' ? 'active' : ''} disabled={!activeProject} onClick={() => setView('read')}>
            閲覧
          </button>
        </nav>
        <div className="header-meta">
          <span><i className="status-dot" />端末内に保存</span>
          {activeProject && <button className="text-button danger" onClick={clearAll}>この内容を消去</button>}
        </div>
      </header>

      <div className="app-body">
        {sidebarOpen && (
          <aside className="project-sidebar" aria-label="プロジェクト管理">
            <div className="sidebar-heading">
              <div>
                <p className="eyebrow">YOUR WORKSPACE</p>
                <h2>プロジェクト</h2>
              </div>
              <button className="add-project" onClick={() => setCreating(true)} aria-label="新しいプロジェクトを作成">＋</button>
            </div>

            {creating && (
              <form className="project-form" onSubmit={(event) => { event.preventDefault(); addProject() }}>
                <label htmlFor="new-project-title">新しいプロジェクト名</label>
                <input
                  id="new-project-title"
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.target.value)}
                  placeholder="タイトルを入力"
                  autoFocus
                  maxLength={80}
                />
                <div><button type="button" onClick={() => { setCreating(false); setNewTitle('') }}>キャンセル</button><button type="submit" disabled={!newTitle.trim()}>作成</button></div>
              </form>
            )}

            <div className="project-list">
              {projects.map((project) => (
                <article className={`project-item ${project.id === activeProjectId ? 'active' : ''}`} key={project.id}>
                  {editingId === project.id ? (
                    <form className="rename-form" onSubmit={(event) => { event.preventDefault(); renameProject() }}>
                      <input
                        value={editingTitle}
                        onChange={(event) => setEditingTitle(event.target.value)}
                        aria-label="プロジェクトタイトル"
                        autoFocus
                        maxLength={80}
                        onKeyDown={(event) => { if (event.key === 'Escape') setEditingId(null) }}
                      />
                      <button type="submit" disabled={!editingTitle.trim()} aria-label="タイトルを保存">✓</button>
                    </form>
                  ) : (
                    <>
                      <button className="project-select" onClick={() => selectProject(project.id)}>
                        <span className="project-title">{project.title}</span>
                        <span className="project-meta">{project.source.length.toLocaleString()} 字 · {project.translations.length} 訳</span>
                      </button>
                      <div className="project-actions">
                        <button onClick={() => startRename(project)} aria-label={`「${project.title}」のタイトルを編集`}>✎</button>
                        <button onClick={() => deleteProject(project)} aria-label={`「${project.title}」を削除`}>×</button>
                      </div>
                    </>
                  )}
                </article>
              ))}
              {projects.length === 0 && <p className="no-projects">プロジェクトがありません。<br />＋ボタンから作成できます。</p>}
            </div>
            <p className="sidebar-note">すべての内容は、このブラウザにのみ保存されます。</p>
          </aside>
        )}

        <main id="top">
          {!activeProject ? (
            <section className="empty-projects">
              <span className="selection-icon">P</span>
              <p className="eyebrow">START A PROJECT</p>
              <h1>翻訳プロジェクトを<br />作成しましょう。</h1>
              <p>プロジェクトごとに原文と訳文を分けて保存できます。</p>
              <button className="primary" onClick={() => { setSidebarOpen(true); setCreating(true) }}>新しいプロジェクト <span>＋</span></button>
            </section>
          ) : view === 'edit' ? (
            <section className="workspace" aria-label="翻訳編集">
              <div className="intro">
                <div>
                  <p className="project-kicker">{activeProject.title}</p>
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
                        <button aria-label="この対訳を削除" onClick={() => updateActiveProject((project) => ({ ...project, translations: project.translations.filter((value) => value.id !== item.id) }))}>×</button>
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </section>
          ) : (
            <Reader title={activeProject.title} source={source} translations={sorted} onEdit={() => setView('edit')} />
          )}
        </main>
      </div>
      <footer><span>PARALLEL TRANSLATION ASSIST</span><span>Private workspace · Data stays in this browser</span></footer>
      {notice && <div className="toast" role="status">{notice}</div>}
    </div>
  )
}

function Reader({ title, source, translations, onEdit }: { title: string; source: string; translations: Translation[]; onEdit: () => void }) {
  if (translations.length === 0) {
    return (
      <section className="reader empty-reader">
        <p className="project-kicker">{title}</p>
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
        <div><p className="project-kicker">{title}</p><p className="eyebrow">PARALLEL READING</p><h1>原文と訳文</h1></div>
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
