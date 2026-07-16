import { useEffect, useMemo, useRef } from 'react'
import { calculateProjectStatistics } from '../domain/statistics'
import type { Project } from '../types'

type Props = {
  project: Project
  onClose: () => void
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '記録なし'
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function ProjectStatisticsModal({ project, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const statistics = useMemo(() => calculateProjectStatistics(project), [project])
  const percentage = Math.min(100, Math.max(0, statistics.translatedPercentage))

  useEffect(() => {
    closeRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}>
      <section className="statistics-modal" role="dialog" aria-modal="true" aria-labelledby="statistics-dialog-title">
        <header className="statistics-heading">
          <div>
            <p className="eyebrow">PROJECT STATISTICS</p>
            <h2 id="statistics-dialog-title">統計</h2>
          </div>
          <button ref={closeRef} className="statistics-close" onClick={onClose} aria-label="統計を閉じる">×</button>
        </header>

        <div className="statistics-overview">
          <div className="statistics-ring" aria-label={`翻訳済み ${percentage}%`}>
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle className="ring-track" cx="60" cy="60" r="52" pathLength="100" />
              <circle className="ring-value" cx="60" cy="60" r="52" pathLength="100" strokeDasharray={`${percentage} ${100 - percentage}`} />
            </svg>
            <div><strong>{percentage.toLocaleString()}<small>%</small></strong><span>翻訳済み</span></div>
          </div>
          <div className="word-progress">
            <div><span>原文の単語</span><strong>{statistics.sourceWordCount.toLocaleString()} 語</strong></div>
            <div className="progress-track" aria-hidden="true"><span style={{ width: `${percentage}%` }} /></div>
            <div className="progress-legend">
              <span><i className="translated-dot" />翻訳済み {statistics.translatedWordCount.toLocaleString()}語</span>
              <span><i />未翻訳 {statistics.untranslatedWordCount.toLocaleString()}語</span>
            </div>
          </div>
        </div>

        <dl className="statistics-grid">
          <div><dt>原文文字数</dt><dd>{statistics.sourceCharacterCount.toLocaleString()}<small> 字</small></dd></div>
          <div><dt>対訳件数</dt><dd>{statistics.translationCount.toLocaleString()}<small> 件</small></dd></div>
          <div><dt>翻訳済み単語数</dt><dd>{statistics.translatedWordCount.toLocaleString()}<small> 語</small></dd></div>
          <div><dt>未翻訳単語数</dt><dd>{statistics.untranslatedWordCount.toLocaleString()}<small> 語</small></dd></div>
          <div className="wide"><dt>訳文合計文字数</dt><dd>{statistics.translatedTextCharacterCount.toLocaleString()}<small> 字</small></dd></div>
        </dl>

        <footer className="statistics-updated">
          <span>最終更新</span>
          <time dateTime={project.updatedAt}>{formatUpdatedAt(project.updatedAt)}</time>
        </footer>
      </section>
    </div>
  )
}
