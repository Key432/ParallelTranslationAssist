type Props = { onCreate: () => void }

export function EmptyProjects({ onCreate }: Props) {
  return (
    <section className="empty-projects">
      <span className="selection-icon">P</span>
      <p className="eyebrow">START A PROJECT</p>
      <h1>翻訳プロジェクトを<br />作成しましょう。</h1>
      <p>プロジェクトごとに原文と訳文を分けて保存できます。</p>
      <button className="primary" onClick={onCreate}>新しいプロジェクト <span>＋</span></button>
    </section>
  )
}
