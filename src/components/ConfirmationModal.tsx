import { useEffect, useRef } from 'react'

type Props = {
  count?: number
  title?: string
  description?: string
  onCancel: () => void
  onConfirm: () => void
  onKeep?: () => void
  confirmLabel?: string
  keepLabel?: string
}

export function ConfirmationModal({ count = 1, title, description, onCancel, onConfirm, onKeep, confirmLabel = '破棄して続ける', keepLabel = '訳文を保持' }: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    confirmRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onCancel() }}>
      <section className="confirmation-modal" role="alertdialog" aria-modal="true" aria-labelledby="discard-dialog-title" aria-describedby="discard-dialog-description">
        <p className="eyebrow">OVERLAPPING TRANSLATION</p>
        <h2 id="discard-dialog-title">{title ?? '登録済みの対訳を破棄しますか？'}</h2>
        <p id="discard-dialog-description">
          {description ?? `選択範囲は登録済みの対訳${count > 1 ? `${count}件` : ''}と重なっています。続けると、重なっている対訳は削除されます。`}
        </p>
        <div className="modal-actions">
          <button className="text-button" onClick={onCancel}>キャンセル</button>
          <button ref={confirmRef} className="primary danger-action" onClick={onConfirm}>{confirmLabel}</button>
          {onKeep && <button className="primary keep-action" onClick={onKeep}>{keepLabel}</button>}
        </div>
      </section>
    </div>
  )
}
