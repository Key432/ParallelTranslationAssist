import { useState } from 'react'
import type { Project } from '../types'

type Props = {
  projects: Project[]
  activeProjectId: string | null
  creating: boolean
  onCreatingChange: (creating: boolean) => void
  onSelect: (id: string) => void
  onAdd: (title: string) => void
  onRename: (id: string, title: string) => void
  onDelete: (project: Project) => void
}

export function ProjectSidebar({ projects, activeProjectId, creating, onCreatingChange, onSelect, onAdd, onRename, onDelete }: Props) {
  const [newTitle, setNewTitle] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  const submitProject = () => {
    const title = newTitle.trim()
    if (!title) return
    onAdd(title)
    setNewTitle('')
  }

  const submitRename = () => {
    const title = editingTitle.trim()
    if (!editingId || !title) return
    onRename(editingId, title)
    setEditingId(null)
    setEditingTitle('')
  }

  return (
    <aside className="project-sidebar" aria-label="プロジェクト管理">
      <div className="sidebar-heading">
        <div><p className="eyebrow">YOUR WORKSPACE</p><h2>プロジェクト</h2></div>
        <button className="add-project" onClick={() => onCreatingChange(true)} aria-label="新しいプロジェクトを作成">＋</button>
      </div>

      {creating && (
        <form className="project-form" onSubmit={(event) => { event.preventDefault(); submitProject() }}>
          <label htmlFor="new-project-title">新しいプロジェクト名</label>
          <input id="new-project-title" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="タイトルを入力" autoFocus maxLength={80} />
          <div>
            <button type="button" onClick={() => { onCreatingChange(false); setNewTitle('') }}>キャンセル</button>
            <button type="submit" disabled={!newTitle.trim()}>作成</button>
          </div>
        </form>
      )}

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
                  <span className="project-title">{project.title}</span>
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
      <p className="sidebar-note">すべての内容は、このブラウザにのみ保存されます。</p>
    </aside>
  )
}
