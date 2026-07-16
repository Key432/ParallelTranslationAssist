type Props = {
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}

export function HistoryControls({ canUndo, canRedo, onUndo, onRedo }: Props) {
  return (
    <div className="history-controls" role="group" aria-label="変更履歴">
      <button type="button" disabled={!canUndo} onClick={onUndo} aria-label="変更を元に戻す">戻す</button>
      <button type="button" disabled={!canRedo} onClick={onRedo} aria-label="変更をやり直す">進む</button>
    </div>
  )
}
