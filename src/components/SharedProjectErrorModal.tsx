type Props = { unsupported?: boolean; onClose: () => void }

export function SharedProjectErrorModal({ unsupported = false, onClose }: Props) {
  return (
    <div className="modal-backdrop">
      <section className="confirmation-modal" role="alertdialog" aria-modal="true" aria-labelledby="shared-error-title">
        <p className="eyebrow">SHARED PROJECT</p>
        <h2 id="shared-error-title">共有リンクを読み取れませんでした。</h2>
        <p>{unsupported
          ? 'このブラウザでは共有リンクを読み込めません。送信者からプロジェクトファイルを受け取り、「プロジェクトをインポート」を使用してください。'
          : 'リンクが途中で切れているか、対応していない形式です。'}</p>
        <div className="modal-actions"><button className="primary" onClick={onClose}>閉じる</button></div>
      </section>
    </div>
  )
}
