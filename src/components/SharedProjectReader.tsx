import { Reader } from './Reader'
import type { Project } from '../types'

type Props = { project: Project; onAdd: () => void; onClose: () => void }

export function SharedProjectReader({ project, onAdd, onClose }: Props) {
  return (
    <div className="shared-reader">
      <aside className="shared-reader-banner" aria-label="一時閲覧">
        <span>閲覧のみ · このプロジェクトは保存されていません</span>
        <span>{project.keywords.length.toLocaleString()} 件の訳語キーワード</span>
        <button className="text-button" onClick={onClose}>閉じる</button>
        <button className="primary" onClick={onAdd}>プロジェクトに追加</button>
      </aside>
      <Reader {...project} onEdit={() => undefined} />
    </div>
  )
}
