import { useRef, useState } from 'react'
import { useOutsideClick } from '../hooks/useOutsideClick'

export type TransferActions = {
  importSource: (contents: string) => void
  importProject: (contents: string) => void
  exportProject: () => void
  exportTranslations: () => void
  exportParallelText: () => void
}

type Props = {
  actions: TransferActions
  disabled: boolean
  onShare: () => void
}

export function ProjectTransferControls({ actions, disabled, onShare }: Props) {
  const [openMenu, setOpenMenu] = useState<'import' | 'export' | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const sourceInputRef = useRef<HTMLInputElement>(null)
  const projectInputRef = useRef<HTMLInputElement>(null)
  useOutsideClick(containerRef, () => setOpenMenu(null), openMenu !== null)

  const readFile = async (file: File | undefined, action: (contents: string) => void) => {
    if (!file) return
    action((await file.text()).replace(/^\uFEFF/, ''))
    setOpenMenu(null)
  }

  const runExport = (action: () => void) => {
    action()
    setOpenMenu(null)
  }

  return (
    <div className="transfer-controls" ref={containerRef}>
      <button className="header-action" disabled={disabled} onClick={onShare}>共有</button>
      <div className="transfer-menu">
        <button className="header-action" disabled={disabled} aria-expanded={openMenu === 'import'} onClick={() => setOpenMenu((menu) => menu === 'import' ? null : 'import')}>インポート</button>
        {openMenu === 'import' && (
          <div className="transfer-popover" role="menu" aria-label="インポートメニュー">
            <button role="menuitem" onClick={() => projectInputRef.current?.click()}>プロジェクトをインポート</button>
            <button role="menuitem" onClick={() => sourceInputRef.current?.click()}>原文をインポート</button>
          </div>
        )}
      </div>
      <div className="transfer-menu">
        <button className="header-action" disabled={disabled} aria-expanded={openMenu === 'export'} onClick={() => setOpenMenu((menu) => menu === 'export' ? null : 'export')}>エクスポート</button>
        {openMenu === 'export' && (
          <div className="transfer-popover export-popover" role="menu" aria-label="エクスポートメニュー">
            <button role="menuitem" onClick={() => runExport(actions.exportProject)}>プロジェクトをエクスポート</button>
            <button role="menuitem" onClick={() => runExport(actions.exportTranslations)}>訳文をエクスポート</button>
            <button role="menuitem" onClick={() => runExport(actions.exportParallelText)}>対訳をテキストでエクスポート</button>
          </div>
        )}
      </div>
      <input
        ref={sourceInputRef}
        data-testid="source-file-input"
        className="visually-hidden"
        type="file"
        accept=".txt,.md,text/plain,text/markdown"
        onChange={(event) => { void readFile(event.target.files?.[0], actions.importSource); event.target.value = '' }}
      />
      <input
        ref={projectInputRef}
        data-testid="project-file-input"
        className="visually-hidden"
        type="file"
        accept=".json,application/json"
        onChange={(event) => { void readFile(event.target.files?.[0], actions.importProject); event.target.value = '' }}
      />
    </div>
  )
}
