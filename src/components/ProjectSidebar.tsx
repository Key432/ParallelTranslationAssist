import { useState, type Ref } from 'react'
import type { AiConnectionStatus, Project } from '../types'

type Props = {
  projects: Project[]
  open: boolean
  sidebarRef: Ref<HTMLElement>
  activeProjectId: string | null
  onSelect: (id: string) => void
  onAdd: () => void
  onRename: (id: string, title: string) => void
  onDelete: (project: Project) => void
  aiStatus: AiConnectionStatus
  onOpenAiSettings: () => void
}

export function ProjectSidebar({ projects, open, sidebarRef, activeProjectId, onSelect, onAdd, onRename, onDelete, aiStatus, onOpenAiSettings }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  const submitRename = () => {
    const title = editingTitle.trim()
    if (!editingId || !title) return
    onRename(editingId, title)
    setEditingId(null)
    setEditingTitle('')
  }

  return (
    <aside
      ref={sidebarRef}
      className={`project-sidebar ${open ? 'open' : 'closed'}`}
      aria-label="プロジェクト管理"
      aria-hidden={!open}
      inert={!open}
    >
      <div className="sidebar-heading">
        <div><p className="eyebrow">YOUR WORKSPACE</p><h2>プロジェクト</h2></div>
        <button className="add-project" onClick={onAdd} aria-label="新しいプロジェクトを作成">＋</button>
      </div>

      <div className="project-list">
        {projects.map((project) => (
          <article className={`project-item ${project.id === activeProjectId ? 'active' : ''}`} key={project.id}>
            {editingId === project.id ? (
              <form className="rename-form" onSubmit={(event) => { event.preventDefault(); submitRename() }}>
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
                <button className="project-select" onClick={() => onSelect(project.id)}>
                  <span className="project-title-row">
                    <span className="project-title">{project.title}</span>
                    <span className="project-status" data-status={project.status}>{project.status}</span>
                  </span>
                  <span className="project-meta">{project.source.length.toLocaleString()} 字 · {project.translations.length} 訳</span>
                </button>
                <div className="project-actions">
                  <button onClick={() => { setEditingId(project.id); setEditingTitle(project.title) }} aria-label={`「${project.title}」のタイトルを編集`}>✎</button>
                  <button onClick={() => onDelete(project)} aria-label={`「${project.title}」を削除`}>×</button>
                </div>
              </>
            )}
          </article>
        ))}
        {projects.length === 0 && <p className="no-projects">プロジェクトがありません。<br />＋ボタンから作成できます。</p>}
      </div>
      <div className="sidebar-bottom">
        <button type="button" className="sidebar-ai-settings" onClick={onOpenAiSettings}>
          <span className="sidebar-ai-icon" aria-hidden="true">✦</span>
          <span><strong>AI翻訳支援</strong><small>{aiStatus === 'available' ? '利用可能' : '設定・注意事項'}</small></span>
        </button>
        <p className="sidebar-note">通常のプロジェクトデータは、このブラウザにのみ保存されます。</p>
      </div>
    </aside>
  )
}
