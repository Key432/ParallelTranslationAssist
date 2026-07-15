import type { ViewMode } from '../types'

type Props = {
  view: ViewMode
  hasActiveProject: boolean
  sidebarOpen: boolean
  onToggleSidebar: () => void
  onViewChange: (view: ViewMode) => void
  onClear: () => void
}

export function AppHeader({ view, hasActiveProject, sidebarOpen, onToggleSidebar, onViewChange, onClear }: Props) {
  return (
    <header className="topbar">
      <div className="brand-area">
        <button
          className="sidebar-toggle"
          data-sidebar-toggle
          onClick={onToggleSidebar}
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
        <button className={view === 'edit' ? 'active' : ''} disabled={!hasActiveProject} onClick={() => onViewChange('edit')}>編集</button>
        <button className={view === 'read' ? 'active' : ''} disabled={!hasActiveProject} onClick={() => onViewChange('read')}>閲覧</button>
      </nav>
      <div className="header-meta">
        <span><i className="status-dot" />端末内に保存</span>
        {hasActiveProject && <button className="text-button danger" onClick={onClear}>この内容を消去</button>}
      </div>
    </header>
  )
}
