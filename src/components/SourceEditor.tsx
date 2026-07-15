import { useMemo, useRef, type RefObject, type UIEvent } from 'react'
import { buildSourceSegments } from '../domain/translations'
import type { Translation } from '../types'

type Props = {
  source: string
  translations: Translation[]
  sourceRef: RefObject<HTMLTextAreaElement | null>
  onSourceChange: (source: string) => void
}

export function SourceEditor({ source, translations, sourceRef, onSourceChange }: Props) {
  const highlightRef = useRef<HTMLDivElement>(null)
  const segments = useMemo(() => buildSourceSegments(source, translations), [source, translations])

  const syncScroll = (event: UIEvent<HTMLTextAreaElement>) => {
    if (!highlightRef.current) return
    highlightRef.current.scrollTop = event.currentTarget.scrollTop
    highlightRef.current.scrollLeft = event.currentTarget.scrollLeft
  }

  return (
    <div className="source-editor">
      <div className="source-highlight" ref={highlightRef} aria-hidden="true">
        <div className="source-highlight-content">
          {segments.map((segment) => (
            <span className={segment.translated ? 'translated-source' : undefined} key={segment.id}>{segment.text}</span>
          ))}
          {'\n'}
        </div>
      </div>
      <textarea
        ref={sourceRef}
        value={source}
        onChange={(event) => onSourceChange(event.target.value)}
        onScroll={syncScroll}
        placeholder="翻訳したい英文をここに貼り付けます…"
        aria-label="翻訳する原文"
        spellCheck
      />
    </div>
  )
}
